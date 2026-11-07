"use server";
/**
 * Server Actions de las noticias en el panel (RF-08, RF-12).
 *
 * Guardar datos o textos devuelve los errores por campo (`FormState`) sin
 * perder lo escrito; si todo va bien, invalida la caché de noticias
 * (`updateTag`) y redirige a la ficha con el resultado en la URL. Borrar
 * sigue el patrón PRG de las demás acciones del panel.
 *
 * Cada acción vuelve a comprobar el rol en el servidor (`requireStaff`).
 *
 * @see RF-08 · RF-12 · M-36
 */
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { isLocale, type Locale } from "@/config/locales";
import { formLocale, text } from "@/lib/auth/action-helpers";
import type { FormState } from "@/lib/auth/form-state";
import { clientIp } from "@/lib/auth/request";
import { NEWS_CACHE_TAG } from "@/lib/news";

import {
  parsePost,
  parseTranslation,
  TRANSLATION_LIMITS,
  type TranslationField,
} from "./post-rules";
import { deletePost, deleteTranslation, savePost, saveTranslation, type PostResult } from "./posts";
import { adminPath, requireStaff } from "./staff";

const parseId = (value: string) => (/^[1-9]\d{0,9}$/.test(value) ? Number(value) : null);
const parseVersion = (value: string) => (/^\d{1,15}$/.test(value) ? Number(value) : null);
const postPath = (locale: Locale, id: number) => adminPath(locale, `news/${id}`);

const POST_FIELDS = ["slug", "category", "status", "publishedAt", "expiresAt"] as const;

/** Crea una noticia (sin `id`) o guarda sus datos generales. */
export async function savePostAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { locale, t } = await formLocale(form);
  const id = parseId(text(form, "id"));
  const back = id ? postPath(locale, id) : adminPath(locale, "news/new");
  const staff = await requireStaff(locale, "news", back);

  const values = Object.fromEntries(POST_FIELDS.map((name) => [name, text(form, name)])) as Record<
    (typeof POST_FIELDS)[number],
    string
  >;
  if (!id) values.status = "draft";
  const parsed = parsePost(values, new Date());
  if (!parsed.ok) {
    return {
      status: "error",
      message: t("admin.news.errorSummary"),
      fields: Object.fromEntries(
        Object.entries(parsed.problems).map(([field, problem]) => [
          field,
          t(`admin.news.problems.${problem}`),
        ]),
      ),
      values,
    };
  }

  const result = await savePost({
    actorId: staff.id,
    id,
    input: parsed.value,
    version: parseVersion(text(form, "version")),
    ip: await clientIp(),
  });
  if (!result.ok) {
    return {
      status: "error",
      message: t(`admin.news.errors.${result.problem}`),
      ...(result.problem === "slugTaken"
        ? { fields: { slug: t("admin.news.errors.slugTaken") } }
        : {}),
      values,
    };
  }
  updateTag(NEWS_CACHE_TAG);
  redirect(`${postPath(locale, result.id)}?done=${id ? "saved" : "created"}`);
}

/** Guarda el texto de una noticia en un idioma. */
export async function saveTranslationAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { locale, t } = await formLocale(form);
  const id = parseId(text(form, "id"));
  const lang = text(form, "lang");
  if (!id || !isLocale(lang)) redirect(adminPath(locale, "news"));
  const staff = await requireStaff(locale, "news", postPath(locale, id));

  const fields = Object.keys(TRANSLATION_LIMITS) as TranslationField[];
  const values = Object.fromEntries(fields.map((name) => [name, text(form, name)])) as Record<
    TranslationField,
    string
  >;
  const parsed = parseTranslation(values);
  if (!parsed.ok) {
    return {
      status: "error",
      message: t("admin.news.errorSummary"),
      fields: Object.fromEntries(
        Object.entries(parsed.problems).map(([field, problem]) => [
          field,
          t(`admin.news.translationProblems.${problem}`, {
            max: TRANSLATION_LIMITS[field as TranslationField],
          }),
        ]),
      ),
      values,
    };
  }
  const result = await saveTranslation({
    actorId: staff.id,
    postId: id,
    locale: lang,
    input: parsed.value,
    version: parseVersion(text(form, "version")),
    ip: await clientIp(),
  });
  if (!result.ok)
    return { status: "error", message: t(`admin.news.errors.${result.problem}`), values };
  updateTag(NEWS_CACHE_TAG);
  redirect(`${postPath(locale, id)}?lang=${lang}&done=translation`);
}

/** Resultado de una acción PRG: a la ficha (o al listado) con `?done=` o `?error=`. */
function after(locale: Locale, id: number, result: PostResult, done: string, extra = ""): never {
  if (result.ok) updateTag(NEWS_CACHE_TAG);
  redirect(
    `${postPath(locale, id)}?${extra}${result.ok ? `done=${done}` : `error=${result.problem}`}`,
  );
}

/** Quita el texto de un idioma (no el inglés). */
export async function deleteTranslationAction(form: FormData): Promise<void> {
  const { locale } = await formLocale(form);
  const id = parseId(text(form, "id"));
  const lang = text(form, "lang");
  if (!id || !isLocale(lang)) redirect(adminPath(locale, "news"));
  const staff = await requireStaff(locale, "news", postPath(locale, id));
  const result = await deleteTranslation({
    actorId: staff.id,
    postId: id,
    locale: lang,
    version: parseVersion(text(form, "version")),
    ip: await clientIp(),
  });
  after(locale, id, result, "translationDeleted", `lang=${lang}&`);
}

/** Borra un borrador. */
export async function deletePostAction(form: FormData): Promise<void> {
  const { locale } = await formLocale(form);
  const id = parseId(text(form, "id"));
  if (!id) redirect(adminPath(locale, "news"));
  const staff = await requireStaff(locale, "news", postPath(locale, id));
  const result = await deletePost({
    actorId: staff.id,
    postId: id,
    version: parseVersion(text(form, "version")),
    ip: await clientIp(),
  });
  if (result.ok) {
    updateTag(NEWS_CACHE_TAG);
    redirect(`${adminPath(locale, "news")}?done=deleted`);
  }
  after(locale, id, result, "deleted");
}
