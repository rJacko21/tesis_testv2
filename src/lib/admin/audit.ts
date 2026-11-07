/**
 * Registro de auditoría del panel (RF-12): quién cambió qué, cuándo, desde
 * qué IP y con qué valores antes y después.
 *
 * `recordAudit` recibe la **misma transacción** que hace el cambio: si el
 * cambio se deshace, su registro también, y no puede haber un cambio sin
 * registro. El registro solo se escribe; el panel no tiene forma de editarlo
 * ni de borrarlo.
 *
 * @see RF-12 · OWASP ASVS V7.2 (registro de eventos de seguridad) · M-35
 */
import "server-only";

import { and, count, desc, eq, type SQL } from "drizzle-orm";

import type { db as Db } from "@/db/client";
import { auditLog, users } from "@/db/schema";

/** Transacción de Drizzle, la que recibe `db.transaction(async (tx) => …)`. */
export type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0];

export interface AuditEntry {
  actorId: number;
  /** `user.suspend`, `user.reactivate`, `user.roles`… */
  action: string;
  entity: string;
  entityId: number | null;
  /** Valores antes y después, p. ej. `{ status: { from: "active", to: "suspended" } }`. */
  diff: Record<string, unknown> | null;
  ip: string | null;
}

/** Escribe una entrada dentro de la transacción del cambio. */
export async function recordAudit(tx: Tx, entry: AuditEntry): Promise<void> {
  await tx.insert(auditLog).values({ ...entry, createdAt: new Date() });
}

/** Entradas por página en la vista de auditoría. */
export const AUDIT_PAGE_SIZE = 25;

export interface AuditFilter {
  entity?: string;
  entityId?: number;
  actorId?: number;
  page: number;
}

export interface AuditRow {
  id: number;
  createdAt: Date;
  actorId: number | null;
  actor: string | null;
  action: string;
  entity: string;
  entityId: number | null;
  diff: Record<string, unknown> | null;
  ip: string | null;
}

/** Entradas más recientes primero, con el nombre de quien actuó. */
export async function listAudit(
  filter: AuditFilter,
  pageSize = AUDIT_PAGE_SIZE,
): Promise<{ rows: AuditRow[]; total: number; page: number; pageCount: number }> {
  const { db } = await import("@/db/client");
  const conditions: SQL[] = [];
  if (filter.entity) conditions.push(eq(auditLog.entity, filter.entity));
  if (filter.entityId !== undefined) conditions.push(eq(auditLog.entityId, filter.entityId));
  if (filter.actorId !== undefined) conditions.push(eq(auditLog.actorId, filter.actorId));
  const where = conditions.length ? and(...conditions) : undefined;

  const [[totalRow], rows] = await Promise.all([
    db.select({ total: count() }).from(auditLog).where(where),
    db
      .select({
        id: auditLog.id,
        createdAt: auditLog.createdAt,
        actorId: auditLog.actorId,
        actor: users.displayUsername,
        actorName: users.username,
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        diff: auditLog.diff,
        ip: auditLog.ip,
      })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.actorId))
      .where(where)
      .orderBy(desc(auditLog.id))
      .limit(pageSize)
      .offset((filter.page - 1) * pageSize),
  ]);
  return {
    rows: rows.map(({ actorName, ...row }) => ({ ...row, actor: row.actor ?? actorName })),
    total: totalRow?.total ?? 0,
    page: filter.page,
    pageCount: Math.max(1, Math.ceil((totalRow?.total ?? 0) / pageSize)),
  };
}
