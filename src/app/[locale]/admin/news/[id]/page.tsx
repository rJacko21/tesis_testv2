/**
 * Panel › Ficha de una noticia (RF-08, RF-12): datos generales y estado,
 * textos por idioma con vista previa, y borrar si es un borrador.
 *
 * `?lang=` elige el idioma que se edita (por defecto, el de la página si ya
 * hay texto en él; si no, el inglés). Cada formulario envía la versión que
 * vio, para no pisar los cambios de otra persona.
 *
 * @see RF-08 · RF-12 · M-36
 */
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { AdminForm } from "@/components/admin/AdminForm";
import { AdminNotice, AdminShell } from "@/components/admin/AdminShell";
import { POST_STATUS_TONE } from "@/components/admin/news";
import { DateTime } from "@/components/account/DateTime";
import { Badge, buttonStyles } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, LOCALE_NAMES, LOCALES, type Locale } from "@/config/locales";
import { POST_CATEGORIES } from "@/db/schema/content";
import { getLocale, getTranslator } from "@/i18n/server";
import {
  deletePostAction,
  deleteTranslationAction,
  savePostAction,
  saveTranslationAction,
} from "@/lib/admin/post-actions";
import {
  isPublic,
  POST_STATUSES,
  SLUG_MAX,
  toUtcLocal,
  TRANSLATION_LIMITS,
} from "@/lib/admin/post-rules";
import { getAdminPost, type PostProblem } from "@/lib/admin/posts";
import { adminPath, requireStaff } from "@/lib/admin/staff";
import { Markdown } from "@/lib/markdown";

export const instant = false;

const DONE = ["created", "saved", "translation", "translationDeleted"] as const;
const ERRORS: readonly PostProblem[] = [
  "notFound",
  "changed",
  "slugTaken",
  "english",
  "unchanged",
  "published",
];
const SECTION = "border-parchment-300 rounded-lg border bg-surface p-5";

const parseId = (value: string) => (/^[1-9]\d{0,9}$/.test(value) ? Number(value) : null);

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/news/[id]">): Promise<Metadata> {
  const [t, { id }] = await Promise.all([getTranslator(), params]);
  return { title: t("admin.news.editTitle", { id }), robots: { index: false, follow: false } };
}

