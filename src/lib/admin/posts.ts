/**
 * Noticias en el panel (RF-08, RF-12): listado con todos los estados,
 * crear, editar, traducir y borrar borradores.
 *
 * - **Una noticia nueva empieza como borrador.** Para programarla o
 *   publicarla tiene que tener el texto en inglés, que es el idioma de
 *   respaldo de la web pública (`news.ts`).
 * - **Edición sin pisar a otro:** cada formulario envía la versión
 *   (`updated_at`) que vio. Si otra persona guardó entretanto, no se
 *   guarda y se avisa (bloqueo optimista), en vez de perder sus cambios.
 * - **Cada cambio deja su auditoría** en la misma transacción. Del texto se
 *   guarda qué campos cambiaron y el título antes y después, no el cuerpo
 *   entero.
 * - Solo se borran los borradores: una noticia publicada se retira
 *   pasándola a borrador, y su URL deja de verse sin perder el historial.
 *
 * @see RF-08 · RF-12 · M-36
 */
import "server-only";

import { and, asc, count, desc, eq, ne, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";

import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/config/locales";
import { postTranslations, posts, users } from "@/db/schema";
import type { PostCategory } from "@/db/schema/content";

import { recordAudit, type Tx } from "./audit";
import type { PostInput, PostStatus, TranslationInput } from "./post-rules";

export const ADMIN_POSTS_PAGE_SIZE = 20;

export interface AdminPostRow {
  id: number;
  slug: string;
  category: PostCategory;
  status: PostStatus;
  publishedAt: Date | null;
  expiresAt: Date | null;
  updatedAt: Date;
  title: string;
  locales: Locale[];
}

const localeList = (value: string | null): Locale[] =>
  (value ?? "")
    .split(",")
    .filter((code): code is Locale => (LOCALES as readonly string[]).includes(code))
    .sort((a, b) => LOCALES.indexOf(a) - LOCALES.indexOf(b));

/** Todas las noticias, de la más reciente a la más antigua, con sus idiomas. */
export async function listAdminPosts(
  locale: Locale,
  filter: { status: PostStatus | null; page: number },
) {
  const { db } = await import("@/db/client");
  const tl = alias(postTranslations, "tl");
  const te = alias(postTranslations, "te");
  const where: SQL | undefined = filter.status ? eq(posts.status, filter.status) : undefined;

  const [[totalRow], rows] = await Promise.all([
    db.select({ total: count() }).from(posts).where(where),
    db
      .select({
        id: posts.id,
        slug: posts.slug,
        category: posts.category,
        status: posts.status,
        publishedAt: posts.publishedAt,
        expiresAt: posts.expiresAt,
        updatedAt: posts.updatedAt,
        title: sql<string>`coalesce(${tl.title}, ${te.title}, ${posts.slug})`,
        locales: sql<
          string | null
        >`(select group_concat(${postTranslations.locale}) from ${postTranslations} where ${postTranslations.postId} = ${posts.id})`,
      })
      .from(posts)
      .leftJoin(tl, and(eq(tl.postId, posts.id), eq(tl.locale, locale)))
      .leftJoin(te, and(eq(te.postId, posts.id), eq(te.locale, DEFAULT_LOCALE)))
      .where(where)
      // Sin fecha (borradores) arriba: son los que se están escribiendo.
      .orderBy(sql`${posts.publishedAt} is not null`, desc(posts.publishedAt), desc(posts.id))
      .limit(ADMIN_POSTS_PAGE_SIZE)
      .offset((filter.page - 1) * ADMIN_POSTS_PAGE_SIZE),
  ]);
  const total = totalRow?.total ?? 0;
  return {
    rows: rows.map((row) => ({ ...row, locales: localeList(row.locales) })) as AdminPostRow[],
    total,
    page: filter.page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_POSTS_PAGE_SIZE)),
  };
}

export interface AdminPost extends Omit<AdminPostRow, "title" | "locales"> {
  author: string | null;
  translations: Partial<Record<Locale, TranslationInput>>;
}

