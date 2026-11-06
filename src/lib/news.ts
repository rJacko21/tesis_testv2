/**
 * Consultas de noticias (RF-08).
 *
 * Reglas que resuelven fallos de la web original:
 * - **Visibilidad por fecha**: una noticia se ve si está publicada o
 *   programada y su `published_at` ya pasó. Así se programan publicaciones
 *   sin que nadie tenga que pulsar "publicar" a medianoche (F-16).
 * - **Idioma de respaldo**: si falta la traducción al idioma pedido se usa
 *   la inglesa y se devuelve `contentLocale: "en"`, para que la página avise
 *   "Disponible solo en inglés" y marque el texto con `lang="en"`.
 * - **Fechas siempre presentes**: publicación, actualización y fin de evento
 *   (F-17).
 *
 * Las consultas usan `"use cache"` con la etiqueta `posts`: el resultado se
 * reutiliza entre visitantes durante unos minutos (`cacheLife("minutes")`)
 * y el panel de administración (T-23) lo invalidará con
 * `revalidateTag("posts")` al guardar. Con pocos minutos de caché, una
 * noticia programada aparece poco después de su hora.
 *
 * @see RF-08 · 04-arquitectura §4 (índice `posts_listing_idx`)
 */
import "server-only";

import { and, count, desc, eq, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { cacheLife, cacheTag } from "next/cache";

import { DEFAULT_LOCALE, isLocale, type Locale } from "@/config/locales";
import { postTranslations, posts, type PostCategory, users } from "@/db/schema";

/** Noticias por página del listado: 3 filas de 3 en escritorio. */
export const NEWS_PAGE_SIZE = 9;

/** Etiqueta de caché que invalida el panel al editar una noticia. */
export const NEWS_CACHE_TAG = "posts";

/** Datos de una noticia para el listado. */
export interface PostSummary {
  slug: string;
  category: PostCategory;
  publishedAt: Date;
  /** Fin del evento, si lo tiene. */
  expiresAt: Date | null;
  /**
   * El evento ya terminó. Se calcula aquí, dentro de la caché, y no al
   * renderizar: leer la hora en un componente impediría prerenderizarlo.
   */
  ended: boolean;
  title: string;
  excerpt: string;
  /** Idioma en el que está el texto: el pedido o, si falta, el inglés. */
  contentLocale: Locale;
}

/** Noticia completa para la página de detalle. */
export interface PostDetail extends PostSummary {
  body: string;
  updatedAt: Date;
  /** Nombre de quien la firma; `null` = el equipo de Florensia. */
  author: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  /** Idiomas a los que está traducida (para `hreflang`). */
  availableLocales: Locale[];
}

export interface PostPage {
  items: PostSummary[];
  /** Total de noticias visibles con el filtro aplicado. */
  total: number;
  page: number;
  pageCount: number;
}

// Traducción en el idioma pedido (`tl`) y en inglés (`te`), unidas a la vez.
const tl = alias(postTranslations, "tl");
const te = alias(postTranslations, "te");

/** Condición de "visible al público ahora". */
function isVisible(now: Date) {
  return and(
    inArray(posts.status, ["published", "scheduled"]),
    isNotNull(posts.publishedAt),
    lte(posts.publishedAt, now),
  );
}

/** Une las dos traducciones; exige al menos una (la inglesa siempre existe). */
function withTranslations(locale: Locale) {
  return {
    local: and(eq(tl.postId, posts.id), eq(tl.locale, locale)),
    english: and(eq(te.postId, posts.id), eq(te.locale, DEFAULT_LOCALE)),
    exists: or(isNotNull(tl.postId), isNotNull(te.postId)),
  };
}

/** Columnas comunes del listado y del detalle, con el respaldo inglés. */
const summaryColumns = {
  slug: posts.slug,
  category: posts.category,
  publishedAt: posts.publishedAt,
  expiresAt: posts.expiresAt,
  title: sql<string>`coalesce(${tl.title}, ${te.title})`,
  excerpt: sql<string>`coalesce(${tl.excerpt}, ${te.excerpt})`,
  translated: sql<number>`${tl.postId} is not null`,
};

type SummaryRow = {
  slug: string;
  category: PostCategory;
  publishedAt: Date | null;
  expiresAt: Date | null;
  title: string;
  excerpt: string;
  translated: number | boolean;
};

function toSummary(row: SummaryRow, locale: Locale, now: Date): PostSummary {
  return {
    slug: row.slug,
    category: row.category,
    // `isVisible` garantiza que no es nulo.
    publishedAt: row.publishedAt!,
    expiresAt: row.expiresAt,
    ended: row.expiresAt !== null && row.expiresAt.getTime() <= now.getTime(),
    title: row.title,
    excerpt: row.excerpt,
    contentLocale: Number(row.translated) === 1 ? locale : DEFAULT_LOCALE,
  };
}

/**
 * Una página del listado, de la más reciente a la más antigua.
 *
 * @param page - Página empezando en 1. Si se pasa del final, devuelve
 *   `items` vacío; la página decide si responde 404.
 */
export async function listPosts(
  locale: Locale,
  page: number,
  category?: PostCategory,
): Promise<PostPage> {
  "use cache";
  cacheTag(NEWS_CACHE_TAG);
  cacheLife("minutes");

  const { db } = await import("@/db/client");
  const now = new Date();
  const join = withTranslations(locale);
  const where = and(
    isVisible(now),
    category ? eq(posts.category, category) : undefined,
    join.exists,
  );

  const [rows, [totals]] = await Promise.all([
    db
      .select(summaryColumns)
      .from(posts)
      .leftJoin(tl, join.local)
      .leftJoin(te, join.english)
      .where(where)
      .orderBy(desc(posts.publishedAt), desc(posts.id))
      .limit(NEWS_PAGE_SIZE)
      .offset((page - 1) * NEWS_PAGE_SIZE),
    db
      .select({ total: count() })
      .from(posts)
      .leftJoin(tl, join.local)
      .leftJoin(te, join.english)
      .where(where),
  ]);

  const total = totals?.total ?? 0;
  return {
    items: rows.map((row) => toSummary(row, locale, now)),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / NEWS_PAGE_SIZE)),
  };
}

