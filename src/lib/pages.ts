/**
 * Páginas fijas: reglas y legales (RF-10, RF-11).
 *
 * Mismo patrón que las noticias (`lib/news.ts`): traducción del idioma
 * pedido con respaldo en inglés, en una sola consulta, y caché con la
 * etiqueta `pages` que el panel (T-23) invalidará al editar.
 *
 * La fecha de vigencia es `pages.updated_at` y la versión, `pages.version`:
 * el consentimiento guarda qué versión se aceptó, y la página la muestra
 * para que cualquiera pueda comprobar qué texto rige (RF-10).
 */
import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { cacheLife, cacheTag } from "next/cache";

import { DEFAULT_LOCALE, type Locale } from "@/config/locales";
import { pageTranslations, pages } from "@/db/schema";
import type { PageSlug } from "@/db/seed/pages";

export const PAGES_CACHE_TAG = "pages";

export interface StaticPage {
  title: string;
  body: string;
  version: number;
  updatedAt: Date;
  /** Idioma del texto: el pedido o, si falta, el inglés. */
  contentLocale: Locale;
}

const tl = alias(pageTranslations, "tl");
const te = alias(pageTranslations, "te");

/** Una página fija, o `null` si aún no se ha cargado (`pnpm db:seed`). */
export async function getStaticPage(locale: Locale, slug: PageSlug): Promise<StaticPage | null> {
  "use cache";
  cacheTag(PAGES_CACHE_TAG);
  cacheLife("hours");

  const { db } = await import("@/db/client");
  const [row] = await db
    .select({
      title: sql<string>`coalesce(${tl.title}, ${te.title})`,
      body: sql<string>`coalesce(${tl.body}, ${te.body})`,
      translated: sql<number>`${tl.pageId} is not null`,
      version: pages.version,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .leftJoin(tl, and(eq(tl.pageId, pages.id), eq(tl.locale, locale)))
    .leftJoin(te, and(eq(te.pageId, pages.id), eq(te.locale, DEFAULT_LOCALE)))
    .where(eq(pages.slug, slug))
    .limit(1);

  if (!row || row.title === null) return null;
  return {
    title: row.title,
    body: row.body,
    version: row.version,
    updatedAt: row.updatedAt,
    contentLocale: Number(row.translated) === 1 ? locale : DEFAULT_LOCALE,
  };
}
