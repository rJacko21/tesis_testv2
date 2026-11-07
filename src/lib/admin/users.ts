/**
 * Cuentas en el panel (RF-12): buscar, ver su historial, suspender,
 * reactivar y cambiar roles.
 *
 * - **Suspender cierra todas las sesiones** de la cuenta en la misma
 *   transacción. Un jugador suspendido deja de estar dentro en su siguiente
 *   página, y no puede volver a entrar (`auth.ts` rechaza crear la sesión).
 * - **Cada cambio deja su entrada de auditoría** en la misma transacción
 *   (`audit.ts`), con el motivo de la suspensión.
 * - **Las reglas de quién puede qué** están en `permissions.ts` y se
 *   comprueban aquí con los roles leídos dentro de la transacción, después
 *   de bloquear la fila de la cuenta (`FOR UPDATE`): dos cambios a la vez
 *   sobre la misma cuenta van en fila.
 *
 * @see RF-12 · M-35
 */
import "server-only";

import { and, count, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";

import { apLedger, characters, roles, servers, sessions, userRoles, users } from "@/db/schema";

import { recordAudit, type Tx } from "./audit";
import { canChangeStatus, canSetRoles, isStaffRole, type StaffRole } from "./permissions";

export const USER_STATUSES = ["active", "suspended", "deleted"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Cuentas por página en la búsqueda. */
export const USERS_PAGE_SIZE = 20;
/** Largo del motivo de una suspensión. */
export const REASON_MIN = 5;
export const REASON_MAX = 500;

export interface UserSearch {
  /** Nombre de cuenta, correo o número de cuenta. */
  q: string;
  status: UserStatus | null;
  page: number;
}

export interface UserSummary {
  id: number;
  username: string;
  email: string;
  status: UserStatus;
  emailVerified: boolean;
  apBalance: number;
  createdAt: Date;
}

/** Escapa `%`, `_` y `\` para usar un texto dentro de `LIKE`. */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Busca cuentas por nombre, correo o número. Sin texto, las más recientes. */
export async function searchUsers(search: UserSearch) {
  const { db } = await import("@/db/client");
  const conditions: SQL[] = [];
  const q = search.q.trim();
  if (q) {
    const pattern = `%${escapeLike(q.toLowerCase())}%`;
    const byText = or(like(users.username, pattern), like(users.email, pattern))!;
    conditions.push(/^\d{1,10}$/.test(q) ? or(eq(users.id, Number(q)), byText)! : byText);
  }
  if (search.status) conditions.push(eq(users.status, search.status));
  const where = conditions.length ? and(...conditions) : undefined;

  const [[totalRow], rows] = await Promise.all([
    db.select({ total: count() }).from(users).where(where),
    db
      .select({
        id: users.id,
        username: sql<string>`coalesce(${users.displayUsername}, ${users.username})`,
        email: users.email,
        status: users.status,
        emailVerified: users.emailVerified,
        apBalance: users.apBalance,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.id))
      .limit(USERS_PAGE_SIZE)
      .offset((search.page - 1) * USERS_PAGE_SIZE),
  ]);
  return {
    rows: rows as UserSummary[],
    total: totalRow?.total ?? 0,
    page: search.page,
    pageCount: Math.max(1, Math.ceil((totalRow?.total ?? 0) / USERS_PAGE_SIZE)),
  };
}

export interface UserDetail extends UserSummary {
  locale: string;
  roles: string[];
  openSessions: number;
  characters: { id: number; name: string; server: string; landLevel: number }[];
  ledger: { id: number; createdAt: Date; delta: number; reason: string; balanceAfter: number }[];
}

/** Ficha de una cuenta con sus roles, sesiones, personajes y últimos movimientos de AP. */
export async function getUserDetail(userId: number): Promise<UserDetail | null> {
  const { db } = await import("@/db/client");
  const [user] = await db
    .select({
      id: users.id,
      username: sql<string>`coalesce(${users.displayUsername}, ${users.username})`,
      email: users.email,
      status: users.status,
      emailVerified: users.emailVerified,
      apBalance: users.apBalance,
      createdAt: users.createdAt,
      locale: users.locale,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) return null;

  const [roleRows, [openRow], characterRows, ledger] = await Promise.all([
    db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, userId)),
    db
      .select({ total: count() })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), sql`${sessions.expiresAt} > now(3)`)),
    db
      .select({
        id: characters.id,
        name: characters.name,
        server: servers.name,
        landLevel: characters.landLevel,
      })
      .from(characters)
      .innerJoin(servers, eq(servers.id, characters.serverId))
      .where(eq(characters.userId, userId))
      .orderBy(characters.name),
    db
      .select({
        id: apLedger.id,
        createdAt: apLedger.createdAt,
        delta: apLedger.delta,
        reason: apLedger.reason,
        balanceAfter: apLedger.balanceAfter,
      })
      .from(apLedger)
      .where(eq(apLedger.userId, userId))
      .orderBy(desc(apLedger.id))
      .limit(10),
  ]);
  return {
    ...(user as UserSummary & { locale: string }),
    roles: roleRows.map((row) => row.code).sort(),
    openSessions: openRow?.total ?? 0,
    characters: characterRows,
    ledger,
  };
}

