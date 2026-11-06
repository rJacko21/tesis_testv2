/**
 * Identidad: usuarios, sesiones, verificación, roles y límites de intentos.
 *
 * En la web original, el registro y el inicio de sesión se hacían en otro
 * dominio (us.online-games.services) y solo en inglés (F-21, F-24). Aquí
 * son parte del sitio.
 *
 * Las tablas `users`, `accounts`, `sessions` y `verifications` siguen el
 * modelo de Better Auth (ADR-05), con nombres de columna en snake_case e
 * ids numéricos autoincrementales (`generateId: "serial"`). Las
 * contraseñas se guardan como hash Argon2id en `accounts.password`, nunca
 * en claro ni con cifrado reversible (OWASP ASVS V2.4).
 *
 * @see RF-03 Cuentas · RF-04 Mi cuenta · 04-arquitectura §4 · ADR-05
 */
import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  smallint,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { dt, fk, id, localeCode, timestamps } from "./_columns";
import { locales } from "./locales";

export const users = mysqlTable(
  "users",
  {
    id: id(),
    /**
     * Nombre de cuenta normalizado (minúsculas): es el que se busca al
     * iniciar sesión y el que garantiza la unicidad. Lo gestiona el plugin
     * `username` de Better Auth.
     */
    username: varchar("username", { length: 32 }).notNull(),
    /** Nombre de cuenta tal como lo escribió el jugador («Misaja»). */
    displayUsername: varchar("display_username", { length: 32 }),
    /**
     * Nombre visible que exige el modelo de Better Auth. Al registrarse se
     * copia el nombre de cuenta; la web no pide un nombre real (RGPD,
     * minimización de datos).
     */
    name: varchar("name", { length: 32 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    /** El correo se confirmó con el enlace enviado. Hace falta para comprar (RF-03). */
    emailVerified: boolean("email_verified").notNull().default(false),
    /** Avatar; el modelo de Better Auth lo incluye, la web aún no lo usa. */
    image: varchar("image", { length: 255 }),
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

/**
 * Formas de iniciar sesión de cada usuario (modelo `account` de Better
 * Auth). Con usuario y contraseña hay una fila `provider_id = 'credential'`
 * con el hash Argon2id en `password`. Las columnas de OAuth quedan
 * preparadas para enlazar en el futuro la cuenta del juego (ADR-05).
 */
export const accounts = mysqlTable(
  "accounts",
  {
    id: id(),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 64 }).notNull(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: dt("access_token_expires_at"),
    refreshTokenExpiresAt: dt("refresh_token_expires_at"),
    scope: varchar("scope", { length: 255 }),
    /** Hash Argon2id (`$argon2id$…`). Nunca la contraseña ni un cifrado reversible (ASVS V2.4). */
    password: varchar("password", { length: 255 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("accounts_provider_account_uq").on(t.providerId, t.accountId),
    index("accounts_user_idx").on(t.userId),
  ],
);

/**
 * Sesiones abiertas. La cookie lleva el token firmado con HMAC y el
 * secreto del servidor (`BETTER_AUTH_SECRET`): aunque se filtrara esta
 * tabla, sin el secreto no se puede fabricar una cookie válida.
 */
export const sessions = mysqlTable(
  "sessions",
  {
    id: id(),
    token: varchar("token", { length: 255 }).notNull(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: dt("expires_at").notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 255 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("sessions_token_uq").on(t.token),
    index("sessions_user_idx").on(t.userId),
    index("sessions_expires_idx").on(t.expiresAt),
  ],
);

/**
 * Tokens de un solo uso: verificar el correo y recuperar la contraseña.
 * Se guarda el SHA-256 del token (`storeIdentifier: "hashed"`), no el
 * token: quien lea la tabla no puede usar los enlaces pendientes.
 */
export const verifications = mysqlTable(
  "verifications",
  {
    id: id(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: dt("expires_at").notNull(),
    ...timestamps,
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

/**
 * Contadores de límite de peticiones por clave (`signup:ip:1.2.3.4`…), en
 * ventana fija. En la base de datos y no en memoria porque en Vercel cada
 * petición puede ir a una instancia distinta.
 */
export const rateLimits = mysqlTable("rate_limits", {
  key: varchar("rate_key", { length: 191 }).primaryKey(),
  count: int("count", { unsigned: true }).notNull(),
  windowStart: dt("window_start").notNull(),
});

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
