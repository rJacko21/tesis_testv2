/**
 * Consultas de «Mi cuenta» (RF-04): saldo, compras, recargas, personajes con
 * su puesto en el ranking y sesiones abiertas.
 *
 * Todas reciben el id del usuario de la sesión, nunca uno que llegue del
 * navegador: así nadie puede ver los datos de otra cuenta cambiando un
 * parámetro (OWASP ASVS V4.2.1, control de acceso a nivel de objeto).
 *
 * No usan caché: son datos privados y cambian con cada compra o recarga.
 *
 * @see RF-04 · F-46 (historiales vacíos sin mensaje)
 */
import "server-only";

import { and, asc, count, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";

import type { Locale } from "@/config/locales";
import {
  characterClasses,
  characters,
  guilds,
  orderItems,
  orders,
  payments,
  rankingSnapshots,
  servers,
  sessions,
  shopItemTranslations,
  topupPackages,
  users,
} from "@/db/schema";

/** Filas por página en los historiales. */
export const HISTORY_PAGE_SIZE = 10;

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
}

const paged = <T>(items: T[], total: number, page: number): Paged<T> => ({
  items,
  total,
  page,
  pageCount: Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE)),
});

/** Saldo de AP de la cuenta. */
export async function getApBalance(userId: number): Promise<number> {
  const { db } = await import("@/db/client");
  const [row] = await db
    .select({ balance: users.apBalance })
    .from(users)
    .where(eq(users.id, userId));
  return row?.balance ?? 0;
}

// ---------------------------------------------------------------------------
// Compras
// ---------------------------------------------------------------------------

export interface OrderLine {
  /** Nombre del objeto en el idioma de la página, o en inglés si falta. */
  name: string;
  quantity: number;
  unitPriceAp: number;
  character: string;
  server: string;
}

export interface OrderSummary {
  id: number;
  createdAt: Date;
  totalAp: number;
  status: "pending" | "completed" | "refunded" | "failed";
  lines: OrderLine[];
}

/** Compras de la cuenta, de la más reciente a la más antigua. */
export async function listOrders(
  userId: number,
  page: number,
  locale: Locale,
): Promise<Paged<OrderSummary>> {
  const { db } = await import("@/db/client");
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: orders.id,
        createdAt: orders.createdAt,
        totalAp: orders.totalAp,
        status: orders.status,
      })
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(HISTORY_PAGE_SIZE)
      .offset((page - 1) * HISTORY_PAGE_SIZE),
    db.select({ total: count() }).from(orders).where(eq(orders.userId, userId)),
  ]);
  if (rows.length === 0) return paged([], totals?.total ?? 0, page);

  const localName = alias(shopItemTranslations, "local_name");
  const englishName = alias(shopItemTranslations, "english_name");
  const lines = await db
    .select({
      orderId: orderItems.orderId,
      name: sql<string>`coalesce(${localName.name}, ${englishName.name}, '?')`,
      quantity: orderItems.quantity,
      unitPriceAp: orderItems.unitPriceAp,
      character: characters.name,
      server: servers.name,
    })
    .from(orderItems)
    .leftJoin(localName, and(eq(localName.itemId, orderItems.itemId), eq(localName.locale, locale)))
    .leftJoin(
      englishName,
      and(eq(englishName.itemId, orderItems.itemId), eq(englishName.locale, "en")),
    )
    .innerJoin(characters, eq(characters.id, orderItems.characterId))
    .innerJoin(servers, eq(servers.id, orderItems.serverId))
    .where(
      inArray(
        orderItems.orderId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(orderItems.id));

  return paged(
    rows.map((row) => ({
      ...row,
      lines: lines
        .filter((line) => line.orderId === row.id)
        .map((line) => ({
          name: line.name,
          quantity: line.quantity,
          unitPriceAp: line.unitPriceAp,
          character: line.character,
          server: line.server,
        })),
    })),
    totals?.total ?? 0,
    page,
  );
}

// ---------------------------------------------------------------------------
// Recargas
// ---------------------------------------------------------------------------

export interface TopupSummary {
  id: number;
  createdAt: Date;
  apAmount: number;
  amountCents: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
}