/** Las noticias más recientes, para la portada (RF-01). */
export async function latestPosts(locale: Locale, limit = 3): Promise<PostSummary[]> {
  const { items } = await listPosts(locale, 1);
  return items.slice(0, limit);
}

/**
 * Una noticia visible por su slug, o `null` si no existe, es un borrador o
 * aún no se ha publicado.
 */
export async function getPost(locale: Locale, slug: string): Promise<PostDetail | null> {
  "use cache";
  cacheTag(NEWS_CACHE_TAG);
  cacheLife("minutes");

  const { db } = await import("@/db/client");
  const now = new Date();
  const join = withTranslations(locale);

  const [row] = await db
    .select({
      ...summaryColumns,
      id: posts.id,
      updatedAt: posts.updatedAt,
      author: users.username,
      body: sql<string>`coalesce(${tl.body}, ${te.body})`,
      seoTitle: sql<string | null>`if(${tl.postId} is null, ${te.seoTitle}, ${tl.seoTitle})`,
      seoDescription: sql<
        string | null
      >`if(${tl.postId} is null, ${te.seoDescription}, ${tl.seoDescription})`,
    })
    .from(posts)
    .leftJoin(tl, join.local)
    .leftJoin(te, join.english)
    .leftJoin(users, eq(users.id, posts.authorId))
    .where(and(eq(posts.slug, slug), isVisible(now), join.exists))
    .limit(1);

  if (!row) return null;

  const translations = await db
    .select({ locale: postTranslations.locale })
    .from(postTranslations)
    .where(eq(postTranslations.postId, row.id));

  return {
    ...toSummary(row, locale, now),
    body: row.body,
    updatedAt: row.updatedAt,
    author: row.author,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    availableLocales: translations.map((t) => t.locale).filter(isLocale),
  };
}

/** Entrada del sitemap: slug, última modificación e idiomas traducidos. */
export interface PostSitemapEntry {
  slug: string;
  updatedAt: Date;
  locales: Locale[];
}

/**
 * Todas las noticias visibles con sus idiomas, para `sitemap.xml`
 * (RNF-05). Una sola consulta agrupada; sin paginar, porque son cientos
 * como mucho (la web original tenía 6 881 URLs en un sitemap de 1,35 MB,
 * casi todas páginas internas del CMS, F-10).
 */
export async function listPostsForSitemap(): Promise<PostSitemapEntry[]> {
  "use cache";
  cacheTag(NEWS_CACHE_TAG);
  cacheLife("hours");

  const { db } = await import("@/db/client");
  const rows = await db
    .select({
      slug: posts.slug,
      updatedAt: posts.updatedAt,
      locales: sql<string>`group_concat(${postTranslations.locale} order by ${postTranslations.locale})`,
    })
    .from(posts)
    .innerJoin(postTranslations, eq(postTranslations.postId, posts.id))
    .where(isVisible(new Date()))
    .groupBy(posts.id)
    .orderBy(desc(posts.publishedAt));

  return rows.map((row) => ({
    slug: row.slug,
    updatedAt: row.updatedAt,
    locales: row.locales.split(",").filter(isLocale),
  }));
}
