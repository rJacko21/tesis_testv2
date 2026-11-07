import { describe, expect, it } from "vitest";

import { parseCampaign, parseItem, parsePrice, priceState } from "./shop-rules";

const NOW = new Date("2026-11-07T12:00:00Z");
const CATEGORIES = new Set([1, 2]);
const item = {
  sku: "cos-001",
  categoryId: "2",
  validityDays: "",
  sortOrder: "",
  isBundle: "",
  isLimited: "1",
  isGiftable: "1",
  isActive: "1",
};

describe("parseItem", () => {
  it("normaliza el SKU, lee las casillas y deja la validez vacía como permanente", () => {
    expect(parseItem(item, CATEGORIES)).toEqual({
      ok: true,
      value: {
        sku: "COS-001",
        categoryId: 2,
        validityDays: null,
        isBundle: false,
        isLimited: true,
        isGiftable: true,
        isActive: true,
        sortOrder: 0,
      },
    });
  });
  it("rechaza SKU, categoría, validez y orden no válidos", () => {
    expect(
      parseItem(
        { ...item, sku: "a b", categoryId: "9", validityDays: "0", sortOrder: "99999" },
        CATEGORIES,
      ),
    ).toEqual({
      ok: false,
      problems: {
        sku: "sku",
        categoryId: "category",
        validityDays: "validity",
        sortOrder: "sortOrder",
      },
    });
  });
});

const CAMPAIGNS = [
  { id: 7, startsAt: new Date("2026-11-20T00:00:00Z"), endsAt: new Date("2026-12-02T00:00:00Z") },
  { id: 8, startsAt: new Date("2026-10-01T00:00:00Z"), endsAt: new Date("2026-10-31T00:00:00Z") },
];
const price = { priceAp: "1000", salePriceAp: "", campaignId: "", startsAt: "", endsAt: "" };

describe("parsePrice", () => {
  it("sin inicio empieza ahora y sin fin es indefinido", () => {
    expect(parsePrice(price, CAMPAIGNS, NOW)).toEqual({
      ok: true,
      value: { priceAp: 1000, salePriceAp: null, campaignId: null, startsAt: NOW, endsAt: null },
    });
  });
  it("una rebaja de campaña toma las fechas de la campaña", () => {
    expect(parsePrice({ ...price, salePriceAp: "700", campaignId: "7" }, CAMPAIGNS, NOW)).toEqual({
      ok: true,
      value: {
        priceAp: 1000,
        salePriceAp: 700,
        campaignId: 7,
        startsAt: CAMPAIGNS[0]!.startsAt,
        endsAt: CAMPAIGNS[0]!.endsAt,
      },
    });
  });
  it("la rebaja tiene que ser menor que el precio", () => {
    expect(parsePrice({ ...price, salePriceAp: "1000" }, CAMPAIGNS, NOW)).toMatchObject({
      problems: { salePriceAp: "sale" },
    });
  });
  it("no reescribe el pasado y el fin va después del inicio", () => {
    expect(parsePrice({ ...price, startsAt: "2026-11-01T00:00" }, CAMPAIGNS, NOW)).toMatchObject({
      problems: { startsAt: "past" },
    });
    expect(
      parsePrice(
        { ...price, startsAt: "2026-11-10T00:00", endsAt: "2026-11-09T00:00" },
        CAMPAIGNS,
        NOW,
      ),
    ).toMatchObject({
      problems: { endsAt: "endsBeforeStart" },
    });
  });
  it("encaja en la campaña: ni antes de que empiece ni después de que acabe", () => {
    expect(
      parsePrice(
        { ...price, salePriceAp: "700", campaignId: "7", startsAt: "2026-11-10T00:00" },
        CAMPAIGNS,
        NOW,
      ),
    ).toMatchObject({ problems: { startsAt: "outsideCampaign" } });
    expect(
      parsePrice(
        { ...price, salePriceAp: "700", campaignId: "7", endsAt: "2026-12-05T00:00" },
        CAMPAIGNS,
        NOW,
      ),
    ).toMatchObject({ problems: { endsAt: "outsideCampaign" } });
    // Una campaña ya terminada no admite filas nuevas.
    expect(
      parsePrice({ ...price, salePriceAp: "700", campaignId: "8" }, CAMPAIGNS, NOW),
    ).toMatchObject({
      problems: { endsAt: "endsBeforeStart" },
    });
    expect(parsePrice({ ...price, campaignId: "99" }, CAMPAIGNS, NOW)).toMatchObject({
      problems: { campaignId: "campaign" },
    });
  });
  it("rechaza precios fuera de rango", () => {
    expect(parsePrice({ ...price, priceAp: "0" }, CAMPAIGNS, NOW).ok).toBe(false);
    expect(parsePrice({ ...price, priceAp: "1000001" }, CAMPAIGNS, NOW).ok).toBe(false);
    expect(parsePrice({ ...price, priceAp: "12.5" }, CAMPAIGNS, NOW).ok).toBe(false);
  });
});

it("priceState", () => {
  expect(priceState({ startsAt: new Date("2026-12-01"), endsAt: null }, NOW)).toBe("future");
  expect(priceState({ startsAt: new Date("2026-11-01"), endsAt: null }, NOW)).toBe("active");
  expect(priceState({ startsAt: new Date("2026-11-01"), endsAt: NOW }, NOW)).toBe("ended");
});

describe("parseCampaign", () => {
  it("exige código y las dos fechas, en orden", () => {
    expect(
      parseCampaign({
        code: " Winter-2026 ",
        startsAt: "2026-12-01T00:00",
        endsAt: "2026-12-10T00:00",
      }),
    ).toEqual({
      ok: true,
      value: {
        code: "winter-2026",
        startsAt: new Date("2026-12-01T00:00:00Z"),
        endsAt: new Date("2026-12-10T00:00:00Z"),
      },
    });
    expect(parseCampaign({ code: "x", startsAt: "", endsAt: "2026-01-01T00:00" })).toEqual({
      ok: false,
      problems: { code: "code", startsAt: "required" },
    });
    expect(
      parseCampaign({ code: "abc", startsAt: "2026-12-10T00:00", endsAt: "2026-12-01T00:00" }),
    ).toMatchObject({
      problems: { endsAt: "endsBeforeStart" },
    });
  });
});
