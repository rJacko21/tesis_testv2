import { describe, expect, it } from "vitest";

import {
  escapeLike,
  parseRankingQuery,
  RANKING_CLASS_CODES,
  rankingHref,
  trendOf,
} from "./ranking-filters";

describe("parseRankingQuery (RF-07)", () => {
  it("sin parámetros es el ranking total, página 1", () => {
    expect(parseRankingQuery({})).toEqual({ area: "all", page: 1 });
  });

  it("lee área, clase, servidor, búsqueda y página", () => {
    expect(
      parseRankingQuery({ area: "sea", class: "sniper", server: "Aurora", q: " Mi ", page: "3" }),
    ).toEqual({ area: "sea", classCode: "sniper", server: "Aurora", query: "Mi", page: 3 });
  });

  it("una búsqueda vacía es lo mismo que no buscar", () => {
    expect(parseRankingQuery({ q: "   ", class: "" })).toEqual({ area: "all", page: 1 });
  });

  it.each([
    { area: "air" },
    { class: "wizard" },
    { page: "0" },
    { page: "2.5" },
    { page: "02" },
    { area: ["sea", "land"] },
  ])("rechaza %o (la página responde 404)", (query) => {
    expect(parseRankingQuery(query)).toBeNull();
  });

  it("acepta las 4 clases base y las 8 especializaciones", () => {
    expect(RANKING_CLASS_CODES).toHaveLength(12);
    expect(RANKING_CLASS_CODES).toContain("guardian-swordsman");
  });
});

describe("rankingHref", () => {
  it("conserva el filtro al cambiar de página (criterio de aceptación de RF-07)", () => {
    const filter = { area: "sea" as const, classCode: "sniper", page: 1 };
    expect(rankingHref("es", filter, 2)).toBe("/es/rankings?area=sea&class=sniper&page=2");
  });

  it("omite los valores por defecto: una sola URL por vista", () => {
    expect(rankingHref("de", { area: "all", page: 1 })).toBe("/de/rankings");
  });
});

describe("trendOf", () => {
  it("describe subidas, bajadas, sin cambios y nuevos", () => {
    expect(trendOf(2, 5)).toEqual({ kind: "up", places: 3 });
    expect(trendOf(7, 4)).toEqual({ kind: "down", places: 3 });
    expect(trendOf(4, 4)).toEqual({ kind: "same" });
    expect(trendOf(9, null)).toEqual({ kind: "new" });
  });
});

describe("escapeLike", () => {
  it("escapa los comodines de LIKE", () => {
    expect(escapeLike("a_b%c\\d")).toBe("a\\_b\\%c\\\\d");
  });
});