export type AdminProblem = "forbidden" | "notFound" | "unchanged" | "reason";
export type AdminResult = { ok: true } | { ok: false; problem: AdminProblem };

class Rejected extends Error {
  constructor(readonly problem: AdminProblem) {
    super(problem);
  }
}

/** Ejecuta un cambio en una transacción y convierte los rechazos en resultado. */
async function change(run: (tx: Tx) => Promise<void>): Promise<AdminResult> {
  const { db } = await import("@/db/client");
  try {
    await db.transaction(run);
    return { ok: true };
  } catch (error) {
    if (error instanceof Rejected) return { ok: false, problem: error.problem };
    throw error;
  }
}

/** Bloquea la fila de la cuenta y lee su estado y roles. */
async function lockTarget(tx: Tx, userId: number) {
  const [row] = await tx
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .for("update");
  if (!row) throw new Rejected("notFound");
  const roleRows = await tx
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));
  return { status: row.status, roles: roleRows.map((r) => r.code).sort() };
}

/** Roles de quien actúa, leídos dentro de la transacción. */
async function actorRoles(tx: Tx, actorId: number) {
  const rows = await tx
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, actorId));
  return rows.map((r) => r.code);
}

export interface StatusChange {
  actorId: number;
  userId: number;
  status: "active" | "suspended";
  reason: string;
  ip: string | null;
}

/** Suspende o reactiva una cuenta. Suspender exige motivo y cierra sus sesiones. */
export async function setUserStatus(input: StatusChange): Promise<AdminResult> {
  const reason = input.reason.trim();
  if (input.status === "suspended" && (reason.length < REASON_MIN || reason.length > REASON_MAX)) {
    return { ok: false, problem: "reason" };
  }
  return change(async (tx) => {
    const target = await lockTarget(tx, input.userId);
    const actor = { id: input.actorId, roles: await actorRoles(tx, input.actorId) };
    if (!canChangeStatus(actor, { id: input.userId, roles: target.roles })) {
      throw new Rejected("forbidden");
    }
    // Una cuenta borrada (RGPD) no se reactiva desde aquí: sus datos ya no están.
    if (target.status === "deleted") throw new Rejected("forbidden");
    if (target.status === input.status) throw new Rejected("unchanged");

    await tx.update(users).set({ status: input.status }).where(eq(users.id, input.userId));
    let closedSessions = 0;
    if (input.status === "suspended") {
      const [result] = await tx.delete(sessions).where(eq(sessions.userId, input.userId));
      closedSessions = result.affectedRows;
    }
    await recordAudit(tx, {
      actorId: input.actorId,
      action: input.status === "suspended" ? "user.suspend" : "user.reactivate",
      entity: "user",
      entityId: input.userId,
      diff: {
        status: { from: target.status, to: input.status },
        ...(reason ? { reason: reason.slice(0, REASON_MAX) } : {}),
        ...(closedSessions ? { closedSessions } : {}),
      },
      ip: input.ip,
    });
  });
}

export interface RolesChange {
  actorId: number;
  userId: number;
  roles: readonly string[];
  ip: string | null;
}

/** Deja a la cuenta con exactamente estos roles del equipo. */
export async function setUserRoles(input: RolesChange): Promise<AdminResult> {
  const next = [...new Set(input.roles.filter(isStaffRole))].sort() as StaffRole[];
  return change(async (tx) => {
    const target = await lockTarget(tx, input.userId);
    const actor = { id: input.actorId, roles: await actorRoles(tx, input.actorId) };
    if (!canSetRoles(actor, input.userId, next)) throw new Rejected("forbidden");
    if (target.status === "deleted") throw new Rejected("forbidden");
    const current = target.roles.filter(isStaffRole);
    if (current.join() === next.join()) throw new Rejected("unchanged");

    await tx.delete(userRoles).where(eq(userRoles.userId, input.userId));
    if (next.length) {
      const ids = await tx.select({ id: roles.id }).from(roles).where(inArray(roles.code, next));
      await tx
        .insert(userRoles)
        .values(ids.map(({ id }) => ({ userId: input.userId, roleId: id })));
    }
    await recordAudit(tx, {
      actorId: input.actorId,
      action: "user.roles",
      entity: "user",
      entityId: input.userId,
      diff: { roles: { from: current, to: next } },
      ip: input.ip,
    });
  });
}
