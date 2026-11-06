import { describe, expect, it } from "vitest";

import { LOCALES } from "@/config/locales";

import { catalogLoaders } from "../catalog";

import { checkCatalogs } from "./check-catalogs";

const source = { footer: { copyright: "© {year} Giiku", privacy: "Privacy" } };

describe("checkCatalogs", () => {
  it("acepta un catálogo completo y coherente", () => {
    expect(
      checkCatalogs(source, {
        es: { footer: { copyright: "© {year} Giiku", privacy: "Privacidad" } },
      }),
    ).toEqual([]);
  });

  it("detecta claves que faltan, sobran o están vacías", () => {
    const issues = checkCatalogs(source, {
      tr: { footer: { copyright: "", extra: "x" } },
    });
    expect(issues.map((i) => i.problem)).toEqual([
      "mensaje vacío",
      "falta la clave",
      "clave que no existe en inglés",
    ]);
  });

  it("detecta marcadores perdidos o inventados e ICU inválido", () => {
    const issues = checkCatalogs(source, {
      de: { footer: { copyright: "© {jahr} Giiku", privacy: "Datenschutz {" } },
    });
    expect(issues.map((i) => i.problem)).toEqual([
      "faltan marcadores: year",
      "marcadores de más: jahr",
      expect.stringContaining("ICU inválido"),
    ]);
  });

  it("los catálogos reales del proyecto no tienen problemas (RNF-04)", async () => {
    const [en, ...rest] = await Promise.all(LOCALES.map((l) => catalogLoaders[l]()));
    const catalogs = Object.fromEntries(LOCALES.slice(1).map((l, i) => [l, rest[i]!]));
    expect(checkCatalogs(en!, catalogs)).toEqual([]);
  });
});