export default async function EditPostPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/news/[id]">) {
  const [locale, t, { id: rawId }, query] = await Promise.all([
    getLocale(),
    getTranslator(),
    params,
    searchParams,
  ]);
  const id = parseId(rawId);
  if (id === null) notFound();
  const staff = await requireStaff(locale, "news", adminPath(locale, `news/${id}`));
  const post = await getAdminPost(id);
  if (!post) notFound();
  await connection();
  const now = new Date();

  const lang: Locale =
    typeof query.lang === "string" && isLocale(query.lang)
      ? query.lang
      : post.translations[locale]
        ? locale
        : DEFAULT_LOCALE;
  const text = post.translations[lang];
  const version = String(post.updatedAt.getTime());
  const done = DONE.find((value) => value === query.done);
  const error = ERRORS.find((value) => value === query.error);
  const visible = isPublic(post, now);
  const title = post.translations[locale]?.title ?? post.translations.en?.title ?? post.slug;

  return (
    <AdminShell
      locale={locale}
      t={t}
      roles={staff.roles}
      current="news"
      title={title}
      intro={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base">
          <Badge tone={POST_STATUS_TONE[post.status]}>
            {t(`admin.news.statuses.${post.status}`)}
          </Badge>
          {post.status === "scheduled" && post.publishedAt && !visible ? (
            <span>
              {t("admin.news.scheduledFor")} <DateTime locale={locale} date={post.publishedAt} />
            </span>
          ) : null}
          {visible ? (
            <Link href={`/${locale}/news/${post.slug}`} className="font-semibold underline">
              {t("admin.news.viewPublic")}
            </Link>
          ) : null}
          <Link href={adminPath(locale, "news")} className="font-semibold underline">
            {t("admin.news.back")}
          </Link>
        </div>
      }
    >
      {error ? (
        <AdminNotice tone="error">{t(`admin.news.errors.${error}`)}</AdminNotice>
      ) : done ? (
        <AdminNotice tone="done">{t(`admin.news.done.${done}`)}</AdminNotice>
      ) : null}

      <section aria-labelledby="post-data" className={SECTION}>
        <h2 id="post-data" className="text-heading mb-4 text-xl font-bold">
          {t("admin.news.data")}
        </h2>
        <AdminForm
          action={savePostAction}
          idPrefix="post"
          columns
          hidden={{ locale, id: String(post.id), version }}
          submitLabel={t("admin.news.save")}
          fields={[
            {
              name: "slug",
              label: t("admin.news.slug"),
              type: "text",
              required: true,
              maxLength: SLUG_MAX,
              defaultValue: post.slug,
              hint: t("admin.news.slugHint"),
              mono: true,
            },
            {
              name: "category",
              label: t("admin.news.category"),
              type: "select",
              defaultValue: post.category,
              options: POST_CATEGORIES.map((value) => ({
                value,
                label: t(`news.categories.${value}`),
              })),
            },
            {
              name: "status",
              label: t("admin.news.status"),
              type: "select",
              defaultValue: post.status,
              hint: t("admin.news.statusHint"),
              options: POST_STATUSES.map((value) => ({
                value,
                label: t(`admin.news.statuses.${value}`),
              })),
            },
            {
              name: "publishedAt",
              label: t("admin.news.publishedAt"),
              type: "datetime",
              defaultValue: toUtcLocal(post.publishedAt),
              hint: t("admin.news.publishedAtHint"),
            },
            {
              name: "expiresAt",
              label: t("admin.news.expiresAt"),
              type: "datetime",
              defaultValue: toUtcLocal(post.expiresAt),
              hint: t("admin.news.expiresAtHint"),
            },
          ]}
        />
        <p className="text-ink-600 mt-4 text-sm">
          {t("admin.news.meta", { author: post.author ?? "—" })}{" "}
          <DateTime locale={locale} date={post.updatedAt} />
        </p>
      </section>

      <section aria-labelledby="post-texts" className={`${SECTION} mt-6`}>
        <h2 id="post-texts" className="text-heading text-xl font-bold">
          {t("admin.news.texts")}
        </h2>
        <p className="text-ink-600 mt-1">{t("admin.news.textsHint")}</p>
        <nav
          aria-label={t("admin.news.languages")}
          className="-mx-1 mt-4 overflow-x-auto px-1 pb-1"
        >
          <ul className="flex min-w-max gap-2">
            {LOCALES.map((code) => (
              <li key={code}>
                <Link
                  href={`${adminPath(locale, `news/${post.id}`)}?lang=${code}`}
                  aria-current={code === lang ? "page" : undefined}
                  lang={code}
                  className="border-parchment-300 text-heading hover:border-strong aria-[current]:bg-navy-900 aria-[current]:border-navy-900 bg-surface inline-flex min-h-11 items-center gap-2 rounded-full border px-4 font-semibold aria-[current]:text-white"
                >
                  {LOCALE_NAMES[code]}
                  {post.translations[code] ? null : (
                    <span lang={locale} className="text-xs font-normal">
                      ({t("admin.news.missingShort")})
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <h3 className="text-heading mt-6 text-lg font-bold">
          {t("admin.news.textIn", { language: LOCALE_NAMES[lang] })}
        </h3>
        {text ? null : (
          <p className="mt-1">
            {t(lang === DEFAULT_LOCALE ? "admin.news.englishFirst" : "admin.news.noText")}
          </p>
        )}
        <div className="mt-4">
          <AdminForm
            key={lang}
            action={saveTranslationAction}
            idPrefix={`text-${lang}`}
            columns
            hidden={{ locale, id: String(post.id), version, lang }}
            submitLabel={t("admin.news.saveText")}
            fields={[
              {
                name: "title",
                label: t("admin.news.titleField"),
                type: "text",
                required: true,
                maxLength: TRANSLATION_LIMITS.title,
                defaultValue: text?.title,
                lang,
              },
              {
                name: "seoTitle",
                label: t("admin.news.seoTitle"),
                type: "text",
                maxLength: TRANSLATION_LIMITS.seoTitle,
                defaultValue: text?.seoTitle ?? "",
                hint: t("admin.news.seoTitleHint", { max: TRANSLATION_LIMITS.seoTitle }),
                lang,
              },
              {
                name: "excerpt",
                label: t("admin.news.excerpt"),
                type: "textarea",
                rows: 2,
                required: true,
                maxLength: TRANSLATION_LIMITS.excerpt,
                defaultValue: text?.excerpt,
                hint: t("admin.news.excerptHint", { max: TRANSLATION_LIMITS.excerpt }),
                lang,
              },
              {
                name: "body",
                label: t("admin.news.body"),
                type: "textarea",
                rows: 14,
                required: true,
                maxLength: TRANSLATION_LIMITS.body,
                defaultValue: text?.body,
                hint: t("admin.news.bodyHint"),
                lang,
                mono: true,
              },
              {
                name: "seoDescription",
                label: t("admin.news.seoDescription"),
                type: "textarea",
                rows: 2,
                maxLength: TRANSLATION_LIMITS.seoDescription,
                defaultValue: text?.seoDescription ?? "",
                hint: t("admin.news.seoDescriptionHint", {
                  max: TRANSLATION_LIMITS.seoDescription,
                }),
                lang,
              },
            ]}
          />
        </div>

        {text && lang !== DEFAULT_LOCALE ? (
          <form action={deleteTranslationAction} className="mt-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="id" value={post.id} />
            <input type="hidden" name="version" value={version} />
            <input type="hidden" name="lang" value={lang} />
            <button type="submit" className={buttonStyles({ variant: "ghost" })}>
              {t("admin.news.deleteText", { language: LOCALE_NAMES[lang] })}
            </button>
          </form>
        ) : null}

        {text ? (
          <section
            aria-labelledby="post-preview"
            className="border-parchment-300 mt-6 border-t pt-6"
          >
            <h3 id="post-preview" className="text-heading text-lg font-bold">
              {t("admin.news.preview")}
            </h3>
            <div lang={lang} className="bg-parchment-50 mt-3 rounded-lg p-4">
              <p className="font-display text-heading text-2xl font-bold">{text.title}</p>
              <p className="text-ink-600 mt-1">{text.excerpt}</p>
              <div className="prose-news mt-4">
                <Markdown source={text.body} externalLabel={t("nav.externalSite")} />
              </div>
            </div>
          </section>
        ) : null}
      </section>

      {post.status === "draft" ? (
        <section aria-labelledby="post-delete" className={`${SECTION} mt-6`}>
          <h2 id="post-delete" className="text-heading text-xl font-bold">
            {t("admin.news.deleteTitle")}
          </h2>
          <p className="mt-1">{t("admin.news.deleteHint")}</p>
          <form action={deletePostAction} className="mt-3">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="id" value={post.id} />
            <input type="hidden" name="version" value={version} />
            <button type="submit" className={buttonStyles({ variant: "danger" })}>
              {t("admin.news.delete")}
            </button>
          </form>
        </section>
      ) : null}
    </AdminShell>
  );
}
