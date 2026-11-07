/**
 * Quién puede hacer qué en el panel de administración (RF-12).
 *
 * Los roles son los de la tabla `roles` (`admin`, `editor`, `support`). Cada
 * zona del panel dice qué roles la abren:
 * - **admin:** todo, incluidos los roles de otras cuentas y la auditoría.
 * - **editor:** contenido (noticias y promociones).
 * - **support:** atender a los jugadores (buscar cuentas, ver su historial,
 *   suspenderlas o reactivarlas).
 *
 * Es una tabla pura, sin base de datos, para poder probarla y para que la
 * página y la Server Action consulten la misma regla. Cada acción vuelve a
 * comprobarla en el servidor: ocultar un botón no protege nada
 * (OWASP ASVS V4.1.1).
 *
 * @see RF-12 · M-35
 */
export const STAFF_ROLES = ["admin", "editor", "support"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Zonas del panel. Las de contenido y tienda llegan en las siguientes partes de T-23. */
export const ADMIN_AREAS = ["users", "roles", "audit"] as const;
export type AdminArea = (typeof ADMIN_AREAS)[number];

const ACCESS: Record<AdminArea, readonly StaffRole[]> = {
  users: ["admin", "support"],
  roles: ["admin"],
  audit: ["admin"],
};

export const isStaffRole = (value: string): value is StaffRole =>
  (STAFF_ROLES as readonly string[]).includes(value);

/** ¿Alguno de estos roles abre esa zona? */
export function can(roles: readonly string[], area: AdminArea): boolean {
  return ACCESS[area].some((role) => roles.includes(role));
}

/** Zonas que puede abrir quien tiene estos roles, en el orden del menú. */
export function areasFor(roles: readonly string[]): AdminArea[] {
  return ADMIN_AREAS.filter((area) => can(roles, area));
}

/** ¿Tiene algún rol del equipo? Sin ninguno, el panel no existe para él. */
export const isStaff = (roles: readonly string[]) => roles.some(isStaffRole);

/**
 * ¿Puede `actor` suspender o reactivar a `target`?
 *
 * - Nadie se suspende a sí mismo (se quedaría fuera sin querer).
 * - Una cuenta del equipo solo la suspende un `admin`: así un rol de
 *   soporte comprometido no puede dejar fuera a los administradores.
 */
export function canChangeStatus(
  actor: { id: number; roles: readonly string[] },
  target: { id: number; roles: readonly string[] },
): boolean {
  if (actor.id === target.id || !can(actor.roles, "users")) return false;
  return !isStaff(target.roles) || actor.roles.includes("admin");
}

/**
 * ¿Puede `actor` dejar a `target` con estos roles?
 *
 * Solo un `admin`, y no puede quitarse a sí mismo el rol `admin`: siempre
 * queda al menos quien hizo el cambio para deshacerlo.
 */
export function canSetRoles(
  actor: { id: number; roles: readonly string[] },
  targetId: number,
  next: readonly string[],
): boolean {
  if (!can(actor.roles, "roles")) return false;
  return actor.id !== targetId || next.includes("admin");
}
