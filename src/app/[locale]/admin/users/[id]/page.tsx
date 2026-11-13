/**
 * Panel › Ficha de una cuenta (RF-12): datos, roles, estado, personajes,
 * últimos movimientos de AP y su historial en la auditoría.
 *
 * - **Suspender** pide el motivo, que queda en la auditoría, y cierra todas
 *   las sesiones de la cuenta.
 * - **Roles:** el formulario solo aparece a quien puede cambiarlos (`admin`).
 *   La acción lo vuelve a comprobar en el servidor.
 *
 * @see RF-12 · M-35
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNotice, AdminShell, AdminTable, CELL, HEAD } from "@/components/admin/AdminShell";
import { actionLabel, STATUS_TONE } from "@/components/admin/status";
import { DateTime } from "@/components/account/DateTime";
import { Badge, buttonStyles } from "@/components/ui";
import { getLocale, getTranslator } from "@/i18n/server";
import { setUserRolesAction, setUserStatusAction } from "@/lib/admin/actions";
import { listAudit } from "@/lib/admin/audit";
import { describeDiff } from "@/lib/admin/diff";
import { can, canChangeStatus, STAFF_ROLES } from "@/lib/admin/permissions";
import { adminPath, requireStaff } from "@/lib/admin/staff";
import { getUserDetail, REASON_MAX, REASON_MIN, type AdminProblem } from "@/lib/admin/users";

export const instant = false;

const DONE = ["suspended", "active", "roles"] as const;
const ERRORS: readonly AdminProblem[] = ["forbidden", "notFound", "unchanged", "reason"];
const LABEL = "text-heading mb-1 block font-bold";
const SECTION = "border-parchment-300 rounded-lg border bg-surface p-5";

const parseId = (value: string) => (/^[1-9]\d{0,9}$/.test(value) ? Number(value) : null);

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/users/[id]">): Promise<Metadata> {
  const [t, { id }] = await Promise.all([getTranslator(), params]);
  return { title: t("admin.audit.userTarget", { id }), robots: { index: false, follow: false } };
}

export default async function AdminUserPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/users/[id]">) {
  const [locale, t, { id: rawId }, query] = await Promise.all([
    getLocale(),
    getTranslator(),
    params,
    searchParams,
  ]);
  const id = parseId(rawId);
  if (id === null) notFound();
  const staff = await requireStaff(locale, "users", adminPath(locale, `users/${id}`));
  const [user, history] = await Promise.all([
    getUserDetail(id),
    can(staff.roles, "audit") ? listAudit({ entity: "user", entityId: id, page: 1 }, 10) : null,
  ]);
  if (!user) notFound();

  const done = DONE.find((value) => value === query.done);
  const error = ERRORS.find((value) => value === query.error);
  const mayChangeStatus =
    user.status !== "deleted" && canChangeStatus(staff, { id: user.id, roles: user.roles });
  const mayChangeRoles = can(staff.roles, "roles") && user.status !== "deleted";

  return (
    <AdminShell
      locale={locale}
      t={t}
      roles={staff.roles}
      current="users"
      title={t("admin.user.title", { name: user.username })}
      intro={
        <Link href={adminPath(locale, "users")} className="text-base font-semibold underline">
          {t("admin.user.back")}
        </Link>
      }
    >
      {error ? (
        <AdminNotice tone="error">
          {t(`admin.user.errors.${error}`, { min: REASON_MIN, max: REASON_MAX })}
        </AdminNotice>
      ) : done ? (
        <AdminNotice tone="done">{t(`admin.user.done.${done}`)}</AdminNotice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="user-data" className={SECTION}>
          <h2 id="user-data" className="text-heading text-xl font-bold">
            {t("admin.user.data")}
          </h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="font-bold">{t("admin.users.id")}</dt>
              <dd>{user.id}</dd>
            </div>
            <div>
              <dt className="font-bold">{t("admin.users.status")}</dt>
              <dd>
                <Badge tone={STATUS_TONE[user.status]}>{t(`admin.status.${user.status}`)}</Badge>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-bold">{t("admin.users.email")}</dt>
              <dd className="break-all">
                {user.email} ·{" "}
                {user.emailVerified ? t("admin.users.verified") : t("admin.users.unverified")}
              </dd>
            </div>
            <div>
              <dt className="font-bold">{t("admin.user.locale")}</dt>
              <dd>{user.locale}</dd>
            </div>
            <div>
              <dt className="font-bold">{t("admin.users.created")}</dt>
              <dd>
                <DateTime locale={locale} date={user.createdAt} />
              </dd>
            </div>
            <div>
              <dt className="font-bold">{t("admin.users.balance")}</dt>
              <dd>{t("account.summary.ap", { amount: user.apBalance })}</dd>
            </div>
            <div>
              <dt className="font-bold">{t("admin.user.sessions")}</dt>
              <dd>{user.openSessions}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="user-status" className={SECTION}>
          <h2 id="user-status" className="text-heading text-xl font-bold">
            {t("admin.user.statusTitle")}
          </h2>
          {user.status === "deleted" ? (
            <p className="mt-3">{t("admin.user.deletedHint")}</p>
          ) : !mayChangeStatus ? (
            <p className="mt-3">{t("admin.user.statusLocked")}</p>
          ) : user.status === "active" ? (
            <form action={setUserStatusAction} className="mt-3 grid gap-3">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="status" value="suspended" />
              <p>{t("admin.user.suspendHint")}</p>
              <div>
                <label htmlFor="suspend-reason" className={LABEL}>
                  {t("admin.user.reason")}
                </label>
                <textarea
                  id="suspend-reason"
                  name="reason"
                  required
                  minLength={REASON_MIN}
                  maxLength={REASON_MAX}
                  rows={3}
                  aria-describedby="suspend-reason-hint"
                  className="border-parchment-300 focus:border-navy-700 bg-surface w-full rounded-lg border p-3"
                />
                <p id="suspend-reason-hint" className="text-ink-600 mt-1 text-sm">
                  {t("admin.user.reasonHint", { min: REASON_MIN, max: REASON_MAX })}
                </p>
              </div>
              <button
                type="submit"
                className={buttonStyles({ variant: "danger", className: "w-fit" })}
              >
                {t("admin.user.suspend")}
              </button>
            </form>
          ) : (
            <form action={setUserStatusAction} className="mt-3 grid gap-3">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="status" value="active" />
              <p>{t("admin.user.reactivateHint")}</p>
              <button
                type="submit"
                className={buttonStyles({ variant: "secondary", className: "w-fit" })}
              >
                {t("admin.user.reactivate")}
              </button>
            </form>
          )}
        </section>

        <section aria-labelledby="user-roles" className={SECTION}>
          <h2 id="user-roles" className="text-heading text-xl font-bold">
            {t("admin.user.rolesTitle")}
          </h2>
          {mayChangeRoles ? (
            <form action={setUserRolesAction} className="mt-3">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="userId" value={user.id} />
              <fieldset>
                <legend className="text-ink-600">{t("admin.user.rolesHint")}</legend>
                <ul className="mt-3 grid gap-2">
                  {STAFF_ROLES.map((role) => (
                    <li key={role}>
                      <label className="inline-flex min-h-11 items-center gap-3">
                        <input
                          type="checkbox"
                          name="roles"
                          value={role}
                          defaultChecked={user.roles.includes(role)}
                          className="size-5"
                        />
                        {t(`admin.roles.${role}`)}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <button
                type="submit"
                className={buttonStyles({ variant: "secondary", className: "mt-3" })}
              >
                {t("admin.user.saveRoles")}
              </button>
            </form>
          ) : (
            <p className="mt-3">
              {user.roles.length
                ? user.roles.map((role) => t(`admin.roles.${role as "admin"}`)).join(", ")
                : t("admin.roles.none")}
            </p>
          )}
        </section>

        <section aria-labelledby="user-characters" className={SECTION}>
          <h2 id="user-characters" className="text-heading text-xl font-bold">
            {t("admin.user.characters")}
          </h2>
          {user.characters.length === 0 ? (
            <p className="mt-3">{t("admin.user.noCharacters")}</p>
          ) : (
            <ul className="mt-3 grid gap-1">
              {user.characters.map((character) => (
                <li key={character.id}>
                  {t("admin.user.character", {
                    name: character.name,
                    server: character.server,
                    level: character.landLevel,
                  })}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="user-ledger" className="mt-8">
        <h2 id="user-ledger" className="text-heading text-2xl font-bold">
          {t("admin.user.ledger")}
        </h2>
        {user.ledger.length === 0 ? (
          <p className="mt-3">{t("admin.user.noLedger")}</p>
        ) : (
          <div className="mt-3">
            <AdminTable id="ledger-caption" caption={t("admin.user.ledger")} minWidth="32rem">
              <thead className={HEAD}>
                <tr>
                  <th scope="col" className={CELL}>
                    {t("admin.audit.date")}
                  </th>
                  <th scope="col" className={CELL}>
                    {t("admin.user.reasonCol")}
                  </th>
                  <th scope="col" className={CELL}>
                    {t("admin.user.delta")}
                  </th>
                  <th scope="col" className={CELL}>
                    {t("admin.users.balance")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-parchment-300 divide-y">
                {user.ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td className={CELL}>
                      <DateTime locale={locale} date={entry.createdAt} />
                    </td>
                    <td className={CELL}>
                      {t(`admin.user.ledgerReason.${entry.reason as "admin"}`)}
                    </td>
                    <td className={`${CELL} font-semibold`}>
                      {entry.delta > 0 ? "+" : ""}
                      {t("account.summary.ap", { amount: entry.delta })}
                    </td>
                    <td className={CELL}>
                      {t("account.summary.ap", { amount: entry.balanceAfter })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          </div>
        )}
      </section>

      {history ? (
        <section aria-labelledby="user-history" className="mt-8">
          <h2 id="user-history" className="text-heading text-2xl font-bold">
            {t("admin.user.history")}
          </h2>
          {history.rows.length === 0 ? (
            <p className="mt-3">{t("admin.user.noHistory")}</p>
          ) : (
            <>
              <ol className="mt-3 grid gap-3">
                {history.rows.map((entry) => (
                  <li
                    key={entry.id}
                    className="border-parchment-300 bg-surface rounded-lg border p-4"
                  >
                    <p className="font-semibold">
                      {actionLabel(t, entry.action)} ·{" "}
                      {entry.actor ??
                        t(entry.ip === "cli" ? "admin.audit.cli" : "admin.audit.unknownActor")}
                    </p>
                    <p className="text-ink-600 text-sm">
                      <DateTime locale={locale} date={entry.createdAt} />
                    </p>
                    <ul className="mt-1 font-mono text-sm break-words">
                      {describeDiff(entry.diff).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
              {history.total > history.rows.length ? (
                <Link
                  href={`${adminPath(locale, "audit")}?user=${user.id}`}
                  className="mt-3 inline-block font-semibold underline"
                >
                  {t("admin.user.seeAudit")}
                </Link>
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </AdminShell>
  );
}
