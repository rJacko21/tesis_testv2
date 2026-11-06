/**
 * Soporte, canje de códigos, consentimiento y auditoría.
 *
 * - **Canje de códigos (RF-13).** Un código puede dar AP o un objeto. La
 *   restricción única `(code_id, user_id)` impide canjear dos veces el mismo
 *   código con una cuenta, aunque lleguen dos peticiones a la vez.
 * - **Tickets (RF-10).** La web original pedía «abrir un ticket» pero solo
 *   tenía un `mailto:` (F-23).
 * - **Consentimiento (RF-11).** Se guarda qué categorías aceptó cada visitante
 *   y con qué versión del texto: la web original no permitía rechazar
 *   cookies (F-31).
 * - **Auditoría (RF-12).** Cada cambio hecho desde el panel queda registrado
 *   con su autor y su diferencia.
 *
 * @see 04-arquitectura §4
 */
import {
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  smallint,
  text,
  uniqueIndex,
  varchar,
  char,
} from "drizzle-orm/mysql-core";

import { dt, fk, id, timestamps } from "./_columns";
import { characters } from "./game";
import { users } from "./identity";
import { shopItems } from "./shop";

export const redeemCodes = mysqlTable("redeem_codes", {
  id: id(),
  /** Se guarda en mayúsculas; la comparación no distingue mayúsculas. */
  code: varchar("code", { length: 32 }).notNull().unique(),
  rewardType: mysqlEnum("reward_type", ["ap", "item"]).notNull(),
  rewardAp: int("reward_ap", { unsigned: true }),
  rewardItemId: fk("reward_item_id").references(() => shopItems.id),
  /** Usos totales permitidos; nulo = ilimitado. */
  maxUses: int("max_uses", { unsigned: true }),
  /** Usos por cuenta (normalmente 1). */
  perAccount: smallint("per_account", { unsigned: true }).notNull().default(1),
  startsAt: dt("starts_at").notNull(),
  endsAt: dt("ends_at"),
  ...timestamps,
});

export const redeemUses = mysqlTable(
  "redeem_uses",
  {
    id: id(),
    codeId: fk("code_id")
      .notNull()
      .references(() => redeemCodes.id),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id),
    /** Personaje que recibe el objeto (nulo si la recompensa es AP). */
    characterId: fk("character_id").references(() => characters.id),
    usedAt: dt("used_at").notNull(),
  },
  (t) => [uniqueIndex("redeem_uses_code_user_uq").on(t.codeId, t.userId)],
);

export const supportTickets = mysqlTable(
  "support_tickets",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id),
    category: mysqlEnum("category", ["account", "payment", "bug", "migration", "other"]).notNull(),
    subject: varchar("subject", { length: 160 }).notNull(),
    status: mysqlEnum("status", ["open", "waiting_user", "closed"]).notNull().default("open"),
    ...timestamps,
  },
  (t) => [
    index("support_tickets_user_idx").on(t.userId),
    index("support_tickets_status_idx").on(t.status),
  ],
);

export const ticketMessages = mysqlTable(
  "ticket_messages",
  {
    id: id(),
    ticketId: fk("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    authorId: fk("author_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("ticket_messages_ticket_idx").on(t.ticketId, t.createdAt)],
);

export const consents = mysqlTable(
  "consents",
  {
    id: id(),
    /** Cuenta, si hay sesión. */
    userId: fk("user_id").references(() => users.id, { onDelete: "cascade" }),
    /** Identificador aleatorio de la cookie de consentimiento, si no hay sesión. */
    anonId: char("anon_id", { length: 36 }),
    /** Categorías aceptadas, p. ej. `{"necessary":true,"analytics":false}`. */
    categories: json("categories").$type<Record<string, boolean>>().notNull(),
    /** Versión de la política de cookies aceptada (`pages.version`). */
    version: int("version", { unsigned: true }).notNull(),
    givenAt: dt("given_at").notNull(),
  },
  (t) => [index("consents_user_idx").on(t.userId), index("consents_anon_idx").on(t.anonId)],
);

export const auditLog = mysqlTable(
  "audit_log",
  {
    id: id(),
    actorId: fk("actor_id").references(() => users.id, { onDelete: "set null" }),
    /** `post.publish`, `item.price_change`, `user.suspend`… */
    action: varchar("action", { length: 60 }).notNull(),
    entity: varchar("entity", { length: 40 }).notNull(),
    entityId: fk("entity_id"),
    /** Valores antes y después. */
    diff: json("diff").$type<Record<string, unknown>>(),
    ip: varchar("ip", { length: 45 }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("audit_log_entity_idx").on(t.entity, t.entityId),
    index("audit_log_actor_idx").on(t.actorId),
  ],
);
