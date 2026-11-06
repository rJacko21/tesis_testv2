/**
 * Consultas del ranking de personajes (RF-07).
 *
 * Los puestos ya están calculados en `ranking_snapshots` (ADR-10): cada
 * filtro de área y clase es un grupo de la clave primaria `(taken_at, area,
 * class_scope, rank)`. Sin búsqueda ni servidor, una página es una lectura
 * por rango de esa clave (`rank > 50·(n−1)`), igual de rápida en la página 1
 * que en la 900, sin `OFFSET` que recorra las filas anteriores.
 *
 * Con búsqueda o servidor, el puesto que se muestra sigue siendo el del
 * ranking filtrado por área y clase: buscar «Misaja» enseña su puesto real,
 * no «1 de 1».
 *
 * Caché: `"use cache"` con la etiqueta `rankings` y vida de minutos. Las
 * fotos se generan cada cierto tiempo, así que una página se reutiliza
 * entre todos los visitantes hasta la siguiente (ADR-10: caché de 5 min).
 *
 * @see RF-07 · ADR-10 · F-20 · F-38
 */
import "server-only";

import { and, asc, count, desc, eq, gt, like, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { cacheLife, cacheTag } from "next/cache";

import { characterClasses, characters, guilds, rankingSnapshots, servers } from "@/db/schema";

import { escapeLike, RANKING_PAGE_SIZE, type RankingFilter } from "./ranking-filters";

/** Etiqueta de caché que invalidará la tarea que genera las fotos. */
export const RANKING_CACHE_TAG = "rankings";

/** Una fila de la tabla. */
export interface RankingEntry {
  rank: number;
  /** Puesto en la foto anterior; `null` si es nuevo. */
  previousRank: number | null;
  name: string;
  /** Código de la clase (`sniper`) y de su clase base (`explorer`), para el icono. */
  classCode: string;
  baseClassCode: string;
  /** Nombre oficial de la clase (no se traduce). */
  className: string;
  landLevel: number;
  seaLevel: number;
  guild: string | null;
  server: string;
}

export interface RankingPage {
  items: RankingEntry[];
  total: number;
  page: number;
  pageCount: number;
  /** Fecha de la foto mostrada; `null` si aún no hay ninguna. */
  takenAt: Date | null;
}

/** Servidores activos, para el filtro. */
export async function listServers(): Promise<string[]> {
  "use cache";
  cacheTag(RANKING_CACHE_TAG);
  cacheLife("hours");

  const { db } = await import("@/db/client");
  const rows = await db
    .select({ name: servers.name })
    .from(servers)
    .where(eq(servers.isActive, 1))
    .orderBy(asc(servers.name));
  return rows.map((row) => row.name);
}

const baseClass = alias(characterClasses, "base_class");
const scopeClass = alias(characterClasses, "scope_class");

/**
 * Una página del ranking.
 *
 * @param filter - Filtro ya validado. Un servidor desconocido no da error:
 *   simplemente no hay filas.
 */
export async function getRanking(filter: RankingFilter): Promise<RankingPage> {
  "use cache";
  cacheTag(RANKING_CACHE_TAG);
  cacheLife("minutes");

  const { db } = await import("@/db/client");
  const empty = { items: [], total: 0, page: filter.page, pageCount: 1, takenAt: null };

  // La foto más reciente: primera columna de la clave primaria, sin recorrer filas.
  const [latest] = await db
    .select({ takenAt: rankingSnapshots.takenAt })
    .from(rankingSnapshots)
    .orderBy(desc(rankingSnapshots.takenAt))
    .limit(1);
  const takenAt = latest?.takenAt ?? null;
  if (takenAt === null) return empty;

  // Clase pedida → su id (`class_scope`). 0 = todas.
  let classScope = 0;
  if (filter.classCode) {
    const [row] = await db
      .select({ id: scopeClass.id })
      .from(scopeClass)
      .where(eq(scopeClass.code, filter.classCode));
    if (!row) return { ...empty, takenAt };
    classScope = row.id;
  }

  const group = and(
    eq(rankingSnapshots.takenAt, takenAt),
    eq(rankingSnapshots.area, filter.area),
    eq(rankingSnapshots.classScope, classScope),
  );
  const pattern = filter.query ? `${escapeLike(filter.query)}%` : null;
  const narrowed = and(
    filter.server ? eq(servers.name, filter.server) : undefined,
    pattern ? or(like(characters.name, pattern), like(guilds.name, pattern)) : undefined,
  );
  const plain = narrowed === undefined;
  const offset = (filter.page - 1) * RANKING_PAGE_SIZE;

  const rowsQuery = db
    .select({
      rank: rankingSnapshots.rank,
      previousRank: rankingSnapshots.previousRank,
      name: characters.name,
      classCode: characterClasses.code,
      baseClassCode: sql<string>`coalesce(${baseClass.code}, ${characterClasses.code})`,
      className: characterClasses.name,
      landLevel: characters.landLevel,
      seaLevel: characters.seaLevel,
      guild: guilds.name,
      server: servers.name,
    })
    .from(rankingSnapshots)
    .innerJoin(characters, eq(characters.id, rankingSnapshots.characterId))
    .innerJoin(characterClasses, eq(characterClasses.id, characters.classId))
    .leftJoin(baseClass, eq(baseClass.id, characterClasses.parentId))
    .innerJoin(servers, eq(servers.id, characters.serverId))
    .leftJoin(guilds, eq(guilds.id, characters.guildId));

  const [rows, [totals]] = await Promise.all([
    plain
      ? // Lectura por rango de la clave primaria: no depende del número de página.
        rowsQuery
          .where(and(group, gt(rankingSnapshots.rank, offset)))
          .orderBy(asc(rankingSnapshots.rank))
          .limit(RANKING_PAGE_SIZE)
      : rowsQuery
          .where(and(group, narrowed))
          .orderBy(asc(rankingSnapshots.rank))
          .limit(RANKING_PAGE_SIZE)
          .offset(offset),
    plain
      ? db.select({ total: count() }).from(rankingSnapshots).where(group)
      : db
          .select({ total: count() })
          .from(rankingSnapshots)
          .innerJoin(characters, eq(characters.id, rankingSnapshots.characterId))
          .innerJoin(servers, eq(servers.id, characters.serverId))
          .leftJoin(guilds, eq(guilds.id, characters.guildId))
          .where(and(group, narrowed)),
  ]);

  const total = totals?.total ?? 0;
  return {
    items: rows,
    total,
    page: filter.page,
    pageCount: Math.max(1, Math.ceil(total / RANKING_PAGE_SIZE)),
    takenAt,
  };
}
