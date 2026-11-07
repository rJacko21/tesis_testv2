/**
 * Panel › Auditoría (RF-12): cada cambio hecho desde el panel, del más
 * reciente al más antiguo, con quién lo hizo, sobre qué, los valores antes
 * y después y la IP. Solo `admin`. Es de solo lectura.
 *
 * `?user={id}` muestra solo los cambios sobre esa cuenta.
 *
 * @see RF-12 · M-35
 */
import type { Metadata } from "next";
import Link from "next/link";

import { AdminShell, AdminTable, CELL, HEAD } from "@/components/admin/AdminShell";
import { actionLabel } from "@/components/admin/status";
import { DateTime } from "@/components/account/DateTime";
import { Pagination } from "@/components/ui/Pagination";
import { getLocale, getTranslator } from "@/i18n/server";
import { parsePage } from "@/lib/account/session";
import { listAudit } from "@/lib/admin/audit";
import { describeDiff } from "@/lib/admin/diff";
import { adminPath, requireStaff } from "@/lib/admin/staff";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("admin.audit.title"), robots: { index: false, follow: false } };
}

export default async function AdminAuditPage({ searchParams }: PageProps<"/[locale]/admin/audit">) {
  const [locale, t, query] = await Promise.all([getLocale(), getTranslator(), searchParams]);
  const staff = await requireStaff(locale, "audit", adminPath(locale, "audit"));
  const userId =
    typeof query.user === "string" && /^[1-9]\d{0,9}$/.test(query.user) ? Number(query.user) : null;
  const result = await listAudit({
    ...(userId ? { entity: "user", entityId: userId } : {}),
    page: parsePage(query.page),
  });
  const href = (page: number) => {
    const params = new URLSearchParams();
    if (userId) params.set("user", String(userId));
    if (page > 1) params.set("page", String(page));
    const search = params.toString();
    return `${adminPath(locale, "audit")}${search ? `?${search}` : ""}`;
  };

  return (
    <AdminShell
      locale={locale}
      t={t}
      roles={staff.roles}
      current="audit"
      title={t("admin.audit.title")}
      intro={t("admin.audit.intro")}
    >
      {userId ? (
        <p className="mb-4">
          {t("admin.audit.filtered", { id: userId })}{" "}
          <Link href={adminPath(locale, "audit")} className="font-semibold underline">
            {t("admin.audit.showAll")}
          </Link>
        </p>
      ) : null}

      {result.rows.length === 0 ? (
        <p className="bg-parchment-50 border-parchment-300 max-w-2xl rounded-lg border p-4">
          {t("admin.audit.empty")}
        </p>
      ) : (
        <>
          <AdminTable
            id="audit-caption"
            caption={t("admin.audit.caption", { page: result.page, count: result.pageCount })}
            minWidth="56rem"
          >
            <thead className={HEAD}>
              <tr>
                <th scope="col" className={CELL}>
                  {t("admin.audit.date")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.audit.actor")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.audit.action")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.audit.target")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.audit.changes")}
                </th>
                <th scope="col" className={CELL}>
                  {t("admin.audit.ip")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-parchment-300 divide-y">
              {result.rows.map((entry) => (
                <tr key={entry.id}>
                  <td className={CELL}>
                    <DateTime locale={locale} date={entry.createdAt} />
                  </td>
                  <td className={CELL}>
                    {entry.actorId && entry.actor ? (
                      <Link
                        href={adminPath(locale, `users/${entry.actorId}`)}
                        className="underline"
                      >
                        {entry.actor}
                      </Link>
                    ) : entry.ip === "cli" ? (
                      t("admin.audit.cli")
                    ) : (
                      t("admin.audit.unknownActor")
                    )}
                  </td>
                  <td className={CELL}>{actionLabel(t, entry.action)}</td>
                  <td className={CELL}>
                    {entry.entity === "user" && entry.entityId ? (
                      <Link
                        href={adminPath(locale, `users/${entry.entityId}`)}
                        className="underline"
                      >
                        {t("admin.audit.userTarget", { id: entry.entityId })}
                      </Link>
                    ) : (
                      `${entry.entity} ${entry.entityId ?? ""}`
                    )}
                  </td>
                  <td className={`${CELL} font-mono break-words`}>
                    <ul>
                      {describeDiff(entry.diff).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </td>
                  <td className={`${CELL} font-mono`}>{entry.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <Pagination page={result.page} pageCount={result.pageCount} hrefFor={href} t={t} />
        </>
      )}
    </AdminShell>
  );
}