/** Recargas de AP de la cuenta, de la más reciente a la más antigua. */
export async function listTopups(userId: number, page: number): Promise<Paged<TopupSummary>> {
  const { db } = await import("@/db/client");
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: payments.id,
        createdAt: payments.createdAt,
        apAmount: topupPackages.apAmount,
        amountCents: payments.amountCents,
        currency: payments.currency,
        status: payments.status,
      })
      .from(payments)
      .innerJoin(topupPackages, eq(topupPackages.id, payments.packageId))
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt), desc(payments.id))
      .limit(HISTORY_PAGE_SIZE)
      .offset((page - 1) * HISTORY_PAGE_SIZE),
    db.select({ total: count() }).from(payments).where(eq(payments.userId, userId)),
  ]);
  return paged(rows, totals?.total ?? 0, page);
}

// ---------------------------------------------------------------------------
// Personajes y «Mis rankings»
// ---------------------------------------------------------------------------

export interface MyCharacter {
  id: number;
  name: string;
  classCode: string;
  baseClassCode: string;
  className: string;
  landLevel: number;
  seaLevel: number;
  guild: string | null;
  server: string;
  /** Puesto en el ranking general, de tierra y de mar; `null` si no aparece. */
  ranks: Record<"all" | "land" | "sea", number | null>;
}

export interface MyCharacters {
  characters: MyCharacter[];
  /** Fecha de la foto del ranking usada; `null` si aún no hay ninguna. */
  takenAt: Date | null;
}

/**
 * Personajes de la cuenta con su puesto en la última foto del ranking
 * (todas las clases). Usa el índice `ranking_character_idx`.
 */
export async function listMyCharacters(userId: number): Promise<MyCharacters> {
  const { db } = await import("@/db/client");
  const baseClass = alias(characterClasses, "base_class");
  const [rows, [latest]] = await Promise.all([
    db
      .select({
        id: characters.id,
        name: characters.name,
        classCode: characterClasses.code,
        baseClassCode: sql<string>`coalesce(${baseClass.code}, ${characterClasses.code})`,
        className: characterClasses.name,
        landLevel: characters.landLevel,
        seaLevel: characters.seaLevel,
        guild: guilds.name,
        server: servers.name,
      })
      .from(characters)
      .innerJoin(characterClasses, eq(characterClasses.id, characters.classId))
      .leftJoin(baseClass, eq(baseClass.id, characterClasses.parentId))
      .innerJoin(servers, eq(servers.id, characters.serverId))
      .leftJoin(guilds, eq(guilds.id, characters.guildId))
      .where(eq(characters.userId, userId))
      .orderBy(desc(characters.landLevel), asc(characters.name)),
    db
      .select({ takenAt: rankingSnapshots.takenAt })
      .from(rankingSnapshots)
      .orderBy(desc(rankingSnapshots.takenAt))
      .limit(1),
  ]);
  const takenAt = latest?.takenAt ?? null;

  const ranks =
    takenAt && rows.length > 0
      ? await db
          .select({
            characterId: rankingSnapshots.characterId,
            area: rankingSnapshots.area,
            rank: rankingSnapshots.rank,
          })
          .from(rankingSnapshots)
          .where(
            and(
              inArray(
                rankingSnapshots.characterId,
                rows.map((row) => row.id),
              ),
              eq(rankingSnapshots.takenAt, takenAt),
              eq(rankingSnapshots.classScope, 0),
            ),
          )
      : [];

  return {
    takenAt,
    characters: rows.map((row) => {
      const rankIn = (area: "all" | "land" | "sea") =>
        ranks.find((r) => r.characterId === row.id && r.area === area)?.rank ?? null;
      return { ...row, ranks: { all: rankIn("all"), land: rankIn("land"), sea: rankIn("sea") } };
    }),
  };
}

// ---------------------------------------------------------------------------
// Sesiones
// ---------------------------------------------------------------------------

export interface OpenSession {
  id: number;
  createdAt: Date;
  /** Última renovación: Better Auth la actualiza como mucho una vez al día. */
  updatedAt: Date;
  userAgent: string | null;
}

/** Sesiones abiertas y sin caducar, de la más reciente a la más antigua. */
export async function listOpenSessions(userId: number): Promise<OpenSession[]> {
  const { db } = await import("@/db/client");
  return db
    .select({
      id: sessions.id,
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
      userAgent: sessions.userAgent,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
    .orderBy(desc(sessions.updatedAt));
}

/** Personajes de la cuenta para elegir quién recibe un objeto: «Misaja (Bergruen)». */
export async function listCharacterOptions(
  userId: number,
): Promise<{ id: number; name: string; server: string }[]> {
  const { db } = await import("@/db/client");
  return db
    .select({ id: characters.id, name: characters.name, server: servers.name })
    .from(characters)
    .innerJoin(servers, eq(servers.id, characters.serverId))
    .where(eq(characters.userId, userId))
    .orderBy(asc(characters.name));
}
