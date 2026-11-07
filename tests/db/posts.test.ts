/**
 * Noticias en el panel contra MySQL (`admin/posts.ts`): crear como
 * borrador, exigir el inglés para publicar, no pisar cambios ajenos,
 * auditoría en cada cambio y lo que ve la web pública.
 */
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { auditLog, posts, users } from "@/db/schema";
import type { PostInput, TranslationInput } from "@/lib/admin/post-rules";
import {
  deletePost,
  deleteTranslation,
  getAdminPost,
  listAdminPosts,
  savePost,
  saveTranslation,
} from "@/lib/admin/posts";

const run = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
let sequence = 0;
const postIds: number[] = [];
let editorId = 0;

async function editor() {
  if (editorId) return editorId;
  const name = `n${run}`.slice(0, 32);
  const [row] = await db
    .insert(users)
    .values({ username: name, name, email: `${name}@example.test` });
  editorId = row.insertId;
  return editorId;
}

const input = (over: Partial<PostInput> = {}): PostInput => ({
  slug: `t-${run}-${++sequence}`,
  category: "event",
  status: "draft",
  publishedAt: null,
  expiresAt: null,
  ...over,
});
const text = (title: string): TranslationInput => ({
  title,
  excerpt: "Resumen",
  body: "Cuerpo de la noticia.",
  seoTitle: null,
  seoDescription: null,
});

/** Crea un borrador y devuelve su id y versión. */
async function draft(over: Partial<PostInput> = {}) {
  const actorId = await editor();
  const result = await savePost({
    actorId,
    id: null,
    input: input(over),
    version: null,
    ip: "10.0.0.2",
  });
  if (!result.ok) throw new Error(result.problem);
  postIds.push(result.id);
  return { id: result.id, version: await version(result.id), actorId };
}
const version = async (id: number) => (await getAdminPost(id))!.updatedAt.getTime();
const auditOf = (id: number) =>
  db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.entity, "post"), eq(auditLog.entityId, id)));

afterAll(async () => {
  await db
    .delete(auditLog)
    .where(and(eq(auditLog.entity, "post"), inArray(auditLog.entityId, postIds)));
  await db.delete(posts).where(inArray(posts.id, postIds));
  if (editorId) await db.delete(users).where(eq(users.id, editorId));
});

