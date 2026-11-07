/**
 * Panel › Noticias (RF-08, RF-12): todas las noticias, también borradores y
 * programadas, con sus idiomas y los que faltan.
 *
 * @see RF-08 · RF-12 · M-36
 */
import type { Metadata } from "next";
import Link from "next/link";

import { AdminNotice, AdminShell, AdminTable, CELL, HEAD } from "@/components/admin/AdminShell";
import { POST_STATUS_TONE } from "@/components/admin/news";
import { DateTime } from "@/components/account/DateTime";
import { Badge, buttonStyles } from "@/components/ui";
import { Pagination } from "@/components/ui/Pagination";
import { LOCALES } from "@/config/locales";
import { getLocale, getTranslator } from "@/i18n/server";
import { parsePage } from "@/lib/account/session";
import { POST_STATUSES, type PostStatus } from "@/lib/admin/post-rules";
import { listAdminPosts } from "@/lib/admin/posts";
import { adminPath, requireStaff } from "@/lib/admin/staff";

export const instant = false;

const FIELD =
  "border-parchment-300 text-ink-900 min-h-11 w-full rounded-lg border bg-white px-3 focus:border-navy-700";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("admin.news.title"), robots: { index: false, follow: false } };
}

export default async function AdminNewsPage({ searchParams }: PageProps<"/[locale]/admin/news">) {
  const [locale, t, query] = await Promise.all([getLocale(), getTranslator(), searchParams]);
  const staff = await requireStaff(locale, "news", adminPath(locale, "news"));
  const status = POST_STATUSES.includes(query.status as PostStatus)
    ? (query.status as PostStatus)
    : null;
  const result = await listAdminPosts(locale, { status, page: parsePage(query.page) });
  const href = (page: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (page > 1) params.set("page", String(page));
    const search = params.toString();
    return `${adminPath(locale, "news")}${search ? `?${search}` : ""}`;
  };

  return (
    <AdminShell
      locale={locale}
      t={t}
      roles={staff.roles}
      current="news"
      title={t("admin.news.title")}
    >
      {query.done === "deleted" ? (
        <AdminNotice tone="done">{t("admin.news.done.deleted")}</AdminNotice>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <form
          method="get"
          action={adminPath(locale, "news")}
          aria-label={t("admin.news.filter")}
          className="flex flex-wrap items-end gap-3"
        >
          <div>
            <label htmlFor="news-status" className="text-navy-900 mb-1 block text-sm font-bold">
              {t("admin.news.status")}
            </label>
            <select id="news-status" name="status" defaultValue={status ?? ""} className={FIELD}>
              <option value="">{t("admin.users.anyStatus")}</option>
              {POST_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t(`admin.news.statuses.${value}`)}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={buttonStyles({ variant: "secondary" })}>
            {t("admin.news.apply")}
          </button>
        </form>
        <Link href={adminPath(locale, "news/new")} className={buttonStyles({ variant: "primary" })}>
          {t("admin.news.new")}
        </Link>
      </div>

      {result.rows.length === 0 ? (
        <p className="bg-parchment-50 border-parchment-300 mt-6 max-w-2xl rounded-lg border p-4">
          {t("admin.news.empty")}
        </p>
      ) : (
        <div className="mt-6">
          <AdminTable
            id="news-caption"
            caption={t("admin.news.caption", { page: result.page, count: result.pageCount })}
            minWidth="48rem"
          >
            <thead className={HEAD}>
              <tr>
                <th scope="col" className={CELL}>
                  {t("admin.news.titleField")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.news.status")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.news.publishedAt")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.news.languages")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-parchment-300 divide-y">
              {result.rows.map((post) => {
                const missing = LOCALES.filter((code) => !post.locales.includes(code));
                return (
                  <tr key={post.id}>
                    <th scope="row" className={`${CELL} font-semibold`}>
                      <Link href={adminPath(locale, `news/${post.id}`)} className="underline">
                        {post.title}
                      </Link>
                      <span className="text-ink-600 block font-mono text-xs font-normal">
                        {post.slug}
                      </span>
                    </th>
                    <td className={CELL}>
                      <Badge tone={POST_STATUS_TONE[post.status]}>
                        {t(`admin.news.statuses.${post.status}`)}
                      </Badge>
                    </td>
                    <td className={CELL}>
                      {post.publishedAt ? (
                        <DateTime locale={locale} date={post.publishedAt} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={CELL}>
                      {t("admin.news.languageCount", {
                        count: post.locales.length,
                        total: LOCALES.length,
                      })}
                      {missing.length ? (
                        <span className="text-ink-600 block text-xs">
                          {t("admin.news.missing", { list: missing.join(", ") })}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>
          <Pagination page={result.page} pageCount={result.pageCount} hrefFor={href} t={t} />
        </div>
      )}
    </AdminShell>
  );
}
