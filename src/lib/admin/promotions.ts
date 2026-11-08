/**
 * Promociones en el panel (RF-01, RF-12): los banners de la portada, con su
 * imagen, sus fechas y sus textos por idioma.
 *
 * - **Imagen en MySQL** (`lib/media.ts`). Una imagen que ya no usa nadie se
 *   borra en la misma transacción que la deja huérfana, para que la base no
 *   acumule bytes muertos.
 * - **El texto alternativo vive con la imagen** (`media_translations`): si
 *   dos promociones usan la misma imagen, comparten su descripción.
 * - **Bloqueo optimista** con la versión (`updated_at`), como las noticias.
 * - Cada cambio deja su auditoría en la misma transacción, y las acciones
 *   invalidan la caché de la portada (`updateTag("promotions")`).
 *
 * @see RF-01 · RF-12 · M-38
 */
import "server-only";

import { count, desc, eq, inArray, sql } from "drizzle-orm";

import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/config/locales";
import {
  media,
  mediaTranslations,
  posts,
  promotionTranslations,
  promotions,
  shopItems,
} from "@/db/schema";
import type { ProcessedImage } from "@/lib/media";

import { recordAudit, type Tx } from "./audit";
import type { PromotionInput, PromotionTexts } from "./promotion-rules";

export type PromotionProblem = "notFound" | "changed" | "unchanged" | "image";
export type PromotionResult = { ok: true; id: number } | { ok: false; problem: PromotionProblem };

class Rejected extends Error {
  constructor(readonly problem: PromotionProblem) {
    super(problem);
  }
}

const isLocaleCode = (code: string): code is Locale =>
  (LOCALES as readonly string[]).includes(code);
const iso = (date: Date) => date.toISOString();

/** Una promoción en el listado del panel. */
export interface AdminPromotionRow {
  id: number;
  title: string;
  imagePath: string;
  width: number;
  height: number;
  targetUrl: string;
  startsAt: Date;
  endsAt: Date;
  sortOrder: number;
  locales: Locale[];
}

/** Todas las promociones, de la que empieza más tarde a la más antigua. */
export async function listAdminPromotions(locale: Locale): Promise<AdminPromotionRow[]> {
  const { db } = await import("@/db/client");
  const rows = await db
    .select({
      id: promotions.id,
      imagePath: media.path,
      width: media.width,
      height: media.height,
      targetUrl: promotions.targetUrl,
      startsAt: promotions.startsAt,
      endsAt: promotions.endsAt,
      sortOrder: promotions.sortOrder,
    })
    .from(promotions)
    .innerJoin(media, eq(media.id, promotions.imageId))
    .orderBy(desc(promotions.startsAt), desc(promotions.id));
  if (rows.length === 0) return [];
  const texts = await db
    .select()
    .from(promotionTranslations)
    .where(
      inArray(
        promotionTranslations.promotionId,
        rows.map((row) => row.id),
      ),
    );
  return rows.map((row) => {
    const mine = texts.filter((text) => text.promotionId === row.id);
    const title =
      mine.find((text) => text.locale === locale)?.title ??
      mine.find((text) => text.locale === DEFAULT_LOCALE)?.title ??
      "";
    return { ...row, title, locales: mine.map((text) => text.locale).filter(isLocaleCode) };
  });
}

export interface AdminPromotion extends PromotionInput, PromotionTexts {
  id: number;
  imagePath: string;
  width: number;
  height: number;
  updatedAt: Date;
}

