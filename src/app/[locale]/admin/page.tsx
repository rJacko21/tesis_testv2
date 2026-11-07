/**
 * Portada del panel de administración (RF-12): a qué zonas da acceso cada
 * rol de quien entra.
 *
 * Solo para cuentas del equipo; para cualquier otra es la página de error
 * (`requireStaff`). Nunca se indexa.
 *
 * @see RF-12 · M-35
 */
import type { Metadata } from "next";
import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import { getLocale, getTranslator } from "@/i18n/server";
import { type AdminArea, areasFor, isStaffRole } from "@/lib/admin/permissions";
import { adminPath, requireStaff } from "@/lib/admin/staff";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("admin.title"), robots: { index: false, follow: false } };
}

export default async function AdminPage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  const staff = await requireStaff(locale, null, adminPath(locale));
  const areas = areasFor(staff.roles).filter((area) => area !== "roles");
  const roleNames = staff.roles.filter(isStaffRole).map((role) => t(`admin.roles.${role}`));

  return (
    <AdminShell
      locale={locale}
      t={t}
      roles={staff.roles}
      current={null}
      title={t("admin.home.title")}
      intro={t("admin.home.intro", { name: staff.name, roles: roleNames.join(", ") })}
    >
      {areas.length === 0 ? (
        <p className="bg-parchment-50 border-parchment-300 max-w-2xl rounded-lg border p-4">
          {t("admin.home.nothing")}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {areas.map((area) => (
            <li key={area} className="border-parchment-300 rounded-lg border bg-white p-5">
              <h2 className="text-navy-900 text-xl font-bold">
                <Link href={adminPath(locale, area)} className="underline">
                  {t(`admin.nav.${area as Exclude<AdminArea, "roles">}`)}
                </Link>
              </h2>
              <p className="text-ink-600 mt-1">
                {t(`admin.home.${area as Exclude<AdminArea, "roles">}`)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
