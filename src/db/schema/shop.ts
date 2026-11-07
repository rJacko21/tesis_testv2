/**
 * Tienda y economía de AP.
 *
 * Reglas que el esquema garantiza:
 * - **El saldo es un libro mayor.** Cada movimiento de AP es una fila
 *   inmutable de `ap_ledger` (recarga, compra, devolución, ajuste). El saldo
 *   en caché `users.ap_balance` se actualiza en la misma transacción. Así
 *   siempre se puede auditar de dónde sale cada AP.
 * - **Pagos idempotentes.** `payments.provider_payment_id` es único: si
 *   Xsolla (o el simulador, ADR-09) avisa dos veces del mismo pago, el
 *   segundo aviso no duplica los AP.
 * - **Precio congelado.** `order_items.unit_price_ap` guarda el precio al
 *   comprar. Si después cambia el precio o termina una oferta, el historial
 *   del usuario sigue siendo correcto.
 * - **Entrega a un personaje.** Como en la web original, cada compra se
 *   envía a un servidor y personaje concretos (`order_items`).
 *
 * @see RF-05 Tienda con AP · RF-06 Recarga de AP · ADR-09 · 04-arquitectura §4
 */
import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  smallint,
  tinyint,
  uniqueIndex,
  varchar,
  char,
  text,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";

import { dt, fk, id, localeCode, timestamps } from "./_columns";
import { media } from "./content";
import { characters, servers } from "./game";
import { users } from "./identity";
import { locales } from "./locales";

