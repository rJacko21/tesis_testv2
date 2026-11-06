import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES, isLocale, normalizeLocale } from "./locales";

describe("configuración de idiomas", () => {
  it("define exactamente los 7 idiomas pedidos (RNF-04)", () => {
    expect(LOCALES).toEqual(["en", "pt-BR", "tr", "it", "de", "fr", "es"]);
  });

  it("tiene un nombre visible para cada idioma", () => {
    for (const locale of LOCALES) {
      expect(LOCALE_NAMES[locale]).toBeTruthy();
    }
  });

  it("usa un idioma admitido por defecto", () => {
    expect(isLocale(DEFAULT_LOCALE)).toBe(true);
  });

  it("reconoce códigos válidos y rechaza el resto", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("pt")).toBe(false);
    expect(isLocale("xx")).toBe(false);
  });

  it("normaliza mayúsculas y el alias antiguo /pt (F-07)", () => {
    expect(normalizeLocale("PT-br")).toBe("pt-BR");
    expect(normalizeLocale("pt")).toBe("pt-BR");
    expect(normalizeLocale("DE")).toBe("de");
    expect(normalizeLocale("xx")).toBeNull();
  });
});
