"use server";
/**
 * Server Actions del panel de administración (RF-12).
 *
 * Como la cesta (M-32), son formularios sin JavaScript de cliente que
 * terminan en una redirección con el resultado en la URL (patrón PRG):
 * recargar la página no repite el cambio.
 *
 * Cada acción vuelve a comprobar en el servidor la sesión y los roles de
 * quien la envía, leídos de la base de datos en ese momento: el id de la
 * cuenta afectada llega del formulario y no basta con haber visto el botón
 * (OWASP ASVS V4.1.1 y V4.2.1). Next.js comprueba el origen de cada Server
 * Action (CSRF).
 *
 * @see RF-12 · M-35
 */
import { redirect } from "next/navigation";

import { formLocale, text } from "@/lib/auth/action-helpers";
import { clientIp } from "@/lib/auth/request";

import { adminPath, requireStaff } from "./staff";
import { setUserRoles, setUserStatus } from "./users";

/** Número de cuenta del formulario, o `null`. */
const parseId = (value: string) => (/^[1-9]\d{0,9}$/.test(value) ? Number(value) : null);

/** Suspende o reactiva una cuenta. */
export async function setUserStatusAction(form: FormData): Promise<void> {
  const { locale } = await formLocale(form);
  const userId = parseId(text(form, "userId"));
  if (userId === null) redirect(adminPath(locale, "users"));
  const back = adminPath(locale, `users/${userId}`);
  const staff = await requireStaff(locale, "users", back);

  const status = text(form, "status") === "active" ? "active" : "suspended";
  const result = await setUserStatus({
    actorId: staff.id,
    userId,
    status,
    reason: text(form, "reason"),
    ip: await clientIp(),
  });
  redirect(`${back}?${result.ok ? `done=${status}` : `error=${result.problem}`}`);
}

/** Cambia los roles del equipo de una cuenta (solo `admin`). */
export async function setUserRolesAction(form: FormData): Promise<void> {
  const { locale } = await formLocale(form);
  const userId = parseId(text(form, "userId"));
  if (userId === null) redirect(adminPath(locale, "users"));
  const back = adminPath(locale, `users/${userId}`);
  const staff = await requireStaff(locale, "roles", back);

  const roles = form.getAll("roles").filter((value): value is string => typeof value === "string");
  const result = await setUserRoles({ actorId: staff.id, userId, roles, ip: await clientIp() });
  redirect(`${back}?${result.ok ? "done=roles" : `error=${result.problem}`}`);
}