/** Categorías en dos niveles, como la web original (`/shop/category/{padre}/{hijo}`). */
export const shopCategories = mysqlTable(
  "shop_categories",
  {
    id: id(),
    parentId: fk("parent_id").references((): AnyMySqlColumn => shopCategories.id),
    slug: varchar("slug", { length: 60 }).notNull(),
    sortOrder: smallint("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("shop_categories_slug_uq").on(t.parentId, t.slug)],
);

export const shopCategoryTranslations = mysqlTable(
  "shop_category_translations",
  {
    categoryId: fk("category_id")
      .notNull()
      .references(() => shopCategories.id, { onDelete: "cascade" }),
    locale: localeCode()
      .notNull()
      .references(() => locales.code),
    name: varchar("name", { length: 80 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.categoryId, t.locale] })],
);

/** Campañas temporales (Halloween, Pirate Party…) con fecha de fin obligatoria (F-16). */
export const campaigns = mysqlTable("campaigns", {
  id: id(),
  code: varchar("code", { length: 60 }).notNull().unique(),
  startsAt: dt("starts_at").notNull(),
  endsAt: dt("ends_at").notNull(),
});

export const campaignTranslations = mysqlTable(
  "campaign_translations",
  {
    campaignId: fk("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    locale: localeCode()
      .notNull()
      .references(() => locales.code),
    name: varchar("name", { length: 80 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.campaignId, t.locale] })],
);

export const shopItems = mysqlTable(
  "shop_items",
  {
    id: id(),
    categoryId: fk("category_id")
      .notNull()
      .references(() => shopCategories.id),
    /** Código interno del objeto en el juego. */
    sku: varchar("sku", { length: 40 }).notNull().unique(),
    imageId: fk("image_id").references(() => media.id, { onDelete: "set null" }),
    /** Días de validez; nulo = permanente. La web original lo mezclaba en el nombre (F-19). */
    validityDays: smallint("validity_days", { unsigned: true }),
    isBundle: tinyint("is_bundle").notNull().default(0),
    isLimited: tinyint("is_limited").notNull().default(0),
    /** Se puede regalar a otro jugador. */
    isGiftable: tinyint("is_giftable").notNull().default(0),
    isActive: tinyint("is_active").notNull().default(1),
    sortOrder: smallint("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("shop_items_category_idx").on(t.categoryId, t.isActive, t.sortOrder)],
);

export const shopItemTranslations = mysqlTable(
  "shop_item_translations",
  {
    itemId: fk("item_id")
      .notNull()
      .references(() => shopItems.id, { onDelete: "cascade" }),
    locale: localeCode()
      .notNull()
      .references(() => locales.code),
    /** Nombre completo: la interfaz decide cómo recortarlo, nunca la BD (F-19). */
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description").notNull(),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.locale] })],
);

/**
 * Precios con vigencia. El precio actual es la fila cuyo intervalo contiene
 * «ahora»; una oferta es otra fila con `sale_price_ap` y su campaña.
 */
export const itemPrices = mysqlTable(
  "item_prices",
  {
    id: id(),
    itemId: fk("item_id")
      .notNull()
      .references(() => shopItems.id, { onDelete: "cascade" }),
    priceAp: int("price_ap", { unsigned: true }).notNull(),
    salePriceAp: int("sale_price_ap", { unsigned: true }),
    campaignId: fk("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    startsAt: dt("starts_at").notNull(),
    /** Nulo = sin fecha de fin (precio normal). */
    endsAt: dt("ends_at"),
  },
  (t) => [index("item_prices_item_idx").on(t.itemId, t.startsAt)],
);

export const carts = mysqlTable("carts", {
  id: id(),
  userId: fk("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const cartItems = mysqlTable(
  "cart_items",
  {
    cartId: fk("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    itemId: fk("item_id")
      .notNull()
      .references(() => shopItems.id, { onDelete: "cascade" }),
    quantity: smallint("quantity", { unsigned: true }).notNull().default(1),
    /** Para enseñar la cesta en el orden en que se llenó. */
    addedAt: timestamps.createdAt,
  },
  (t) => [primaryKey({ columns: [t.cartId, t.itemId] })],
);

export const orders = mysqlTable(
  "orders",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id),
    totalAp: int("total_ap", { unsigned: true }).notNull(),
    status: mysqlEnum("status", ["pending", "completed", "refunded", "failed"]).notNull(),
    ...timestamps,
  },
  (t) => [index("orders_user_idx").on(t.userId, t.createdAt)],
);

export const orderItems = mysqlTable(
  "order_items",
  {
    id: id(),
    orderId: fk("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    itemId: fk("item_id")
      .notNull()
      .references(() => shopItems.id),
    quantity: smallint("quantity", { unsigned: true }).notNull(),
    /** Precio pagado por unidad, congelado en la compra. */
    unitPriceAp: int("unit_price_ap", { unsigned: true }).notNull(),
    /** Destino de la entrega en el juego. */
    serverId: fk("server_id")
      .notNull()
      .references(() => servers.id),
    characterId: fk("character_id")
      .notNull()
      .references(() => characters.id),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/**
 * Libro mayor de AP: una fila por movimiento, nunca se edita ni se borra.
 * `delta` positivo suma (recarga), negativo resta (compra).
 */
export const apLedger = mysqlTable(
  "ap_ledger",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id),
    delta: int("delta").notNull(),
    reason: mysqlEnum("reason", ["topup", "purchase", "refund", "admin", "redeem"]).notNull(),
    /** Id del pedido, pago, canje o ajuste que originó el movimiento. */
    referenceId: fk("reference_id"),
    /** Saldo tras el movimiento: permite comprobar la cadena sin sumar todo. */
    balanceAfter: int("balance_after", { unsigned: true }).notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("ap_ledger_user_idx").on(t.userId, t.createdAt)],
);

/** Paquetes de recarga (p. ej. 2500 AP = 1 Service Coin). */
export const topupPackages = mysqlTable("topup_packages", {
  id: id(),
  apAmount: int("ap_amount", { unsigned: true }).notNull(),
  priceCents: int("price_cents", { unsigned: true }).notNull(),
  /** ISO 4217. */
  currency: char("currency", { length: 3 }).notNull(),
  isActive: tinyint("is_active").notNull().default(1),
});

export const payments = mysqlTable(
  "payments",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id),
    packageId: fk("package_id")
      .notNull()
      .references(() => topupPackages.id),
    provider: mysqlEnum("provider", ["xsolla_sandbox", "mock"]).notNull(),
    /** Id del pago en el proveedor. Único: hace idempotente el webhook. */
    providerPaymentId: varchar("provider_payment_id", { length: 80 }).notNull(),
    status: mysqlEnum("status", ["pending", "paid", "failed", "refunded"]).notNull(),
    amountCents: int("amount_cents", { unsigned: true }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("payments_provider_uq").on(t.provider, t.providerPaymentId),
    index("payments_user_idx").on(t.userId, t.createdAt),
  ],
);
