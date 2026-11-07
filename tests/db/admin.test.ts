/**
 * Panel de administración contra MySQL (`admin/users.ts`, `admin/audit.ts`):
 * suspender cierra las sesiones, cada cambio deja su auditoría en la misma
 * transacción y las reglas de roles se cumplen con los datos reales.
 */
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { auditLog, roles, sessions, userRoles, users } from "@/db/schema";
import { listAudit } from "@/lib/admin/audit";
import {
  escapeLike,
  getUserDetail,
  searchUsers,
  setUserRoles,
  setUserStatus,
} from "@/lib/admin/users";

const run = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
let sequence = 0;
const created: number[] = [];

/** Cuenta con estos roles y una sesión abierta. */
async function account(roleCodes: string[] = []) {
  const name = `a${run}${++sequence}`.slice(0, 32);
  const [row] = await db
    .insert(users)
    .values({ username: name, name, email: `${name}@example.test` });
  const id = row.insertId;
  created.push(id);
  if (roleCodes.length) {
    const ids = await db.select({ id: roles.id }).from(roles).where(inArray(roles.code, roleCodes));
    await db.insert(userRoles).values(ids.map((r) => ({ userId: id, roleId: r.id })));
  }
  await db.insert(sessions).values({
    token: `tok-${name}`,
    userId: id,
    expiresAt: new Date(Date.now() + 86_400_000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { id, name };
}

const statusOf = async (id: number) =>
  (await db.select({ s: users.status }).from(users).where(eq(users.id, id)))[0]?.s;
const sessionsOf = async (id: number) =>
  (await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, id))).length;
const auditOf = (id: number) =>
  db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.entity, "user"), eq(auditLog.entityId, id)));

afterAll(async () => {
  await db.delete(auditLog).where(inArray(auditLog.entityId, created));
  await db.delete(users).where(inArray(users.id, created));
});

describe("suspender y reactivar (RF-12)", () => {
  it("soporte suspende a un jugador: estado, sesiones cerradas y auditoría con el motivo", async () => {
    const support = await account(["support"]);
    const player = await account();
    const result = await setUserStatus({
      actorId: support.id,
      userId: player.id,
      status: "suspended",
      reason: "Venta de cuentas",
      ip: "10.0.0.1",
    });
    expect(result).toEqual({ ok: true });
    expect(await statusOf(player.id)).toBe("suspended");
    expect(await sessionsOf(player.id)).toBe(0);

    const [entry] = await auditOf(player.id);
    expect(entry).toMatchObject({
      actorId: support.id,
      action: "user.suspend",
      ip: "10.0.0.1",
      diff: {
        status: { from: "active", to: "suspended" },
        reason: "Venta de cuentas",
        closedSessions: 1,
      },
    });

    expect(
      await setUserStatus({
        actorId: support.id,
        userId: player.id,
        status: "active",
        reason: "",
        ip: null,
      }),
    ).toEqual({ ok: true });
    expect(await statusOf(player.id)).toBe("active");
    expect((await auditOf(player.id)).map((e) => e.action).sort()).toEqual([
      "user.reactivate",
      "user.suspend",
    ]);
  });

  it("rechaza sin motivo, sin permiso, a uno mismo, al equipo desde soporte y lo que ya está", async () => {
    const support = await account(["support"]);
    const editor = await account(["editor"]);
    const admin = await account(["admin"]);
    const player = await account();
    const suspend = (actorId: number, userId: number, reason = "Motivo suficiente") =>
      setUserStatus({ actorId, userId, status: "suspended", reason, ip: null });

    expect(await suspend(support.id, player.id, "no")).toEqual({ ok: false, problem: "reason" });
    expect(await suspend(editor.id, player.id)).toEqual({ ok: false, problem: "forbidden" });
    expect(await suspend(player.id, support.id)).toEqual({ ok: false, problem: "forbidden" });
    expect(await suspend(support.id, support.id)).toEqual({ ok: false, problem: "forbidden" });
    expect(await suspend(support.id, admin.id)).toEqual({ ok: false, problem: "forbidden" });
    expect(await suspend(support.id, 2_000_000_000)).toEqual({ ok: false, problem: "notFound" });
    expect(
      await setUserStatus({
        actorId: support.id,
        userId: player.id,
        status: "active",
        reason: "",
        ip: null,
      }),
    ).toEqual({ ok: false, problem: "unchanged" });

    // Nada de lo rechazado cambió ni dejó auditoría.
    expect(await statusOf(player.id)).toBe("active");
    expect(await sessionsOf(admin.id)).toBe(1);
    expect(await auditOf(player.id)).toHaveLength(0);

    // Un admin sí suspende a alguien del equipo.
    expect(await suspend(admin.id, support.id)).toEqual({ ok: true });
  });

  it("dos suspensiones a la vez: una se aplica y la otra ve que ya estaba", async () => {
    const a = await account(["support"]);
    const b = await account(["admin"]);
    const player = await account();
    const results = await Promise.all(
      [a, b].map((actor) =>
        setUserStatus({
          actorId: actor.id,
          userId: player.id,
          status: "suspended",
          reason: "Trampas",
          ip: null,
        }),
      ),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results).toContainEqual({ ok: false, problem: "unchanged" });
    expect(await auditOf(player.id)).toHaveLength(1);
  });
});

