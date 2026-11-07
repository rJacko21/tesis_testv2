/**
 * Acceso al panel de administración (RF-12).
 *
 * Los roles se leen de la base de datos en cada petición, no de la cookie
 * de sesión: quitar un rol surte efecto en la siguiente página que se abra.
 *
 * Quien no es del equipo, o no tiene el rol de esa zona, recibe la página
 * de error y no un «acceso denegado»: así el panel no revela que existe ni
 * qué zonas tiene (OWASP ASVS V4.1.5).
 *
 * @see RF-12 · M-35
 */
import "server-only";

import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import type { Locale } from "@/config/locales";
import { roles, userRoles } from "@/db/schema";
import { getSession } from "@/lib/auth/session";

import { type AdminArea, can, isStaff } from "./permissions";

/** Roles de una cuenta, ordenados. */
export async function getRoles(userId: number): Promise<string[]> {
  const { db } = await import("@/db/client");
  const rows = await db
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));
  return rows.map((row) => row.code).sort();
}

export interface Staff {
  id: number;
  name: string;
  roles: string[];
}

/** Cuenta del equipo de la sesión, o `null` si no hay sesión o no es del equipo. */
export async function currentStaff(): Promise<Staff | null> {
  const session = await getSession();
  if (!session) return null;
  const id = Number(session.user.id);
  const staffRoles = await getRoles(id);
  if (!isStaff(staffRoles)) return null;
  const display = (session.user as { displayUsername?: string | null }).displayUsername;
  return { id, name: display ?? session.user.name, roles: staffRoles };
}

/**
 * Exige una cuenta del equipo con acceso a la zona (`null` = la portada del
 * panel). Sin sesión lleva a iniciar sesión y vuelve a `back`.
 */
export async function requireStaff(
  locale: Locale,
  area: AdminArea | null,
  back: string,
): Promise<Staff> {
  const session = await getSession();
  if (!session) redirect(`/${locale}/sign-in?next=${encodeURIComponent(back)}`);
  const staff = await currentStaff();
  if (!staff || (area && !can(staff.roles, area))) notFound();
  return staff;
}

/** Ruta del panel: `/es/admin`, `/es/admin/users/12`… */
export const adminPath = (locale: Locale, path = "") => `/${locale}/admin${path ? `/${path}` : ""}`;
