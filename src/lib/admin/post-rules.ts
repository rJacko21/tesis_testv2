/**
 * Reglas de las noticias en el panel (RF-08, RF-12), sin base de datos.
 *
 * Estados:
 * - **Borrador:** no se ve. La fecha de publicación es opcional.
 * - **Programada:** se verá sola a su hora, sin que nadie pulse nada
 *   (F-16). La fecha es obligatoria y tiene que ser futura.
 * - **Publicada:** se ve ya. Sin fecha, es la de ahora; una fecha futura no
 *   vale (para eso está «programada»).
 *
 * El fin de evento es opcional y tiene que ser posterior a la publicación:
 * pasada esa fecha, la noticia sigue visible pero marcada como terminada.
 *
 * Las fechas del formulario (`datetime-local`) se leen en UTC, como las
 * muestra toda la web, para que no dependan de la zona de quien edita.
 *
 * @see RF-08 · RF-12 · M-36
 */
import { POST_CATEGORIES, type PostCategory } from "@/db/schema/content";

export const POST_STATUSES = ["draft", "scheduled", "published"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

/** Slug: minúsculas, números y guiones; igual en todos los idiomas. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX = 120;

export interface PostInput {
  slug: string;
  category: PostCategory;
  status: PostStatus;
  publishedAt: Date | null;
  expiresAt: Date | null;
}

export type PostField = "slug" | "category" | "status" | "publishedAt" | "expiresAt";
/** Motivo de cada campo no válido; la página lo traduce. */
export type PostFieldProblem =
  | "slug"
  | "category"
  | "status"
  | "date"
  | "scheduledPast"
  | "publishedFuture"
  | "expiresBeforePublish";

export type Parsed<T, F extends string, P extends string> =
  { ok: true; value: T } | { ok: false; problems: Partial<Record<F, P>> };

/** `2026-12-01T18:30` (UTC) → `Date`; vacío → `null`; mal escrito → `undefined`. */
export function parseUtcLocal(value: string): Date | null | undefined {
  const text = value.trim();
  if (!text) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(text);
  if (!match) return undefined;
  const [, y, mo, d, h, mi] = match.map(Number) as [number, number, number, number, number, number];
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  // Rechaza fechas imposibles como el 31 de febrero, que `Date.UTC` corrige sola.
  return date.getUTCMonth() === mo - 1 && date.getUTCDate() === d && h < 24 && mi < 60
    ? date
    : undefined;
}

/** `Date` → valor de un `datetime-local` en UTC. */
export const toUtcLocal = (date: Date | null) => (date ? date.toISOString().slice(0, 16) : "");

/** Valida los datos generales de una noticia. `now` decide si una fecha es futura. */
export function parsePost(
  fields: Record<"slug" | "category" | "status" | "publishedAt" | "expiresAt", string>,
  now: Date,
): Parsed<PostInput, PostField, PostFieldProblem> {
  const problems: Partial<Record<PostField, PostFieldProblem>> = {};
  const slug = fields.slug.trim().toLowerCase();
  if (!SLUG_PATTERN.test(slug) || slug.length < 3 || slug.length > SLUG_MAX) problems.slug = "slug";
  const category = fields.category as PostCategory;
  if (!POST_CATEGORIES.includes(category)) problems.category = "category";
  const status = fields.status as PostStatus;
  if (!POST_STATUSES.includes(status)) problems.status = "status";

  let publishedAt = parseUtcLocal(fields.publishedAt);
  const expiresAt = parseUtcLocal(fields.expiresAt);
  if (publishedAt === undefined) problems.publishedAt = "date";
  if (expiresAt === undefined) problems.expiresAt = "date";

  if (publishedAt !== undefined) {
    if (status === "scheduled" && (publishedAt === null || publishedAt <= now)) {
      problems.publishedAt = "scheduledPast";
    }
    if (status === "published") {
      if (publishedAt === null) publishedAt = now;
      else if (publishedAt > now) problems.publishedAt = "publishedFuture";
    }
  }
  if (publishedAt && expiresAt && expiresAt <= publishedAt) {
    problems.expiresAt = "expiresBeforePublish";
  }

  if (Object.keys(problems).length) return { ok: false, problems };
  return {
    ok: true,
    value: {
      slug,
      category,
      status,
      publishedAt: publishedAt ?? null,
      expiresAt: expiresAt ?? null,
    },
  };
}

export const TRANSLATION_LIMITS = {
  title: 160,
  excerpt: 300,
  body: 20_000,
  seoTitle: 70,
  seoDescription: 160,
} as const;
export type TranslationField = keyof typeof TRANSLATION_LIMITS;
export type TranslationProblem = "required" | "tooLong";

export interface TranslationInput {
  title: string;
  excerpt: string;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
}

/** Valida el texto de una noticia en un idioma. Título, entradilla y cuerpo son obligatorios. */
export function parseTranslation(
  fields: Record<TranslationField, string>,
): Parsed<TranslationInput, TranslationField, TranslationProblem> {
  const problems: Partial<Record<TranslationField, TranslationProblem>> = {};
  const value = {} as Record<TranslationField, string>;
  for (const field of Object.keys(TRANSLATION_LIMITS) as TranslationField[]) {
    // El cuerpo conserva sus saltos de línea; solo se quitan los espacios de los extremos.
    const text = fields[field].replace(/\r\n/g, "\n").trim();
    value[field] = text;
    if (text.length > TRANSLATION_LIMITS[field]) problems[field] = "tooLong";
    else if (!text && (field === "title" || field === "excerpt" || field === "body")) {
      problems[field] = "required";
    }
  }
  if (Object.keys(problems).length) return { ok: false, problems };
  return {
    ok: true,
    value: {
      title: value.title,
      excerpt: value.excerpt,
      body: value.body,
      seoTitle: value.seoTitle || null,
      seoDescription: value.seoDescription || null,
    },
  };
}

/** ¿Lo verá el público ahora? Misma regla que `news.ts` (`isVisible`). */
export function isPublic(
  post: { status: PostStatus; publishedAt: Date | null },
  now: Date,
): boolean {
  return post.status !== "draft" && post.publishedAt !== null && post.publishedAt <= now;
}
