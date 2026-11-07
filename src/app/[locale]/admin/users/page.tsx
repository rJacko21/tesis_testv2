/**
 * Panel › Cuentas (RF-12): buscar por nombre, correo o número y filtrar por
 * estado. Es un formulario GET, como el ranking: la búsqueda queda en la URL.
 *
 * @see RF-12 · M-35
 */
import type { Metadata } from "next";
import Link from "next/link";

import { AdminShell, AdminTable, CELL, HEAD } from "@/components/admin/AdminShell";
import { DateTime } from "@/components/account/DateTime";
import { Badge, buttonStyles } from "@/components/ui";
import { Pagination } from "@/components/ui/Pagination";
import { getLocale, getTranslator } from "@/i18n/server";
import { parsePage } from "@/lib/account/session";
import { adminPath, requireStaff } from "@/lib/admin/staff";
import { searchUsers, USER_STATUSES, type UserStatus } from "@/lib/admin/users";

import { STATUS_TONE } from "@/components/admin/status";

export const instant = false;

const FIELD =
  "border-parchment-300 text-ink-900 min-h-11 w-full rounded-lg border bg-white px-3 focus:border-navy-700";
const LABEL = "text-navy-900 mb-1 block text-sm font-bold";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("admin.users.title"), robots: { index: false, follow: false } };
}

export default async function AdminUsersPage({ searchParams }: PageProps<"/[locale]/admin/users">) {
  const [locale, t, query] = await Promise.all([getLocale(), getTranslator(), searchParams]);
  const staff = await requireStaff(locale, "users", adminPath(locale, "users"));
  const q = typeof query.q === "string" ? query.q.slice(0, 64) : "";
  const status = USER_STATUSES.includes(query.status as UserStatus)
    ? (query.status as UserStatus)
    : null;
  const result = await searchUsers({ q, status, page: parsePage(query.page) });

  const href = (page: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (page > 1) params.set("page", String(page));
    const search = params.toString();
    return `${adminPath(locale, "users")}${search ? `?${search}` : ""}`;
  };

  return (
    <AdminShell
      locale={locale}
      t={t}
      roles={staff.roles}
      current="users"
      title={t("admin.users.title")}
    >
      <form
        method="get"
        action={adminPath(locale, "users")}
        role="search"
        aria-label={t("admin.users.search")}
        className="bg-parchment-50 border-parchment-300 grid gap-4 rounded-lg border p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end"
      >
        <div>
          <label htmlFor="admin-q" className={LABEL}>
            {t("admin.users.query")}
          </label>
          <input
            id="admin-q"
            name="q"
            type="search"
            defaultValue={q}
            maxLength={64}
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="admin-status" className={LABEL}>
            {t("admin.users.status")}
          </label>
          <select id="admin-status" name="status" defaultValue={status ?? ""} className={FIELD}>
            <option value="">{t("admin.users.anyStatus")}</option>
            {USER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`admin.status.${value}`)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={buttonStyles({ variant: "secondary" })}>
          {t("admin.users.search")}
        </button>
      </form>

      <p className="text-ink-600 mt-6" aria-live="polite">
        {t("admin.users.count", { total: result.total })}
      </p>

      {result.rows.length === 0 ? (
        <p className="bg-parchment-50 border-parchment-300 mt-4 max-w-2xl rounded-lg border p-4">
          {t("admin.users.empty")}
        </p>
      ) : (
        <div className="mt-4">
          <AdminTable
            id="users-caption"
            caption={t("admin.users.caption", { page: result.page, count: result.pageCount })}
            minWidth="44rem"
          >
            <thead className={HEAD}>
              <tr>
                <th scope="col" className={CELL}>
                  {t("admin.users.id")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.users.name")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.users.email")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.users.status")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.users.balance")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.users.created")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-parchment-300 divide-y">
              {result.rows.map((user) => (
                <tr key={user.id}>
                  <td className={CELL}>{user.id}</td>
                  <th scope="row" className={`${CELL} font-semibold`}>
                    <Link href={adminPath(locale, `users/${user.id}`)} className="underline">
                      {user.username}
                    </Link>
                  </th>
                  <td className={`${CELL} break-all`}>
                    {user.email}
                    {user.emailVerified ? null : (
                      <span className="text-danger-700 block text-xs font-bold">
                        {t("admin.users.unverified")}
                      </span>
                    )}
                  </td>
                  <td className={CELL}>
                    <Badge tone={STATUS_TONE[user.status]}>
                      {t(`admin.status.${user.status}`)}
                    </Badge>
                  </td>
                  <td className={CELL}>{t("account.summary.ap", { amount: user.apBalance })}</td>
                  <td className={CELL}>
                    <DateTime locale={locale} date={user.createdAt} />
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