/** Una noticia con todos sus textos, para editarla. */
export async function getAdminPost(id: number): Promise<AdminPost | null> {
  const { db } = await import("@/db/client");
  const [post] = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      category: posts.category,
      status: posts.status,
      publishedAt: posts.publishedAt,
      expiresAt: posts.expiresAt,
      updatedAt: posts.updatedAt,
      author: sql<string | null>`coalesce(${users.displayUsername}, ${users.username})`,
    })
    .from(posts)
    .leftJoin(users, eq(users.id, posts.authorId))
    .where(eq(posts.id, id));
  if (!post) return null;
  const rows = await db
    .select()
    .from(postTranslations)
    .where(eq(postTranslations.postId, id))
    .orderBy(asc(postTranslations.locale));
  const translations: AdminPost["translations"] = {};
  for (const row of rows) {
    if (!(LOCALES as readonly string[]).includes(row.locale)) continue;
    translations[row.locale as Locale] = {
      title: row.title,
      excerpt: row.excerpt,
      body: row.body,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
    };
  }
  return { ...(post as Omit<AdminPost, "translations">), translations };
}

export type PostProblem =
  "notFound" | "changed" | "slugTaken" | "english" | "unchanged" | "published";
export type PostResult = { ok: true; id: number } | { ok: false; problem: PostProblem };

class Rejected extends Error {
  constructor(readonly problem: PostProblem) {
    super(problem);
  }
}

async function change(run: (tx: Tx) => Promise<number>): Promise<PostResult> {
  const { db } = await import("@/db/client");
  try {
    return { ok: true, id: await db.transaction(run) };
  } catch (error) {
    if (error instanceof Rejected) return { ok: false, problem: error.problem };
    throw error;
  }
}

/** Bloquea la noticia y comprueba que nadie la guardó después de `version`. */
async function lockPost(tx: Tx, id: number, version: number | null) {
  const [row] = await tx.select().from(posts).where(eq(posts.id, id)).for("update");
  if (!row) throw new Rejected("notFound");
  if (version !== null && row.updatedAt.getTime() !== version) throw new Rejected("changed");
  return row;
}

async function hasEnglish(tx: Tx, postId: number) {
  const [row] = await tx
    .select({ n: count() })
    .from(postTranslations)
    .where(and(eq(postTranslations.postId, postId), eq(postTranslations.locale, DEFAULT_LOCALE)));
  return (row?.n ?? 0) > 0;
}

async function slugTaken(tx: Tx, slug: string, exceptId: number | null) {
  const [row] = await tx
    .select({ n: count() })
    .from(posts)
    .where(
      exceptId === null ? eq(posts.slug, slug) : and(eq(posts.slug, slug), ne(posts.id, exceptId)),
    );
  return (row?.n ?? 0) > 0;
}

const iso = (date: Date | null) => date?.toISOString() ?? null;

export interface SavePost {
  actorId: number;
  /** `null` para crear una noticia nueva (siempre como borrador). */
  id: number | null;
  input: PostInput;
  /** `updated_at` que vio el formulario, en milisegundos. */
  version: number | null;
  ip: string | null;
}

/** Crea o actualiza los datos generales de una noticia. */
export async function savePost({ actorId, id, input, version, ip }: SavePost): Promise<PostResult> {
  return change(async (tx) => {
    if (await slugTaken(tx, input.slug, id)) throw new Rejected("slugTaken");
    const now = new Date();

    if (id === null) {
      // Solo slug y categoría: estado y fechas se eligen en la ficha, con el texto ya escrito.
      const [row] = await tx.insert(posts).values({
        slug: input.slug,
        category: input.category,
        status: "draft",
        authorId: actorId,
        createdAt: now,
        updatedAt: now,
      });
      await recordAudit(tx, {
        actorId,
        action: "post.create",
        entity: "post",
        entityId: row.insertId,
        diff: { slug: input.slug, category: input.category },
        ip,
      });
      return row.insertId;
    }

    const current = await lockPost(tx, id, version);
    if (input.status !== "draft" && !(await hasEnglish(tx, id))) throw new Rejected("english");

    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const field of ["slug", "category", "status"] as const) {
      if (current[field] !== input[field]) diff[field] = { from: current[field], to: input[field] };
    }
    for (const field of ["publishedAt", "expiresAt"] as const) {
      if (iso(current[field]) !== iso(input[field])) {
        diff[field] = { from: iso(current[field]), to: iso(input[field]) };
      }
    }
    if (Object.keys(diff).length === 0) throw new Rejected("unchanged");

    await tx
      .update(posts)
      .set({ ...input, updatedAt: now })
      .where(eq(posts.id, id));
    await recordAudit(tx, {
      actorId,
      action: "post.update",
      entity: "post",
      entityId: id,
      diff,
      ip,
    });
    return id;
  });
}