describe("noticias del panel (RF-08, RF-12)", () => {
  it("se crean siempre como borrador, con autor y auditoría", async () => {
    const actorId = await editor();
    const result = await savePost({
      actorId,
      id: null,
      input: input({ status: "published", publishedAt: new Date() }),
      version: null,
      ip: "10.0.0.2",
    });
    expect(result.ok).toBe(true);
    const id = result.ok ? result.id : 0;
    postIds.push(id);
    const post = await getAdminPost(id);
    expect(post).toMatchObject({ status: "draft", publishedAt: null });
    expect((await auditOf(id))[0]).toMatchObject({
      action: "post.create",
      actorId,
      ip: "10.0.0.2",
    });
  });

  it("publicar exige el texto en inglés; con él, se publica y la auditoría guarda el antes y el después", async () => {
    const { id, version: v1, actorId } = await draft();
    const publish = (v: number) =>
      savePost({
        actorId,
        id,
        input: {
          ...input({ status: "published", publishedAt: new Date("2026-11-01T10:00:00Z") }),
          slug: `pub-${run}`,
        },
        version: v,
        ip: null,
      });
    expect(await publish(v1)).toEqual({ ok: false, problem: "english" });

    await saveTranslation({
      actorId,
      postId: id,
      locale: "es",
      input: text("Solo español"),
      version: v1,
      ip: null,
    });
    expect(await publish(await version(id))).toEqual({ ok: false, problem: "english" });

    await saveTranslation({
      actorId,
      postId: id,
      locale: "en",
      input: text("English"),
      version: await version(id),
      ip: null,
    });
    expect(await publish(await version(id))).toEqual({ ok: true, id });

    const post = await getAdminPost(id);
    expect(post).toMatchObject({ status: "published", slug: `pub-${run}` });
    expect(Object.keys(post!.translations).sort()).toEqual(["en", "es"]);
    const update = (await auditOf(id)).find((e) => e.action === "post.update");
    expect(update?.diff).toMatchObject({
      status: { from: "draft", to: "published" },
      publishedAt: { from: null, to: "2026-11-01T10:00:00.000Z" },
    });
  });

  it("no pisa los cambios de otra persona: una versión antigua se rechaza y no cambia nada", async () => {
    const { id, version: v1, actorId } = await draft();
    expect(
      (
        await saveTranslation({
          actorId,
          postId: id,
          locale: "en",
          input: text("Primera"),
          version: v1,
          ip: null,
        })
      ).ok,
    ).toBe(true);
    // Otra pestaña abierta antes del cambio anterior.
    expect(
      await saveTranslation({
        actorId,
        postId: id,
        locale: "en",
        input: text("Pisada"),
        version: v1,
        ip: null,
      }),
    ).toEqual({ ok: false, problem: "changed" });
    expect(await savePost({ actorId, id, input: input(), version: v1, ip: null })).toEqual({
      ok: false,
      problem: "changed",
    });
    expect((await getAdminPost(id))?.translations.en?.title).toBe("Primera");
  });

  it("rechaza un slug repetido y un guardado sin cambios", async () => {
    const a = await draft();
    const b = await draft();
    const slugA = (await getAdminPost(a.id))!.slug;
    expect(
      await savePost({
        actorId: b.actorId,
        id: b.id,
        input: input({ slug: slugA }),
        version: b.version,
        ip: null,
      }),
    ).toEqual({ ok: false, problem: "slugTaken" });
    expect(
      await savePost({
        actorId: a.actorId,
        id: a.id,
        input: { ...input(), slug: slugA },
        version: a.version,
        ip: null,
      }),
    ).toEqual({ ok: false, problem: "unchanged" });
  });

  it("el inglés no se quita; otro idioma sí, con auditoría", async () => {
    const { id, actorId } = await draft();
    await saveTranslation({
      actorId,
      postId: id,
      locale: "en",
      input: text("EN"),
      version: null,
      ip: null,
    });
    await saveTranslation({
      actorId,
      postId: id,
      locale: "de",
      input: text("DE"),
      version: null,
      ip: null,
    });
    expect(
      await deleteTranslation({ actorId, postId: id, locale: "en", version: null, ip: null }),
    ).toEqual({
      ok: false,
      problem: "english",
    });
    expect(
      await deleteTranslation({ actorId, postId: id, locale: "de", version: null, ip: null }),
    ).toEqual({ ok: true, id });
    expect(Object.keys((await getAdminPost(id))!.translations)).toEqual(["en"]);
    expect((await auditOf(id)).map((e) => e.action)).toEqual(
      expect.arrayContaining(["post.translationAdd", "post.translationDelete"]),
    );
  });

  it("solo se borran borradores", async () => {
    const { id, actorId } = await draft();
    await saveTranslation({
      actorId,
      postId: id,
      locale: "en",
      input: text("EN"),
      version: null,
      ip: null,
    });
    const future = new Date(Date.now() + 86_400_000);
    await savePost({
      actorId,
      id,
      input: {
        ...input({ status: "scheduled", publishedAt: future }),
        slug: (await getAdminPost(id))!.slug,
      },
      version: null,
      ip: null,
    });
    expect(await deletePost({ actorId, postId: id, version: null, ip: null })).toEqual({
      ok: false,
      problem: "published",
    });

    const other = await draft();
    expect(
      await deletePost({ actorId, postId: other.id, version: other.version, ip: null }),
    ).toEqual({ ok: true, id: other.id });
    expect(await getAdminPost(other.id)).toBeNull();
    expect((await auditOf(other.id)).map((e) => e.action)).toContain("post.delete");
  });

  it("el listado incluye borradores y dice qué idiomas tiene cada noticia", async () => {
    const { id, actorId } = await draft();
    await saveTranslation({
      actorId,
      postId: id,
      locale: "fr",
      input: text("FR"),
      version: null,
      ip: null,
    });
    await saveTranslation({
      actorId,
      postId: id,
      locale: "en",
      input: text("EN"),
      version: null,
      ip: null,
    });
    const { rows } = await listAdminPosts("fr", { status: "draft", page: 1 });
    expect(rows.find((row) => row.id === id)).toMatchObject({
      title: "FR",
      locales: ["en", "fr"],
      status: "draft",
    });
  });
});
