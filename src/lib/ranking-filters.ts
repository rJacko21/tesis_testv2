/**
 * Filtros del ranking (RF-07) como funciones puras: leer la URL, construir
 * enlaces y describir la tendencia. Sin base de datos, para probarlos solos.
 *
 * Los filtros viven en la URL (`/es/rankings?area=sea&class=sniper&page=2`):
 * cada vista se puede compartir e indexar, y al cambiar de página el filtro
 * se mantiene porque forma parte del enlace (criterio de aceptación de RF-07).
 *
 * @see RF-07 · F-20 (sin búsqueda ni salto de página) · F-28 (tendencia solo con iconos)
 */
import { CLASS_CATALOG, specializationCode } from "@/config/class-catalog";
import type { Locale } from "@/config/locales";

/** Filas por página, como en la web original. */
export const RANKING_PAGE_SIZE = 50;

/** Longitud máxima de un nombre de personaje o gremio. */
export const RANKING_QUERY_MAX = 24;

export const RANKING_AREAS = ["all", "land", "sea"] as const;
export type RankingArea = (typeof RANKING_AREAS)[number];

/** Códigos de clase admitidos: las 4 base y sus 8 especializaciones (`character_classes.code`). */
export const RANKING_CLASS_CODES: readonly string[] = CLASS_CATALOG.flatMap((c) => [
  c.id,
  ...c.specializations.map(specializationCode),
]);

/** Filtro completo de una vista del ranking. */
export interface RankingFilter {
  area: RankingArea;
  /** Código de clase; sin él, todas las clases. */
  classCode?: string;
  /** Nombre del servidor; sin él, todos. */
  server?: string;
  /** Principio del nombre de un personaje o de un gremio. */
  query?: string;
  page: number;
}

type RawQuery = Record<string, string | string[] | undefined>;

/**
 * Lee el filtro de la URL.
 *
 * @returns `null` si algún parámetro no es válido (área o clase desconocida,
 *   página que no es un entero positivo, parámetros repetidos). La página
 *   responde entonces 404 en lugar de una tabla vacía, para que no se
 *   indexen URLs basura.
 */
export function parseRankingQuery(raw: RawQuery): RankingFilter | null {
  const value = (key: string): string | undefined | null => {
    const v = raw[key];
    // Un valor vacío cuenta como ausente: el formulario envía `class=` con «Todas las clases».
    return Array.isArray(v) ? null : v?.trim() || undefined;
  };
  const area = value("area");
  const classCode = value("class");
  const server = value("server");
  const query = value("q");
  const rawPage = value("page");
  if (area === null || classCode === null || server === null || query === null || rawPage === null)
    return null;

  if (area !== undefined && !(RANKING_AREAS as readonly string[]).includes(area)) return null;
  if (classCode !== undefined && !RANKING_CLASS_CODES.includes(classCode)) return null;

  const page = rawPage === undefined ? 1 : Number(rawPage);
  if (!Number.isSafeInteger(page) || page < 1 || String(page) !== (rawPage ?? "1")) return null;

  return {
    area: (area as RankingArea | undefined) ?? "all",
    classCode,
    server,
    query: query?.slice(0, RANKING_QUERY_MAX),
    page,
  };
}

/**
 * URL de una vista del ranking. Omite los valores por defecto (`area=all`,
 * `page=1`) para que cada vista tenga una sola URL.
 */
export function rankingHref(locale: Locale, filter: RankingFilter, page = filter.page): string {
  const params = new URLSearchParams();
  if (filter.area !== "all") params.set("area", filter.area);
  if (filter.classCode) params.set("class", filter.classCode);
  if (filter.server) params.set("server", filter.server);
  if (filter.query) params.set("q", filter.query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return `/${locale}/rankings${search ? `?${search}` : ""}`;
}

/** Cambio de puesto respecto a la foto anterior. */
export type Trend =
  | { kind: "up"; places: number }
  | { kind: "down"; places: number }
  | { kind: "same" }
  | { kind: "new" };

/** Compara el puesto actual con el anterior (`null` = no estaba en el ranking). */
export function trendOf(rank: number, previousRank: number | null): Trend {
  if (previousRank === null) return { kind: "new" };
  if (previousRank > rank) return { kind: "up", places: previousRank - rank };
  if (previousRank < rank) return { kind: "down", places: rank - previousRank };
  return { kind: "same" };
}

/**
 * Escapa los comodines de `LIKE` (`%`, `_` y `\`), para que buscar «a_b»
 * busque exactamente eso y un `%` no convierta la búsqueda en un recorrido
 * de toda la tabla.
 */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}
