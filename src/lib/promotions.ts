/**
 * Promociones de la portada (RF-01).
 *
 * Solo las que están en curso: empezaron y aún no han terminado. La fecha
 * de fin es obligatoria y se muestra, así que una promoción caducada no
 * puede seguir anunciada como en la web original (F-16).
 *
 * Como las noticias, la consulta usa `"use cache"` con la etiqueta
 * `promotions` (`cacheLife("minutes")`): el panel la invalida al guardar, y
 * una promoción que empieza o termina se nota en pocos minutos.
 *
 * @see RF-01 · M-38
 */
import "server-only";

import { and, asc, desc, eq, gt, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { cacheLife, cacheTag } from "next/cache";

import { DEFAULT_LOCALE, type Locale } from "@/config/locales";
import { media, mediaTranslations, promotionTranslations, promotions } from "@/db/schema";
import { mediaUrl } from "@/lib/media";

/** Etiqueta de caché que invalida el panel al editar una promoción. */
export const PROMOTIONS_CACHE_TAG = "promotions";

/** Banners como mucho en la portada. */
export const HOME_PROMOTIONS = 4;

export interface PublicPromotion {
  id: number;
  title: string;
  /** Idioma del título: el pedido o, si falta, el inglés. */
  titleLocale: Locale;
  alt: string;
  altLocale: Locale;
  src: string;
  width: number;
  height: number;
  /** Ruta interna (sin idioma) o URL externa. */
  targetUrl: string;
  endsAt: Date;
}

const tl = alias(promotionTranslations, "promo_local");
const te = alias(promotionTranslations, "promo_english");
const al = alias(mediaTranslations, "alt_local");
const ae = alias(mediaTranslations, "alt_english");

/** Promociones en curso, por orden y de la más reciente a la más antigua. */
export async function activePromotions(locale: Locale): Promise<PublicPromotion[]> {
  "use cache";
  cacheTag(PROMOTIONS_CACHE_TAG);
  cacheLife("minutes");

  const { db } = await import("@/db/client");
  const now = new Date();
  const rows = await db
    .select({
      id: promotions.id,
      title: sql<string>`coalesce(${tl.title}, ${te.title})`,
      titleTranslated: sql<number>`${tl.title} is not null`,
      alt: sql<string>`coalesce(${al.alt}, ${ae.alt}, '')`,
      altTranslated: sql<number>`${al.alt} is not null`,
      path: media.path,
      width: media.width,
      height: media.height,
      targetUrl: promotions.targetUrl,
      endsAt: promotions.endsAt,
    })
    .from(promotions)
    .innerJoin(media, eq(media.id, promotions.imageId))
    .leftJoin(tl, and(eq(tl.promotionId, promotions.id), eq(tl.locale, locale)))
    .leftJoin(te, and(eq(te.promotionId, promotions.id), eq(te.locale, DEFAULT_LOCALE)))
    .leftJoin(al, and(eq(al.mediaId, media.id), eq(al.locale, locale)))
    .leftJoin(ae, and(eq(ae.mediaId, media.id), eq(ae.locale, DEFAULT_LOCALE)))
    .where(and(lte(promotions.startsAt, now), gt(promotions.endsAt, now)))
    .orderBy(asc(promotions.sortOrder), desc(promotions.startsAt), desc(promotions.id))
    .limit(HOME_PROMOTIONS);

  return rows
    .filter((row) => row.title)
    .map((row) => ({
      id: row.id,
      title: row.title,
      titleLocale: Number(row.titleTranslated) === 1 ? locale : DEFAULT_LOCALE,
      alt: row.alt,
      altLocale: Number(row.altTranslated) === 1 ? locale : DEFAULT_LOCALE,
      src: mediaUrl(row.path),
      width: row.width,
      height: row.height,
      targetUrl: row.targetUrl,
      endsAt: row.endsAt,
    }));
}
