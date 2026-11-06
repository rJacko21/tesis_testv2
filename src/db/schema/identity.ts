/**
 * Identidad: usuarios, sesiones, verificación, roles y límites de intentos.
 *
 * En la web original, el registro y el inicio de sesión se hacían en otro
 * dominio (us.online-games.services) y solo en inglés (F-21, F-24). Aquí
 * son parte del sitio.
 *
 * Las contraseñas se guardan como hash Argon2id (`password_hash`), nunca en
 * claro ni con cifrado reversible (OWASP ASVS V2.4).
 *
 * @see RF-03 Cuentas · RF-04 Mi cuenta · 04-arquitectura §4
 */
import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  smallint,
  uniqueIndex,
  varchar,
  char,
} from "drizzle-orm/mysql-core";

import { dt, fk, id, localeCode, timestamps } from "./_columns";
import { locales } from "./locales";

export const users = mysqlTable(
  "users",
  {
    id: id(),
    /** Nombre de cuenta visible; único sin distinguir mayúsculas (collation `_ai_ci`). */
    username: varchar("username", { length: 32 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    emailVerifiedAt: dt("email_verified_at"),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    /** Idioma preferido para correos y para la primera visita. */
    locale: localeCode()
      .notNull()
      .default("en")
      .references(() => locales.code),
    status: mysqlEnum("status", ["active", "suspended", "deleted"]).notNull().default("active"),
    /**
     * Saldo de AP en caché. La verdad es la suma de `ap_ledger`; este valor
     * se actualiza en la misma transacción que cada apunte, con la fila
     * bloqueada (`SELECT … FOR UPDATE`), para que dos compras simultáneas
     * no gasten el mismo saldo (RF-05).
     */
    apBalance: int("ap_balance", { unsigned: true }).notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("users_username_uq").on(t.username),
    uniqueIndex("users_email_uq").on(t.email),
  ],
);

export const sessions = mysqlTable(
  "sessions",
  {
    /** SHA-256 del token de la cookie: si se filtra la tabla, no sirve para entrar. */
    tokenHash: char("token_hash", { length: 64 }).primaryKey(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: dt("expires_at").notNull(),
    userAgent: varchar("user_agent", { length: 255 }),
    ...timestamps,
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const verificationTokens = mysqlTable(
  "verification_tokens",
  {
    tokenHash: char("token_hash", { length: 64 }).primaryKey(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: mysqlEnum("purpose", ["verify_email", "reset_password"]).notNull(),
    expiresAt: dt("expires_at").notNull(),
    usedAt: dt("used_at"),
    ...timestamps,
  },
  (t) => [index("verification_tokens_user_idx").on(t.userId)],
);

/** Intentos de inicio de sesión, para limitar la fuerza bruta por cuenta e IP. */
export const loginAttempts = mysqlTable(
  "login_attempts",
  {
    id: id(),
    /** Usuario o correo tal como se escribió (puede no existir). */
    identifier: varchar("identifier", { length: 254 }).notNull(),
    /** IP en texto (IPv4 o IPv6). Se borra a los 30 días (RGPD, minimización). */
    ip: varchar("ip", { length: 45 }).notNull(),
    succeeded: smallint("succeeded").notNull(),
    attemptedAt: dt("attempted_at").notNull(),
  },
  (t) => [
    index("login_attempts_identifier_idx").on(t.identifier, t.attemptedAt),
    index("login_attempts_ip_idx").on(t.ip, t.attemptedAt),
  ],
);

export const roles = mysqlTable("roles", {
  id: id(),
  /** `admin`, `editor`, `support`… El panel de administración (RF-12) comprueba estos códigos. */
  code: varchar("code", { length: 32 }).notNull().unique(),
});

export const userRoles = mysqlTable(
  "user_roles",
  {
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: fk("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);

export type UserRow = typeof users.$inferSelect;
