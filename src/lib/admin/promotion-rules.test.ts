import { describe, expect, it } from "vitest";

import { isSafeTarget, parsePromotion, promotionState } from "./promotion-rules";

const NOW = new Date("2026-12-01T10:00:00Z");
const base = {
  targetUrl: "/shop?cat=costumes",
  startsAt: "",
  endsAt: "2026-12-24T23:00",
  sortOrder: "",
  "title-en": "Winter sale",
  "alt-en": "Two characters in winter costumes",
};

describe("isSafeTarget", () => {
  it("acepta rutas internas y URLs https", () => {
    expect(isSafeTarget("/shop?cat=costumes")).toBe(true);
    expect(isSafeTarget("https://discord.gg/florensia")).toBe(true);
  });

  it("rechaza esquemas peligrosos, http, rutas de otro sitio y espacios", () => {
    for (const value of [
      "javascript:alert(1)",
      "http://example.com",
      "//evil.example",
      "/\\evil.example",
      "data:text/html,x",
      "https://user@evil.example",
      "/shop cat",
      "",
    ]) {
      expect(isSafeTarget(value), value).toBe(false);
    }
  });
});

describe("parsePromotion", () => {
  it("sin inicio empieza ahora; textos opcionales salvo el inglés", () => {
    const result = parsePromotion({ ...base, "title-es": "Rebajas de invierno" }, true, NOW);
    expect(result).toEqual({
      ok: true,
      value: {
        targetUrl: "/shop?cat=costumes",
        startsAt: NOW,
        endsAt: new Date("2026-12-24T23:00:00Z"),
        sortOrder: 0,
        titles: { en: "Winter sale", es: "Rebajas de invierno" },
        alts: { en: "Two characters in winter costumes" },
      },
    });
  });

  it("exige fin, después del inicio, y no empieza en el pasado al crearla", () => {
    expect(parsePromotion({ ...base, endsAt: "" }, true, NOW)).toMatchObject({
      problems: { endsAt: "required" },
    });
    expect(parsePromotion({ ...base, startsAt: "2026-12-30T00:00" }, true, NOW)).toMatchObject({
      problems: { endsAt: "endsBeforeStart" },
    });
    expect(parsePromotion({ ...base, startsAt: "2026-11-01T00:00" }, true, NOW)).toMatchObject({
      problems: { startsAt: "past" },
    });
    // Al editar, una promoción en curso conserva su inicio pasado.
    expect(parsePromotion({ ...base, startsAt: "2026-11-01T00:00" }, false, NOW).ok).toBe(true);
  });

  it("exige título y texto alternativo en inglés, y limita longitudes y orden", () => {
    expect(
      parsePromotion(
        { ...base, "title-en": "", "alt-en": "", "title-de": "x".repeat(121), sortOrder: "x" },
        true,
        NOW,
      ),
    ).toEqual({
      ok: false,
      problems: {
        "title-en": "english",
        "alt-en": "english",
        "title-de": "title",
        sortOrder: "sortOrder",
      },
    });
  });
});

it("promotionState", () => {
  const row = { startsAt: new Date("2026-12-01T00:00Z"), endsAt: new Date("2026-12-10T00:00Z") };
  expect(promotionState(row, new Date("2026-11-30T00:00Z"))).toBe("upcoming");
  expect(promotionState(row, new Date("2026-12-05T00:00Z"))).toBe("running");
  expect(promotionState(row, new Date("2026-12-10T00:00Z"))).toBe("ended");
});