export interface SaveTranslation {
  actorId: number;
  postId: number;
  locale: Locale;
  input: TranslationInput;
  version: number | null;
  ip: string | null;
}

/** Crea o reescribe el texto de una noticia en un idioma. */
export async function saveTranslation(request: SaveTranslation): Promise<PostResult> {
  const { actorId, postId, locale, input, version, ip } = request;
  return change(async (tx) => {
    await lockPost(tx, postId, version);
    const [current] = await tx
      .select()
      .from(postTranslations)
      .where(and(eq(postTranslations.postId, postId), eq(postTranslations.locale, locale)));

    const changed = (Object.keys(input) as (keyof TranslationInput)[]).filter(
      (field) => (current?.[field] ?? null) !== input[field],
    );
    if (current && changed.length === 0) throw new Rejected("unchanged");

    if (current) {
      await tx
        .update(postTranslations)
        .set(input)
        .where(and(eq(postTranslations.postId, postId), eq(postTranslations.locale, locale)));
    } else {
      await tx.insert(postTranslations).values({ postId, locale, ...input });
    }
    // La noticia cambia de versión: un formulario abierto antes ya no pisa este texto.
    await tx.update(posts).set({ updatedAt: new Date() }).where(eq(posts.id, postId));
    await recordAudit(tx, {
      actorId,
      action: current ? "post.translation" : "post.translationAdd",
      entity: "post",
      entityId: postId,
      diff: {
        locale,
        fields: changed,
        ...(current?.title !== input.title
          ? { title: { from: current?.title ?? null, to: input.title } }
          : {}),
      },
      ip,
    });
    return postId;
  });
}

/** Quita el texto en un idioma. El inglés no se quita: es el de respaldo. */
export async function deleteTranslation(request: {
  actorId: number;
  postId: number;
  locale: Locale;
  version: number | null;
  ip: string | null;
}): Promise<PostResult> {
  const { actorId, postId, locale, version, ip } = request;
  return change(async (tx) => {
    await lockPost(tx, postId, version);
    if (locale === DEFAULT_LOCALE) throw new Rejected("english");
    const [result] = await tx
      .delete(postTranslations)
      .where(and(eq(postTranslations.postId, postId), eq(postTranslations.locale, locale)));
    if (result.affectedRows === 0) throw new Rejected("unchanged");
    await tx.update(posts).set({ updatedAt: new Date() }).where(eq(posts.id, postId));
    await recordAudit(tx, {
      actorId,
      action: "post.translationDelete",
      entity: "post",
      entityId: postId,
      diff: { locale },
      ip,
    });
    return postId;
  });
}

/** Borra un borrador. Una noticia publicada o programada se pasa antes a borrador. */
export async function deletePost(request: {
  actorId: number;
  postId: number;
  version: number | null;
  ip: string | null;
}): Promise<PostResult> {
  const { actorId, postId, version, ip } = request;
  return change(async (tx) => {
    const current = await lockPost(tx, postId, version);
    if (current.status !== "draft") throw new Rejected("published");
    await tx.delete(posts).where(eq(posts.id, postId));
    await recordAudit(tx, {
      actorId,
      action: "post.delete",
      entity: "post",
      entityId: postId,
      diff: { slug: current.slug, category: current.category },
      ip,
    });
    return postId;
  });
}
