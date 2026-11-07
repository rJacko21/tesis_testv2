/**
 * Panel › Nueva noticia (RF-08, RF-12): slug y categoría. Se crea como
 * borrador; los textos y la publicación se hacen en su ficha.
 *
 * @see RF-08 · RF-12 · M-36
 */
import type { Metadata } from "next";
import Link from "next/link";

import { AdminForm } from "@/components/admin/AdminForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { POST_CATEGORIES } from "@/db/schema/content";
import { getLocale, getTranslator } from "@/i18n/server";
import { savePostAction } from "@/lib/admin/post-actions";
import { SLUG_MAX } from "@/lib/admin/post-rules";
import { adminPath, requireStaff } from "@/lib/admin/staff";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("admin.news.new"), robots: { index: false, follow: false } };
}

export default async function NewPostPage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  const staff = await requireStaff(locale, "news", adminPath(locale, "news/new"));
  return (
    <AdminShell
      locale={locale}
      t={t}
      roles={staff.roles}
      current="news"
      title={t("admin.news.new")}
      intro={
        <>
          <p>{t("admin.news.newIntro")}</p>
          <Link href={adminPath(locale, "news")} className="text-base font-semibold underline">
            {t("admin.news.back")}
          </Link>
        </>
      }
    >
      <div className="border-parchment-300 max-w-2xl rounded-lg border bg-white p-5">
        <AdminForm
          action={savePostAction}
          idPrefix="new-post"
          hidden={{ locale, publishedAt: "", expiresAt: "" }}
          submitLabel={t("admin.news.create")}
          fields={[
            {
              name: "slug",
              label: t("admin.news.slug"),
              type: "text",
              required: true,
              maxLength: SLUG_MAX,
              hint: t("admin.news.slugHint"),
              mono: true,
            },
            {
              name: "category",
              label: t("admin.news.category"),
              type: "select",
              options: POST_CATEGORIES.map((value) => ({
                value,
                label: t(`news.categories.${value}`),
              })),
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