describe("roles", () => {
  it("un admin da y quita roles, con auditoría de antes y después", async () => {
    const admin = await account(["admin"]);
    const player = await account();
    expect(
      await setUserRoles({
        actorId: admin.id,
        userId: player.id,
        roles: ["editor", "support", "x"],
        ip: null,
      }),
    ).toEqual({ ok: true });
    expect((await getUserDetail(player.id))?.roles).toEqual(["editor", "support"]);
    expect(
      await setUserRoles({ actorId: admin.id, userId: player.id, roles: [], ip: null }),
    ).toEqual({ ok: true });
    expect((await getUserDetail(player.id))?.roles).toEqual([]);
    const entries = await auditOf(player.id);
    expect(entries.map((e) => e.diff)).toContainEqual({
      roles: { from: [], to: ["editor", "support"] },
    });
    expect(entries.map((e) => e.diff)).toContainEqual({
      roles: { from: ["editor", "support"], to: [] },
    });
  });

  it("soporte no cambia roles y un admin no se quita el suyo", async () => {
    const support = await account(["support"]);
    const admin = await account(["admin"]);
    expect(
      await setUserRoles({ actorId: support.id, userId: support.id, roles: ["admin"], ip: null }),
    ).toEqual({ ok: false, problem: "forbidden" });
    expect(
      await setUserRoles({ actorId: admin.id, userId: admin.id, roles: ["editor"], ip: null }),
    ).toEqual({ ok: false, problem: "forbidden" });
    expect((await getUserDetail(admin.id))?.roles).toEqual(["admin"]);
  });
});

describe("búsqueda y auditoría", () => {
  it("busca por nombre, correo o número, y filtra por estado", async () => {
    const player = await account();
    expect(
      (await searchUsers({ q: player.name, status: null, page: 1 })).rows.map((r) => r.id),
    ).toEqual([player.id]);
    expect(
      (await searchUsers({ q: `${player.name}@example`, status: null, page: 1 })).rows[0]?.id,
    ).toBe(player.id);
    expect(
      (await searchUsers({ q: String(player.id), status: null, page: 1 })).rows.map((r) => r.id),
    ).toContain(player.id);
    expect((await searchUsers({ q: player.name, status: "suspended", page: 1 })).total).toBe(0);
    // `%` y `_` se buscan como texto, no como comodines.
    expect(escapeLike("50%_a\\b")).toBe("50\\%\\_a\\\\b");
    expect((await searchUsers({ q: "%", status: null, page: 1 })).total).toBe(0);
  });

  it("la vista de auditoría filtra por cuenta y dice quién actuó", async () => {
    const admin = await account(["admin"]);
    const player = await account();
    await setUserRoles({ actorId: admin.id, userId: player.id, roles: ["editor"], ip: "10.0.0.9" });
    const { rows, total } = await listAudit({ entity: "user", entityId: player.id, page: 1 });
    expect(total).toBe(1);
    expect(rows[0]).toMatchObject({
      actorId: admin.id,
      actor: admin.name,
      action: "user.roles",
      ip: "10.0.0.9",
    });
  });
});