/** Una promoción con sus textos en todos los idiomas, o `null`. */
export async function getAdminPromotion(id: number): Promise<AdminPromotion | null> {
  const { db } = await import("@/db/client");
  const [row] = await db
    .select({
      id: promotions.id,
      imageId: promotions.imageId,
      imagePath: media.path,
      width: media.width,
      height: media.height,
      targetUrl: promotions.targetUrl,
      startsAt: promotions.startsAt,
      endsAt: promotions.endsAt,
      sortOrder: promotions.sortOrder,
      updatedAt: promotions.updatedAt,
    })
    .from(promotions)
    .innerJoin(media, eq(media.id, promotions.imageId))
    .where(eq(promotions.id, id));
  if (!row) return null;
  const [titles, alts] = await Promise.all([
    db.select().from(promotionTranslations).where(eq(promotionTranslations.promotionId, id)),
    db.select().from(mediaTranslations).where(eq(mediaTranslations.mediaId, row.imageId)),
  ]);
  return {
    id: row.id,
    imagePath: row.imagePath,
    width: row.width,
    height: row.height,
    targetUrl: row.targetUrl,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
    titles: Object.fromEntries(
      titles.filter((t) => isLocaleCode(t.locale)).map((t) => [t.locale, t.title]),
    ),
    alts: Object.fromEntries(
      alts.filter((t) => isLocaleCode(t.locale)).map((t) => [t.locale, t.alt]),
    ),
  };
}

/** Guarda la imagen (o reutiliza la misma si ya existía) y devuelve su id. */
async function storeImage(tx: Tx, image: ProcessedImage): Promise<number> {
  await tx.insert(media).ignore().values({
    path: image.path,
    width: image.width,
    height: image.height,
    mimeType: "image/webp",
    data: image.data,
  });
  const [row] = await tx.select({ id: media.id }).from(media).where(eq(media.path, image.path));
  if (!row) throw new Rejected("image");
  return row.id;
}

/** Borra una imagen subida si ya nada la usa. */
async function dropIfOrphan(tx: Tx, mediaId: number): Promise<void> {
  const uses = await Promise.all([
    tx.select({ n: count() }).from(promotions).where(eq(promotions.imageId, mediaId)),
    tx.select({ n: count() }).from(posts).where(eq(posts.coverImageId, mediaId)),
    tx.select({ n: count() }).from(shopItems).where(eq(shopItems.imageId, mediaId)),
  ]);
  const total = uses.reduce((sum, [row]) => sum + (row?.n ?? 0), 0);
  if (total === 0) await tx.delete(media).where(eq(media.id, mediaId));
}

/** Sustituye los textos de una entidad por los dados (borrar e insertar). */
async function replaceTexts(tx: Tx, promotionId: number, mediaId: number, texts: PromotionTexts) {
  await tx.delete(promotionTranslations).where(eq(promotionTranslations.promotionId, promotionId));
  const titles = Object.entries(texts.titles).map(([locale, title]) => ({
    promotionId,
    locale,
    title,
  }));
  if (titles.length) await tx.insert(promotionTranslations).values(titles);
  await tx.delete(mediaTranslations).where(eq(mediaTranslations.mediaId, mediaId));
  const alts = Object.entries(texts.alts).map(([locale, alt]) => ({ mediaId, locale, alt }));
  if (alts.length) await tx.insert(mediaTranslations).values(alts);
}

/** Los textos actuales, para comparar al guardar. */
async function currentTexts(tx: Tx, promotionId: number, mediaId: number) {
  const [titles, alts] = await Promise.all([
    tx
      .select()
      .from(promotionTranslations)
      .where(eq(promotionTranslations.promotionId, promotionId)),
    tx.select().from(mediaTranslations).where(eq(mediaTranslations.mediaId, mediaId)),
  ]);
  return {
    titles: Object.fromEntries(titles.map((t) => [t.locale, t.title])),
    alts: Object.fromEntries(alts.map((t) => [t.locale, t.alt])),
  };
}

const sameTexts = (a: Record<string, string>, b: Record<string, string>) =>
  JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/**
 * Crea (sin `id`, con imagen obligatoria) o guarda una promoción. Al
 * editar, la imagen es opcional: sin ella se conserva la actual.
 */
