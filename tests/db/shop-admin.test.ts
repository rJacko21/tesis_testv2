/**
 * Tienda en el panel contra MySQL (`admin/shop.ts`): artículos, textos,
 * filas de precio con historia y campañas que mueven sus filas.
 */
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { auditLog, campaigns, itemPrices, shopCategories, shopItems, users } from "@/db/schema";
import {
  addPrice,
  endOrDeletePrice,
  getAdminItem,
  listAdminItems,
  saveCampaign,
  saveItem,
  saveItemTranslation,
} from "@/lib/admin/shop";
import type { ItemInput } from "@/lib/admin/shop-rules";

const run = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`.toUpperCase();
let sequence = 0;
let actorId = 0;
let categoryId = 0;
const itemIds: number[] = [];
const campaignIds: number[] = [];
const DAY = 86_400_000;

beforeAll(async () => {
  const name = `s${run}`.toLowerCase().slice(0, 32);
  const [user] = await db
    .insert(users)
    .values({ username: name, name, email: `${name}@example.test` });
  actorId = user.insertId;
  const [category] = await db.insert(shopCategories).values({ slug: `t-${run}`.toLowerCase() });
  categoryId = category.insertId;
});

afterAll(async () => {
  await db
    .delete(auditLog)
    .where(and(eq(auditLog.entity, "item"), inArray(auditLog.entityId, itemIds)));
  await db
    .delete(auditLog)
    .where(and(eq(auditLog.entity, "campaign"), inArray(auditLog.entityId, campaignIds)));
  await db.delete(shopItems).where(inArray(shopItems.id, itemIds));
  if (campaignIds.length) await db.delete(campaigns).where(inArray(campaigns.id, campaignIds));
  await db.delete(shopCategories).where(eq(shopCategories.id, categoryId));
  await db.delete(users).where(eq(users.id, actorId));
});

const input = (over: Partial<ItemInput> = {}): ItemInput => ({
  sku: `T-${run}-${++sequence}`,
  categoryId,
  validityDays: null,
  isBundle: false,
  isLimited: false,
  isGiftable: true,
  isActive: false,
  sortOrder: 0,
  ...over,
});

async function newItem() {
  const result = await saveItem({
    actorId,
    id: null,
    input: input({ isActive: true }),
    version: null,
    ip: null,
  });
  if (!result.ok) throw new Error(result.problem);
  itemIds.push(result.id);
  return result.id;
}
const auditActions = async (entity: string, id: number) =>
  (
    await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entity, entity), eq(auditLog.entityId, id)))
  ).map((e) => e.action);

describe("artículos (RF-05, RF-12)", () => {
  it("nace inactivo; activarlo exige el nombre en inglés", async () => {
    const id = await newItem();
    const item = (await getAdminItem(id))!;
    expect(item.isActive).toBe(false);
    const activate = async () =>
      saveItem({
        actorId,
        id,
        input: { ...input(), sku: item.sku, isActive: true },
        version: (await getAdminItem(id))!.updatedAt.getTime(),
        ip: null,
      });
    expect(await activate()).toEqual({ ok: false, problem: "english" });
    await saveItemTranslation({
      actorId,
      itemId: id,
      locale: "en",
      name: "Snow hat",
      description: "Warm.",
      version: null,
      ip: null,
    });
    expect(await activate()).toEqual({ ok: true, id });
    expect(await auditActions("item", id)).toEqual([
      "item.create",
      "item.translation",
      "item.update",
    ]);
  });

  it("rechaza un SKU repetido y una versión antigua", async () => {
    const a = await newItem();
    const b = await newItem();
    const skuA = (await getAdminItem(a))!.sku;
    const itemB = (await getAdminItem(b))!;
    expect(
      await saveItem({ actorId, id: b, input: input({ sku: skuA }), version: null, ip: null }),
    ).toEqual({
      ok: false,
      problem: "skuTaken",
    });
    await saveItemTranslation({
      actorId,
      itemId: b,
      locale: "es",
      name: "Gorro",
      description: "",
      version: null,
      ip: null,
    });
    expect(
      await saveItem({
        actorId,
        id: b,
        input: input({ sku: itemB.sku, sortOrder: 5 }),
        version: itemB.updatedAt.getTime(),
        ip: null,
      }),
    ).toEqual({ ok: false, problem: "changed" });
  });
});

describe("filas de precio", () => {
  it("una fila futura se borra; una activa se termina; una terminada no se toca", async () => {
    const id = await newItem();
    const now = new Date();
    await addPrice({
      actorId,
      itemId: id,
      input: { priceAp: 1000, salePriceAp: null, campaignId: null, startsAt: now, endsAt: null },
      ip: null,
    });
    await addPrice({
      actorId,
      itemId: id,
      input: {
        priceAp: 1000,
        salePriceAp: 600,
        campaignId: null,
        startsAt: new Date(now.getTime() + DAY),
        endsAt: new Date(now.getTime() + 2 * DAY),
      },
      ip: null,
    });
    const [future, active] = (await getAdminItem(id))!.prices;
    expect(future!.salePriceAp).toBe(600);

    expect(await endOrDeletePrice({ actorId, itemId: id, priceId: future!.id, ip: null })).toEqual({
      ok: true,
      id,
    });
    expect((await getAdminItem(id))!.prices).toHaveLength(1);

    const later = new Date(now.getTime() + 1000);
    expect(
      await endOrDeletePrice({ actorId, itemId: id, priceId: active!.id, ip: null, now: later }),
    ).toEqual({ ok: true, id });
    const [ended] = (await getAdminItem(id))!.prices;
    expect(ended!.endsAt).toEqual(later);
    expect(
      await endOrDeletePrice({
        actorId,
        itemId: id,
        priceId: active!.id,
        ip: null,
        now: new Date(later.getTime() + 1000),
      }),
    ).toEqual({
      ok: false,
      problem: "notActive",
    });
    expect(await auditActions("item", id)).toEqual(
      expect.arrayContaining(["item.priceAdd", "item.priceDelete", "item.priceEnd"]),
    );
  });

  it("el listado enseña el precio vigente, con la rebaja que está activa", async () => {
    const id = await newItem();
    const now = new Date();
    await saveItemTranslation({
      actorId,
      itemId: id,
      locale: "en",
      name: `Lantern ${run}`,
      description: "",
      version: null,
      ip: null,
    });
    await addPrice({
      actorId,
      itemId: id,
      input: {
        priceAp: 1000,
        salePriceAp: null,
        campaignId: null,
        startsAt: new Date(now.getTime() - 1000),
        endsAt: null,
      },
      ip: null,
    });
    await addPrice({
      actorId,
      itemId: id,
      input: {
        priceAp: 1000,
        salePriceAp: 750,
        campaignId: null,
        startsAt: now,
        endsAt: new Date(now.getTime() + DAY),
      },
      ip: null,
    });
    const { rows } = await listAdminItems(
      "es",
      { q: `lantern ${run}`, categoryId, active: null, page: 1 },
      new Date(now.getTime() + 1000),
    );
    expect(rows).toEqual([
      expect.objectContaining({
        id,
        name: `Lantern ${run}`,
        priceAp: 1000,
        salePriceAp: 750,
        locales: ["en"],
      }),
    ]);
  });
});

describe("campañas", () => {
  it("exige nombre en inglés y código único", async () => {
    const now = new Date();
    const dates = {
      startsAt: new Date(now.getTime() + DAY),
      endsAt: new Date(now.getTime() + 5 * DAY),
    };
    expect(
      await saveCampaign({
        actorId,
        id: null,
        input: { code: `c-${run}`.toLowerCase(), ...dates },
        names: { es: "Rebajas" },
        ip: null,
      }),
    ).toEqual({
      ok: false,
      problem: "english",
    });
    const created = await saveCampaign({
      actorId,
      id: null,
      input: { code: `c-${run}`.toLowerCase(), ...dates },
      names: { en: "Sale", es: "Rebajas" },
      ip: null,
    });
    expect(created.ok).toBe(true);
    if (created.ok) campaignIds.push(created.id);
    expect(
      await saveCampaign({
        actorId,
        id: null,
        input: { code: `c-${run}`.toLowerCase(), ...dates },
        names: { en: "Sale" },
        ip: null,
      }),
    ).toEqual({
      ok: false,
      problem: "codeTaken",
    });
  });

  it("al cambiar sus fechas, mueve las filas de precio que las seguían", async () => {
    const now = new Date();
    const start = new Date(now.getTime() + DAY);
    const end = new Date(now.getTime() + 5 * DAY);
    const created = await saveCampaign({
      actorId,
      id: null,
      input: { code: `m-${run}`.toLowerCase(), startsAt: start, endsAt: end },
      names: { en: "Move" },
      ip: null,
    });
    if (!created.ok) throw new Error(created.problem);
    campaignIds.push(created.id);
    const id = await newItem();
    await addPrice({
      actorId,
      itemId: id,
      input: {
        priceAp: 1000,
        salePriceAp: 500,
        campaignId: created.id,
        startsAt: start,
        endsAt: end,
      },
      ip: null,
    });
    // Una fila de la campaña con fin propio no se mueve en el fin.
    const ownEnd = new Date(now.getTime() + 3 * DAY);
    await addPrice({
      actorId,
      itemId: id,
      input: {
        priceAp: 900,
        salePriceAp: 400,
        campaignId: created.id,
        startsAt: start,
        endsAt: ownEnd,
      },
      ip: null,
    });

    const newStart = new Date(now.getTime() + 2 * DAY);
    const newEnd = new Date(now.getTime() + 7 * DAY);
    const result = await saveCampaign({
      actorId,
      id: created.id,
      input: { code: `m-${run}`.toLowerCase(), startsAt: newStart, endsAt: newEnd },
      names: { en: "Move", es: "Mover" },
      ip: null,
    });
    expect(result).toEqual({ ok: true, id: created.id });
    const rows = await db.select().from(itemPrices).where(eq(itemPrices.campaignId, created.id));
    const byPrice = new Map(rows.map((row) => [row.priceAp, row]));
    expect(byPrice.get(1000)).toMatchObject({ startsAt: newStart, endsAt: newEnd });
    expect(byPrice.get(900)).toMatchObject({ startsAt: newStart, endsAt: ownEnd });
    const [entry] = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entity, "campaign"),
          eq(auditLog.entityId, created.id),
          eq(auditLog.action, "campaign.update"),
        ),
      );
    expect(entry?.diff).toMatchObject({
      movedPriceRows: 2,
      names: { es: { from: null, to: "Mover" } },
    });
  });

  it("no mueve una fila a un fin anterior a su inicio, y una campaña terminada no cambia de fechas", async () => {
    const now = new Date();
    const created = await saveCampaign({
      actorId,
      id: null,
      input: {
        code: `r-${run}`.toLowerCase(),
        startsAt: new Date(now.getTime() + DAY),
        endsAt: new Date(now.getTime() + 5 * DAY),
      },
      names: { en: "Rows" },
      ip: null,
    });
    if (!created.ok) throw new Error(created.problem);
    campaignIds.push(created.id);
    const id = await newItem();
    await addPrice({
      actorId,
      itemId: id,
      input: {
        priceAp: 1000,
        salePriceAp: 500,
        campaignId: created.id,
        startsAt: new Date(now.getTime() + 4 * DAY),
        endsAt: new Date(now.getTime() + 5 * DAY),
      },
      ip: null,
    });
    expect(
      await saveCampaign({
        actorId,
        id: created.id,
        input: {
          code: `r-${run}`.toLowerCase(),
          startsAt: new Date(now.getTime() + DAY),
          endsAt: new Date(now.getTime() + 3 * DAY),
        },
        names: { en: "Rows" },
        ip: null,
      }),
    ).toEqual({ ok: false, problem: "campaignRows" });

    const [past] = await db.insert(campaigns).values({
      code: `p-${run}`.toLowerCase(),
      startsAt: new Date(now.getTime() - 5 * DAY),
      endsAt: new Date(now.getTime() - DAY),
    });
    campaignIds.push(past.insertId);
    expect(
      await saveCampaign({
        actorId,
        id: past.insertId,
        input: {
          code: `p-${run}`.toLowerCase(),
          startsAt: new Date(now.getTime() - 5 * DAY),
          endsAt: new Date(now.getTime() + DAY),
        },
        names: { en: "Past" },
        ip: null,
      }),
    ).toEqual({ ok: false, problem: "ended" });
  });
});
