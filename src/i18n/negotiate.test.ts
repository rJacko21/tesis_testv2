import { describe, expect, it } from "vitest";

import { negotiateLocale, parseAcceptLanguage } from "./negotiate";

describe("parseAcceptLanguage", () => {
  it("ordena por calidad y respeta el orden ante empates", () => {
    expect(parseAcceptLanguage("fr;q=0.5, de, en;q=0.8, it")).toEqual(["de", "it", "en", "fr"]);
  });

  it("ignora comodines, calidad 0 y valores vacíos", () => {
    expect(parseAcceptLanguage("*, es;q=0, ,tr")).toEqual(["tr"]);
    expect(parseAcceptLanguage(null)).toEqual([]);
  });
});

describe("negotiateLocale", () => {
  it("prioriza la cookie con el idioma elegido", () => {
    expect(negotiateLocale("de", "es-ES,es")).toBe("de");
  });

  it("ignora una cookie con un valor no admitido", () => {
    expect(negotiateLocale("xx", "it")).toBe("it");
  });

  it("resuelve variantes regionales al idioma base", () => {
    expect(negotiateLocale(null, "es-AR,en;q=0.5")).toBe("es");
    expect(negotiateLocale(null, "tr-TR")).toBe("tr");
  });

  it("envía cualquier portugués a pt-BR", () => {
    expect(negotiateLocale(null, "pt-PT")).toBe("pt-BR");
    expect(negotiateLocale(null, "pt")).toBe("pt-BR");
  });

  it("usa inglés si nada coincide", () => {
    expect(negotiateLocale(undefined, "ja,zh;q=0.8")).toBe("en");
  });
});
