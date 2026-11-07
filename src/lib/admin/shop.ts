/**
 * Tienda en el panel (RF-05, RF-12): artículos, sus textos, sus precios y
 * las campañas de rebajas.
 *
 * - **Precios con historia.** Una fila de precio que ya empezó no se borra
 *   ni se cambia: se termina. Así el historial de precios coincide con lo
 *   que se cobró, y una rebaja programada se puede quitar antes de empezar.
 * - **Activar un artículo exige el nombre en inglés**, el idioma de
 *   respaldo de la tienda (`shop.ts`).
 * - **Las campañas mueven sus filas.** Si cambian las fechas de una
 *   campaña, las filas de precio que usaban esas fechas y no han terminado
 *   se mueven con ella.
 * - Cada cambio deja su auditoría en la misma transacción, y las acciones
 *   invalidan la caché de la tienda (`updateTag("shop")`).
 *
 * @see RF-05 · RF-12 · M-37
 */
import "server-only";

import { and, asc, count, desc, eq, inArray, like, ne, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";

import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/config/locales";
import {
  campaignTranslations,
  campaigns,
  itemPrices,
  shopCategories,
  shopCategoryTranslations,
  shopItemTranslations,
  shopItems,
} from "@/db/schema";
import { currentPrice } from "@/lib/shop-catalog";

import { recordAudit, type Tx } from "./audit";
import type { CampaignInput, ItemInput, PriceInput } from "./shop-rules";
import { escapeLike } from "./users";

export const ADMIN_ITEMS_PAGE_SIZE = 25;
const isLocaleCode = (code: string): code is Locale =>
  (LOCALES as readonly string[]).includes(code);

export type ShopProblem =
  | "notFound"
  | "changed"
  | "skuTaken"
  | "codeTaken"
  | "english"
  | "unchanged"
  | "started"
  | "notActive"
  | "ended"
  | "campaignRows";
export type ShopResult = { ok: true; id: number } | { ok: false; problem: ShopProblem };

class Rejected extends Error {
  constructor(readonly problem: ShopProblem) {
    super(problem);
  }
}

async function change(run: (tx: Tx) => Promise<number>): Promise<ShopResult> {
  const { db } = await import("@/db/client");
  try {
    return { ok: true, id: await db.transaction(run) };
  } catch (error) {
    if (error instanceof Rejected) return { ok: false, problem: error.problem };
    throw error;
  }
}

const iso = (date: Date | null) => date?.toISOString() ?? null;

// ---------------------------------------------------------------------------
// Categorías y campañas para los selectores
// ---------------------------------------------------------------------------

/** Categorías en orden, con la subcategoría como «Disfraces › Trajes». */
export async function listCategoryOptions(
  locale: Locale,
): Promise<{ id: number; label: string }[]> {
  const { db } = await import("@/db/client");
  const local = alias(shopCategoryTranslations, "local_category");
  const english = alias(shopCategoryTranslations, "english_category");
  const rows = await db
    .select({
      id: shopCategories.id,
      parentId: shopCategories.parentId,
      name: sql<string>`coalesce(${local.name}, ${english.name}, ${shopCategories.slug})`,
    })
    .from(shopCategories)
    .leftJoin(local, and(eq(local.categoryId, shopCategories.id), eq(local.locale, locale)))
    .leftJoin(
      english,
      and(eq(english.categoryId, shopCategories.id), eq(english.locale, DEFAULT_LOCALE)),
    )
    .orderBy(asc(shopCategories.sortOrder), asc(shopCategories.id));
  const byId = new Map(rows.map((row) => [row.id, row]));
  const options: { id: number; label: string }[] = [];
  for (const parent of rows.filter((row) => row.parentId === null)) {
    options.push({ id: parent.id, label: parent.name });
    for (const child of rows.filter((row) => row.parentId === parent.id)) {
      options.push({ id: child.id, label: `${parent.name} › ${child.name}` });
    }
  }
  // Categorías huérfanas (no debería haberlas), al final para no perderlas.
  for (const row of rows) {
    if (!options.some((option) => option.id === row.id) && !byId.get(row.parentId ?? -1)) {
      options.push({ id: row.id, label: row.name });
    }
  }
  return options;
}

export interface AdminCampaign {
  id: number;
  code: string;
  startsAt: Date;
  endsAt: Date;
  name: string;
  names: Partial<Record<Locale, string>>;
  priceRows: number;
}

/** Campañas, de la más reciente a la más antigua, con sus nombres y filas de precio. */
export async function listAdminCampaigns(locale: Locale): Promise<AdminCampaign[]> {
  const { db } = await import("@/db/client");
  const [rows, names, priceCounts] = await Promise.all([
    db.select().from(campaigns).orderBy(desc(campaigns.startsAt), desc(campaigns.id)),
    db.select().from(campaignTranslations),
    db
      .select({ campaignId: itemPrices.campaignId, n: count() })
      .from(itemPrices)
      .where(sql`${itemPrices.campaignId} is not null`)
      .groupBy(itemPrices.campaignId),
  ]);
  return rows.map((row) => {
    const own: Partial<Record<Locale, string>> = {};
    for (const name of names) {
      if (name.campaignId === row.id && isLocaleCode(name.locale)) own[name.locale] = name.name;
    }
    return {
      ...row,
      name: own[locale] ?? own.en ?? row.code,
      names: own,
      priceRows: priceCounts.find((c) => c.campaignId === row.id)?.n ?? 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Artículos
// ---------------------------------------------------------------------------

export interface AdminItemRow {
  id: number;
  sku: string;
  name: string;
  category: string;
  isActive: boolean;
  priceAp: number | null;
  salePriceAp: number | null;
  locales: Locale[];
}

export interface ItemSearch {
  q: string;
  categoryId: number | null;
  active: boolean | null;
  page: number;
}

/** Artículos con su precio vigente ahora, buscando por nombre o SKU. */
export async function listAdminItems(locale: Locale, search: ItemSearch, now: Date) {
  const { db } = await import("@/db/client");
  const local = alias(shopItemTranslations, "local_item");
  const english = alias(shopItemTranslations, "english_item");
  const localCategory = alias(shopCategoryTranslations, "local_category");
  const conditions: SQL[] = [];
  const q = search.q.trim();
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    conditions.push(
      or(like(shopItems.sku, pattern), like(local.name, pattern), like(english.name, pattern))!,
    );
  }
  if (search.categoryId !== null) {
    conditions.push(
      or(
        eq(shopItems.categoryId, search.categoryId),
        sql`${shopItems.categoryId} in (select id from shop_categories where parent_id = ${search.categoryId})`,
      )!,
    );
  }
  if (search.active !== null) conditions.push(eq(shopItems.isActive, search.active ? 1 : 0));
  const where = conditions.length ? and(...conditions) : undefined;

  const base = () =>
    db
      .select({
        id: shopItems.id,
        sku: shopItems.sku,
        name: sql<string>`coalesce(${local.name}, ${english.name}, ${shopItems.sku})`,
        category: sql<string>`coalesce(${localCategory.name}, ${shopCategories.slug})`,
        isActive: shopItems.isActive,
        locales: sql<
          string | null
        >`(select group_concat(${shopItemTranslations.locale}) from ${shopItemTranslations} where ${shopItemTranslations.itemId} = ${shopItems.id})`,
      })
      .from(shopItems)
      .leftJoin(local, and(eq(local.itemId, shopItems.id), eq(local.locale, locale)))
      .leftJoin(english, and(eq(english.itemId, shopItems.id), eq(english.locale, DEFAULT_LOCALE)))
      .innerJoin(shopCategories, eq(shopCategories.id, shopItems.categoryId))
      .leftJoin(
        localCategory,
        and(eq(localCategory.categoryId, shopCategories.id), eq(localCategory.locale, locale)),
      );

  const [[totalRow], rows] = await Promise.all([
    db
      .select({ total: count() })
      .from(shopItems)
      .leftJoin(local, and(eq(local.itemId, shopItems.id), eq(local.locale, locale)))
      .leftJoin(english, and(eq(english.itemId, shopItems.id), eq(english.locale, DEFAULT_LOCALE)))
      .where(where),
    base()
      .where(where)
      .orderBy(desc(shopItems.id))
      .limit(ADMIN_ITEMS_PAGE_SIZE)
      .offset((search.page - 1) * ADMIN_ITEMS_PAGE_SIZE),
  ]);
  const ids = rows.map((row) => row.id);
  const prices = ids.length
    ? await db.select().from(itemPrices).where(inArray(itemPrices.itemId, ids))
    : [];
  const total = totalRow?.total ?? 0;
  return {
    rows: rows.map((row): AdminItemRow => {
      const price = currentPrice(
        prices.filter((p) => p.itemId === row.id),
        now,
      );
      return {
        id: row.id,
        sku: row.sku,
        name: row.name,
        category: row.category,
        isActive: row.isActive === 1,
        priceAp: price?.priceAp ?? null,
        salePriceAp: price?.salePriceAp ?? null,
        locales: (row.locales ?? "").split(",").filter(isLocaleCode),
      };
    }),
    total,
    page: search.page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_ITEMS_PAGE_SIZE)),
  };
}

export interface AdminPriceRow {
  id: number;
  priceAp: number;
  salePriceAp: number | null;
  campaignId: number | null;
  campaign: string | null;
  startsAt: Date;
  endsAt: Date | null;
}

export interface AdminItem extends ItemInput {
  id: number;
  updatedAt: Date;
  translations: Partial<Record<Locale, { name: string; description: string }>>;
  prices: AdminPriceRow[];
}

/** Un artículo con sus textos y todas sus filas de precio (las más nuevas primero). */
export async function getAdminItem(id: number): Promise<AdminItem | null> {
  const { db } = await import("@/db/client");
  const [item] = await db.select().from(shopItems).where(eq(shopItems.id, id));
  if (!item) return null;
  const [texts, prices] = await Promise.all([
    db.select().from(shopItemTranslations).where(eq(shopItemTranslations.itemId, id)),
    db
      .select({
        id: itemPrices.id,
        priceAp: itemPrices.priceAp,
        salePriceAp: itemPrices.salePriceAp,
        campaignId: itemPrices.campaignId,
        campaign: campaigns.code,
        startsAt: itemPrices.startsAt,
        endsAt: itemPrices.endsAt,
      })
      .from(itemPrices)
      .leftJoin(campaigns, eq(campaigns.id, itemPrices.campaignId))
      .where(eq(itemPrices.itemId, id))
      .orderBy(desc(itemPrices.startsAt), desc(itemPrices.id)),
  ]);
  const translations: AdminItem["translations"] = {};
  for (const row of texts) {
    if (isLocaleCode(row.locale))
      translations[row.locale] = { name: row.name, description: row.description };
  }
  return {
    id: item.id,
    sku: item.sku,
    categoryId: item.categoryId,
    validityDays: item.validityDays,
    isBundle: item.isBundle === 1,
    isLimited: item.isLimited === 1,
    isGiftable: item.isGiftable === 1,
    isActive: item.isActive === 1,
    sortOrder: item.sortOrder,
    updatedAt: item.updatedAt,
    translations,
    prices,
  };
}

async function lockItem(tx: Tx, id: number, version: number | null) {
  const [row] = await tx.select().from(shopItems).where(eq(shopItems.id, id)).for("update");
  if (!row) throw new Rejected("notFound");
  if (version !== null && row.updatedAt.getTime() !== version) throw new Rejected("changed");
  return row;
}

async function hasEnglishName(tx: Tx, itemId: number) {
  const [row] = await tx
    .select({ n: count() })
    .from(shopItemTranslations)
    .where(
      and(eq(shopItemTranslations.itemId, itemId), eq(shopItemTranslations.locale, DEFAULT_LOCALE)),
    );
  return (row?.n ?? 0) > 0;
}

const toRow = (input: ItemInput) => ({
  sku: input.sku,
  categoryId: input.categoryId,
  validityDays: input.validityDays,
  isBundle: input.isBundle ? 1 : 0,
  isLimited: input.isLimited ? 1 : 0,
  isGiftable: input.isGiftable ? 1 : 0,
  isActive: input.isActive ? 1 : 0,
  sortOrder: input.sortOrder,
});

/** Crea (inactivo) o actualiza un artículo. */
export async function saveItem(request: {
  actorId: number;
  id: number | null;
  input: ItemInput;
  version: number | null;
  ip: string | null;
}): Promise<ShopResult> {
  const { actorId, id, input, version, ip } = request;
  return change(async (tx) => {
    const [taken] = await tx
      .select({ n: count() })
      .from(shopItems)
      .where(
        id === null
          ? eq(shopItems.sku, input.sku)
          : and(eq(shopItems.sku, input.sku), ne(shopItems.id, id)),
      );
    if ((taken?.n ?? 0) > 0) throw new Rejected("skuTaken");
    const now = new Date();

    if (id === null) {
      // Nace inactivo: sin nombre ni precio no se puede vender.
      const [row] = await tx
        .insert(shopItems)
        .values({ ...toRow(input), isActive: 0, createdAt: now, updatedAt: now });
      await recordAudit(tx, {
        actorId,
        action: "item.create",
        entity: "item",
        entityId: row.insertId,
        diff: { sku: input.sku, categoryId: input.categoryId },
        ip,
      });
      return row.insertId;
    }

    const current = await lockItem(tx, id, version);
    if (input.isActive && !(await hasEnglishName(tx, id))) throw new Rejected("english");
    const next = toRow(input);
    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const [field, value] of Object.entries(next)) {
      const before = current[field as keyof typeof next];
      if (before !== value) diff[field] = { from: before, to: value };
    }
    if (Object.keys(diff).length === 0) throw new Rejected("unchanged");
    await tx
      .update(shopItems)
      .set({ ...next, updatedAt: now })
      .where(eq(shopItems.id, id));
    await recordAudit(tx, {
      actorId,
      action: "item.update",
      entity: "item",
      entityId: id,
      diff,
      ip,
    });
    return id;
  });
}

/** Crea o reescribe el nombre y la descripción de un artículo en un idioma. */
export async function saveItemTranslation(request: {
  actorId: number;
  itemId: number;
  locale: Locale;
  name: string;
  description: string;
  version: number | null;
  ip: string | null;
}): Promise<ShopResult> {
  const { actorId, itemId, locale, name, description, version, ip } = request;
  return change(async (tx) => {
    await lockItem(tx, itemId, version);
    const where = and(
      eq(shopItemTranslations.itemId, itemId),
      eq(shopItemTranslations.locale, locale),
    );
    const [current] = await tx.select().from(shopItemTranslations).where(where);
    if (current && current.name === name && current.description === description) {
      throw new Rejected("unchanged");
    }
    if (current) await tx.update(shopItemTranslations).set({ name, description }).where(where);
    else await tx.insert(shopItemTranslations).values({ itemId, locale, name, description });
    await tx.update(shopItems).set({ updatedAt: new Date() }).where(eq(shopItems.id, itemId));
    await recordAudit(tx, {
      actorId,
      action: "item.translation",
      entity: "item",
      entityId: itemId,
      diff: {
        locale,
        ...(current?.name !== name ? { name: { from: current?.name ?? null, to: name } } : {}),
        ...(current?.description !== description ? { description: "changed" } : {}),
      },
      ip,
    });
    return itemId;
  });
}

/** Añade una fila de precio (ya validada con `parsePrice`). */
export async function addPrice(request: {
  actorId: number;
  itemId: number;
  input: PriceInput;
  ip: string | null;
}): Promise<ShopResult> {
  const { actorId, itemId, input, ip } = request;
  return change(async (tx) => {
    await lockItem(tx, itemId, null);
    const [row] = await tx.insert(itemPrices).values({ itemId, ...input });
    await tx.update(shopItems).set({ updatedAt: new Date() }).where(eq(shopItems.id, itemId));
    await recordAudit(tx, {
      actorId,
      action: "item.priceAdd",
      entity: "item",
      entityId: itemId,
      diff: {
        priceId: row.insertId,
        priceAp: input.priceAp,
        salePriceAp: input.salePriceAp,
        campaignId: input.campaignId,
        startsAt: iso(input.startsAt),
        endsAt: iso(input.endsAt),
      },
      ip,
    });
    return itemId;
  });
}

/**
 * Termina ahora una fila de precio activa, o borra una que aún no ha
 * empezado. Una fila que ya terminó no se toca.
 */
export async function endOrDeletePrice(request: {
  actorId: number;
  itemId: number;
  priceId: number;
  ip: string | null;
  now?: Date;
}): Promise<ShopResult> {
  const { actorId, itemId, priceId, ip, now = new Date() } = request;
  return change(async (tx) => {
    await lockItem(tx, itemId, null);
    const [row] = await tx
      .select()
      .from(itemPrices)
      .where(and(eq(itemPrices.id, priceId), eq(itemPrices.itemId, itemId)));
    if (!row) throw new Rejected("notFound");
    const before = {
      priceAp: row.priceAp,
      salePriceAp: row.salePriceAp,
      startsAt: iso(row.startsAt),
      endsAt: iso(row.endsAt),
    };
    if (row.startsAt > now) {
      await tx.delete(itemPrices).where(eq(itemPrices.id, priceId));
      await recordAudit(tx, {
        actorId,
        action: "item.priceDelete",
        entity: "item",
        entityId: itemId,
        diff: { priceId, ...before },
        ip,
      });
    } else if (row.endsAt === null || row.endsAt > now) {
      await tx.update(itemPrices).set({ endsAt: now }).where(eq(itemPrices.id, priceId));
      await recordAudit(tx, {
        actorId,
        action: "item.priceEnd",
        entity: "item",
        entityId: itemId,
        diff: { priceId, endsAt: { from: before.endsAt, to: iso(now) } },
        ip,
      });
    } else {
      throw new Rejected("notActive");
    }
    await tx.update(shopItems).set({ updatedAt: new Date() }).where(eq(shopItems.id, itemId));
    return itemId;
  });
}

// ---------------------------------------------------------------------------
// Campañas
// ---------------------------------------------------------------------------

/**
 * Crea o actualiza una campaña y sus nombres. Si cambian sus fechas, las
 * filas de precio que usaban las anteriores y no han terminado se mueven:
 * el fin, si coincidía con el de la campaña; el inicio, si coincidía y aún
 * no ha llegado. El pasado no se reescribe: una campaña terminada no cambia
 * de fechas.
 */
export async function saveCampaign(request: {
  actorId: number;
  id: number | null;
  input: CampaignInput;
  names: Partial<Record<Locale, string>>;
  ip: string | null;
  now?: Date;
}): Promise<ShopResult> {
  const { actorId, id, input, names, ip, now = new Date() } = request;
  return change(async (tx) => {
    if (!names.en) throw new Rejected("english");
    const [taken] = await tx
      .select({ n: count() })
      .from(campaigns)
      .where(
        id === null
          ? eq(campaigns.code, input.code)
          : and(eq(campaigns.code, input.code), ne(campaigns.id, id)),
      );
    if ((taken?.n ?? 0) > 0) throw new Rejected("codeTaken");

    let campaignId = id;
    const diff: Record<string, unknown> = {};
    if (campaignId === null) {
      const [row] = await tx.insert(campaigns).values(input);
      campaignId = row.insertId;
      Object.assign(diff, {
        code: input.code,
        startsAt: iso(input.startsAt),
        endsAt: iso(input.endsAt),
      });
    } else {
      const [current] = await tx
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .for("update");
      if (!current) throw new Rejected("notFound");
      const datesChanged =
        current.startsAt.getTime() !== input.startsAt.getTime() ||
        current.endsAt.getTime() !== input.endsAt.getTime();
      if (datesChanged && current.endsAt <= now) throw new Rejected("ended");
      if (current.code !== input.code) diff.code = { from: current.code, to: input.code };
      if (datesChanged) {
        diff.startsAt = { from: iso(current.startsAt), to: iso(input.startsAt) };
        diff.endsAt = { from: iso(current.endsAt), to: iso(input.endsAt) };
        // Mover las filas de precio que seguían las fechas de la campaña.
        const rows = await tx
          .select()
          .from(itemPrices)
          .where(eq(itemPrices.campaignId, campaignId));
        let moved = 0;
        for (const row of rows) {
          if (row.endsAt !== null && row.endsAt <= now) continue;
          const start =
            row.startsAt > now && row.startsAt.getTime() === current.startsAt.getTime()
              ? new Date(Math.max(input.startsAt.getTime(), now.getTime()))
              : row.startsAt;
          const end =
            row.endsAt?.getTime() === current.endsAt.getTime() ? input.endsAt : row.endsAt;
          if (end !== null && end <= start) throw new Rejected("campaignRows");
          if (start !== row.startsAt || end !== row.endsAt) {
            await tx
              .update(itemPrices)
              .set({ startsAt: start, endsAt: end })
              .where(eq(itemPrices.id, row.id));
            moved++;
          }
        }
        if (moved) diff.movedPriceRows = moved;
      }
      await tx.update(campaigns).set(input).where(eq(campaigns.id, campaignId));
    }

    const currentNames = await tx
      .select()
      .from(campaignTranslations)
      .where(eq(campaignTranslations.campaignId, campaignId));
    const nameChanges: Record<string, { from: string | null; to: string | null }> = {};
    for (const code of LOCALES) {
      const before = currentNames.find((row) => row.locale === code)?.name ?? null;
      const after = names[code]?.trim() || null;
      if (before === after) continue;
      nameChanges[code] = { from: before, to: after };
      const where = and(
        eq(campaignTranslations.campaignId, campaignId),
        eq(campaignTranslations.locale, code),
      );
      if (after === null) await tx.delete(campaignTranslations).where(where);
      else if (before === null)
        await tx.insert(campaignTranslations).values({ campaignId, locale: code, name: after });
      else await tx.update(campaignTranslations).set({ name: after }).where(where);
    }
    if (Object.keys(nameChanges).length) diff.names = nameChanges;
    if (id !== null && Object.keys(diff).length === 0) throw new Rejected("unchanged");

    await recordAudit(tx, {
      actorId,
      action: id === null ? "campaign.create" : "campaign.update",
      entity: "campaign",
      entityId: campaignId,
      diff,
      ip,
    });
    return campaignId;
  });
}