export async function savePromotion(request: {
  actorId: number;
  id: number | null;
  input: PromotionInput & PromotionTexts;
  image: ProcessedImage | null;
  /** `updatedAt` en ms que vio el formulario (solo al editar). */
  version?: number | null;
  ip: string | null;
}): Promise<PromotionResult> {
  const { actorId, id, input, image, version, ip } = request;
  const { titles, alts, ...fields } = input;
  const { db } = await import("@/db/client");
  try {
    const promotionId = await db.transaction(async (tx) => {
      if (id === null) {
        if (!image) throw new Rejected("image");
        const imageId = await storeImage(tx, image);
        const [row] = await tx.insert(promotions).values({ ...fields, imageId });
        await replaceTexts(tx, row.insertId, imageId, { titles, alts });
        await recordAudit(tx, {
          actorId,
          action: "promotion.create",
          entity: "promotion",
          entityId: row.insertId,
          diff: {
            title: titles.en,
            targetUrl: fields.targetUrl,
            startsAt: iso(fields.startsAt),
            endsAt: iso(fields.endsAt),
            image: image.path,
          },
          ip,
        });
        return row.insertId;
      }

      const [current] = await tx
        .select({ promotion: promotions, path: media.path })
        .from(promotions)
        .innerJoin(media, eq(media.id, promotions.imageId))
        .where(eq(promotions.id, id))
        .for("update");
      if (!current) throw new Rejected("notFound");
      const old = current.promotion;
      if (version != null && old.updatedAt.getTime() !== version) throw new Rejected("changed");

      const diff: Record<string, unknown> = {};
      if (old.targetUrl !== fields.targetUrl) {
        diff.targetUrl = { from: old.targetUrl, to: fields.targetUrl };
      }
      for (const key of ["startsAt", "endsAt"] as const) {
        if (old[key].getTime() !== fields[key].getTime()) {
          diff[key] = { from: iso(old[key]), to: iso(fields[key]) };
        }
      }
      if (old.sortOrder !== fields.sortOrder) {
        diff.sortOrder = { from: old.sortOrder, to: fields.sortOrder };
      }
      let imageId = old.imageId;
      if (image && image.path !== current.path) {
        imageId = await storeImage(tx, image);
        diff.image = { from: current.path, to: image.path };
      }
      const before = await currentTexts(tx, id, old.imageId);
      if (!sameTexts(before.titles, titles)) diff.titles = Object.keys(titles).sort().join(",");
      if (!sameTexts(before.alts, alts) || imageId !== old.imageId) {
        diff.alts = Object.keys(alts).sort().join(",");
      }
      if (before.titles.en !== titles.en) diff.title = { from: before.titles.en, to: titles.en };
      if (Object.keys(diff).length === 0) throw new Rejected("unchanged");

      // `updatedAt` se fija aquí aunque solo cambien los textos: es la versión.
      await tx
        .update(promotions)
        .set({ ...fields, imageId, updatedAt: new Date() })
        .where(eq(promotions.id, id));
      await replaceTexts(tx, id, imageId, { titles, alts });
      if (imageId !== old.imageId) await dropIfOrphan(tx, old.imageId);
      await recordAudit(tx, {
        actorId,
        action: "promotion.update",
        entity: "promotion",
        entityId: id,
        diff,
        ip,
      });
      return id;
    });
    return { ok: true, id: promotionId };
  } catch (error) {
    if (error instanceof Rejected) return { ok: false, problem: error.problem };
    throw error;
  }
}

/** Borra una promoción (y su imagen, si nadie más la usa). */
export async function deletePromotion(request: {
  actorId: number;
  id: number;
  ip: string | null;
}): Promise<PromotionResult> {
  const { actorId, id, ip } = request;
  const { db } = await import("@/db/client");
  try {
    await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ imageId: promotions.imageId })
        .from(promotions)
        .where(eq(promotions.id, id))
        .for("update");
      if (!current) throw new Rejected("notFound");
      const [title] = await tx
        .select({ title: promotionTranslations.title })
        .from(promotionTranslations)
        .where(
          sql`${promotionTranslations.promotionId} = ${id} and ${promotionTranslations.locale} = ${DEFAULT_LOCALE}`,
        );
      await tx.delete(promotions).where(eq(promotions.id, id));
      await dropIfOrphan(tx, current.imageId);
      await recordAudit(tx, {
        actorId,
        action: "promotion.delete",
        entity: "promotion",
        entityId: id,
        diff: { title: title?.title ?? null },
        ip,
      });
    });
    return { ok: true, id };
  } catch (error) {
    if (error instanceof Rejected) return { ok: false, problem: error.problem };
    throw error;
  }
}
