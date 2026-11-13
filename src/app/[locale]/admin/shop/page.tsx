/**
 * Panel › Tienda (RF-05, RF-12): artículos con su precio vigente, buscando
 * por nombre o SKU y filtrando por categoría y estado. Solo `admin`.
 *
 * @see RF-05 · RF-12 · M-37
 */
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { AdminShell, AdminTable, CELL, HEAD } from "@/components/admin/AdminShell";
import { Badge, buttonStyles } from "@/components/ui";
import { Pagination } from "@/components/ui/Pagination";
import { LOCALES } from "@/config/locales";
import { getLocale, getTranslator } from "@/i18n/server";
import { parsePage } from "@/lib/account/session";
import { listAdminItems, listCategoryOptions } from "@/lib/admin/shop";
import { adminPath, requireStaff } from "@/lib/admin/staff";

export const instant = false;

const FIELD =
  "border-parchment-300 text-ink-900 min-h-11 w-full rounded-lg border bg-surface px-3 focus:border-navy-700";
const LABEL = "text-heading mb-1 block text-sm font-bold";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("admin.shop.title"), robots: { index: false, follow: false } };
}

export default async function AdminShopPage({ searchParams }: PageProps<"/[locale]/admin/shop">) {
  const [locale, t, query] = await Promise.all([getLocale(), getTranslator(), searchParams]);
  const staff = await requireStaff(locale, "shop", adminPath(locale, "shop"));
  const categories = await listCategoryOptions(locale);
  const q = typeof query.q === "string" ? query.q.slice(0, 64) : "";
  const categoryId =
    typeof query.cat === "string" && categories.some((c) => String(c.id) === query.cat)
      ? Number(query.cat)
      : null;
  const active = query.active === "1" ? true : query.active === "0" ? false : null;
  await connection();
  const result = await listAdminItems(
    locale,
    { q, categoryId, active, page: parsePage(query.page) },
    new Date(),
  );
  const href = (page: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId) params.set("cat", String(categoryId));
    if (active !== null) params.set("active", active ? "1" : "0");
    if (page > 1) params.set("page", String(page));
    const search = params.toString();
    return `${adminPath(locale, "shop")}${search ? `?${search}` : ""}`;
  };

  return (
    <AdminShell
      locale={locale}
      t={t}
      roles={staff.roles}
      current="shop"
      title={t("admin.shop.title")}
    >
      <div className="flex justify-end">
        <Link href={adminPath(locale, "shop/new")} className={buttonStyles({ variant: "primary" })}>
          {t("admin.shop.new")}
        </Link>
      </div>
      <form
        method="get"
        action={adminPath(locale, "shop")}
        role="search"
        aria-label={t("admin.shop.search")}
        className="bg-parchment-50 border-parchment-300 mt-4 grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_auto] lg:items-end"
      >
        <div>
          <label htmlFor="shop-q" className={LABEL}>
            {t("admin.shop.query")}
          </label>
          <input
            id="shop-q"
            name="q"
            type="search"
            defaultValue={q}
            maxLength={64}
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="shop-cat" className={LABEL}>
            {t("admin.shop.category")}
          </label>
          <select id="shop-cat" name="cat" defaultValue={categoryId ?? ""} className={FIELD}>
            <option value="">{t("admin.users.anyStatus")}</option>
            {categories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="shop-active" className={LABEL}>
            {t("admin.users.status")}
          </label>
          <select
            id="shop-active"
            name="active"
            defaultValue={active === null ? "" : active ? "1" : "0"}
            className={FIELD}
          >
            <option value="">{t("admin.users.anyStatus")}</option>
            <option value="1">{t("admin.shop.active")}</option>
            <option value="0">{t("admin.shop.inactive")}</option>
          </select>
        </div>
        <button type="submit" className={buttonStyles({ variant: "secondary" })}>
          {t("admin.users.search")}
        </button>
      </form>

      <p className="text-ink-600 mt-6" aria-live="polite">
        {t("admin.shop.count", { total: result.total })}
      </p>
      {result.rows.length === 0 ? (
        <p className="bg-parchment-50 border-parchment-300 mt-4 max-w-2xl rounded-lg border p-4">
          {t("admin.shop.empty")}
        </p>
      ) : (
        <div className="mt-4">
          <AdminTable
            id="shop-caption"
            caption={t("admin.shop.caption", { page: result.page, count: result.pageCount })}
            minWidth="48rem"
          >
            <thead className={HEAD}>
              <tr>
                <th scope="col" className={CELL}>
                  {t("admin.shop.name")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.shop.category")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.shop.currentPrice")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.users.status")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.news.languages")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-parchment-300 divide-y">
              {result.rows.map((item) => (
                <tr key={item.id}>
                  <th scope="row" className={`${CELL} font-semibold`}>
                    <Link href={adminPath(locale, `shop/${item.id}`)} className="underline">
                      {item.name}
                    </Link>
                    <span className="text-ink-600 block font-mono text-xs font-normal">
                      {item.sku}
                    </span>
                  </th>
                  <td className={CELL}>{item.category}</td>
                  <td className={CELL}>
                    {item.priceAp === null ? (
                      <span className="text-danger font-bold">{t("admin.shop.noPrice")}</span>
                    ) : item.salePriceAp !== null ? (
                      <>
                        <span className="sr-only">{t("shop.price.was")} </span>
                        <s>{t("account.summary.ap", { amount: item.priceAp })}</s>{" "}
                        <span className="sr-only">{t("shop.price.now")} </span>
                        <strong>{t("account.summary.ap", { amount: item.salePriceAp })}</strong>
                      </>
                    ) : (
                      t("account.summary.ap", { amount: item.priceAp })
                    )}
                  </td>
                  <td className={CELL}>
                    <Badge tone={item.isActive ? "success" : "neutral"}>
                      {t(item.isActive ? "admin.shop.active" : "admin.shop.inactive")}
                    </Badge>
                  </td>
                  <td className={CELL}>
                    {t("admin.news.languageCount", {
                      count: item.locales.length,
                      total: LOCALES.length,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <Pagination page={result.page} pageCount={result.pageCount} hrefFor={href} t={t} />
        </div>
      )}
    </AdminShell>
  );
}
