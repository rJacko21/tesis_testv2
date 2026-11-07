/**
 * Fija los roles del equipo de una cuenta desde la terminal.
 *
 * Sirve para crear el primer administrador: el panel solo deja cambiar
 * roles a quien ya es `admin`. El cambio queda en la auditoría como
 * cualquier otro, sin cuenta que lo haga (`actor_id` nulo) y con la IP
 * `cli`.
 *
 * Uso: `pnpm staff:roles <cuenta> [admin] [editor] [support]`. Sin roles,
 * se los quita todos.
 *
 * @see RF-12 · M-35
 */
import "dotenv/config";

import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import * as schema from "../src/db/schema";
import { isStaffRole, STAFF_ROLES } from "../src/lib/admin/permissions";

const { auditLog, roles, userRoles, users } = schema;

async function main() {
  const [username, ...wanted] = process.argv.slice(2);
  const invalid = wanted.filter((role) => !isStaffRole(role));
  if (!username || invalid.length) {
    console.error(`Uso: pnpm staff:roles <cuenta> [${STAFF_ROLES.join("] [")}]`);
    process.exit(1);
  }
  const pool = mysql.createPool({ uri: process.env.DATABASE_URL!, timezone: "Z" });
  const db = drizzle(pool, { schema, mode: "default" });
  try {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username.toLowerCase()));
    if (!user) throw new Error(`No existe la cuenta «${username}».`);
    const next = [...new Set(wanted)].sort();

    await db.transaction(async (tx) => {
      const current = (
        await tx
          .select({ code: roles.code })
          .from(userRoles)
          .innerJoin(roles, eq(roles.id, userRoles.roleId))
          .where(eq(userRoles.userId, user.id))
      )
        .map((row) => row.code)
        .sort();
      await tx.delete(userRoles).where(eq(userRoles.userId, user.id));
      if (next.length) {
        const ids = await tx.select({ id: roles.id }).from(roles).where(inArray(roles.code, next));
        await tx.insert(userRoles).values(ids.map(({ id }) => ({ userId: user.id, roleId: id })));
      }
      await tx.insert(auditLog).values({
        actorId: null,
        action: "user.roles",
        entity: "user",
        entityId: user.id,
        diff: { roles: { from: current, to: next } },
        ip: "cli",
        createdAt: new Date(),
      });
    });
    console.log(`Roles de ${username}: ${next.join(", ") || "ninguno"}.`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
