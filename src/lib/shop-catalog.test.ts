import { describe, expect, it } from "vitest";

import {
  catalogAt,
  currentPrice,
  filterCatalog,
  type CatalogItem,
  type PriceRow,
  type ShopData,
} from "./shop-catalog";
import { SHOP_PAGE_SIZE, type ShopFilter } from "./shop-filters";

const day = (n: number) => new Date(Date.UTC(2026, 10, n));

describe("currentPrice", () => {
  const base: PriceRow = {
    priceAp: 1000,
    salePriceAp: null,
    campaignId: null,
    startsAt: day(1),
    endsAt: null,
  };
  const sale: PriceRow = {
    ...base,
    salePriceAp: 700,
    campaignId: 1,
    startsAt: day(5),
    endsAt: day(10),
  };

  it("usa el precio normal fuera de la campaña", () => {
    expect(currentPrice([base, sale], day(3))).toBe(base);
    expect(currentPrice([base, sale], day(10))).toBe(base);
  });

  it("la campaña activa se superpone al precio normal", () => {
    expect(currentPrice([sale, base], day(5))).toBe(sale);
    expect(currentPrice([base, sale], day(9))).toBe(sale);
  });

  it("sin filas activas no se vende", () => {
    expect(currentPrice([sale], day(20))).toBeNull();
    expect(currentPrice([], day(1))).toBeNull();
  });
});

function item(id: number, overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id,
    name: `Item ${id}`,
    description: "",
    category: "costumes",
    subcategory: "outfits",
    image: null,
    previews: [],
    priceAp: 1000,
    salePriceAp: null,
    campaign: null,
    saleEndsAt: null,
    validityDays: null,
    isBundle: false,
    isLimited: false,
    isGiftable: false,
    sortOrder: 0,
    createdAt: day(1),
    ...overrides,
  };
}

const filter = (overrides: Partial<ShopFilter> = {}): ShopFilter => ({
  onSale: false,
  sort: "relevance",
  page: 1,
  ...overrides,
});

const ids = (items: CatalogItem[]) => items.map((i) => i.id);

describe("filterCatalog", () => {
  const items = [
    item(1, { name: "Sombrero de Pirata", sortOrder: 2 }),
    item(2, { name: "Espada Dorada", category: "costumes", subcategory: "weapons", priceAp: 3000 }),
    item(3, {
      name: "Poción de experiencia",
      category: "boosts",
      subcategory: "experience",
      priceAp: 4000,
      salePriceAp: 800,
      createdAt: day(6),
    }),
    item(4, { name: "Sombréro azul", sortOrder: 1, priceAp: 500 }),
  ];

  it("ordena por defecto por el orden de la tienda y luego por id", () => {
    expect(ids(filterCatalog(items, filter()).items)).toEqual([2, 3, 4, 1]);
  });

  it("filtra por categoría y subcategoría", () => {
    expect(ids(filterCatalog(items, filter({ category: "boosts" })).items)).toEqual([3]);
    expect(
      ids(filterCatalog(items, filter({ category: "costumes", subcategory: "weapons" })).items),
    ).toEqual([2]);
  });

  it("busca todas las palabras sin distinguir acentos ni mayúsculas", () => {
    expect(ids(filterCatalog(items, filter({ query: "SOMBRERO" })).items)).toEqual([4, 1]);
    expect(ids(filterCatalog(items, filter({ query: "pirata sombrero" })).items)).toEqual([1]);
    expect(ids(filterCatalog(items, filter({ query: "pocion" })).items)).toEqual([3]);
    expect(filterCatalog(items, filter({ query: "dragón" })).total).toBe(0);
  });

  it("filtra rebajas y precio máximo con el precio final", () => {
    expect(ids(filterCatalog(items, filter({ onSale: true })).items)).toEqual([3]);
    expect(ids(filterCatalog(items, filter({ maxPrice: 1000, sort: "price-asc" })).items)).toEqual([
      4, 3, 1,
    ]);
  });

  it("ordena por precio final y por novedad", () => {
    expect(ids(filterCatalog(items, filter({ sort: "price-desc" })).items)).toEqual([2, 1, 3, 4]);
    expect(ids(filterCatalog(items, filter({ sort: "newest" })).items)).toEqual([3, 4, 2, 1]);
  });

  it("pagina y cuenta el total", () => {
    const many = Array.from({ length: SHOP_PAGE_SIZE + 5 }, (_, i) => item(i + 1));
    const second = filterCatalog(many, filter({ page: 2 }));
    expect(second.total).toBe(SHOP_PAGE_SIZE + 5);
    expect(second.pageCount).toBe(2);
    expect(ids(second.items)).toEqual([25, 26, 27, 28, 29]);
    expect(filterCatalog([], filter()).pageCount).toBe(1);
  });
});

describe("catalogAt", () => {
  const price = (overrides: Partial<PriceRow & { campaign: string }> = {}) => ({
    priceAp: 1000,
    salePriceAp: null,
    campaignId: null,
    campaign: null,
    startsAt: day(1),
    endsAt: null,
    ...overrides,
  });
  const rawBase = {
    name: "Item",
    description: "",
    category: "costumes",
    image: null,
    previews: [],
    validityDays: null,
    isBundle: false,
    isLimited: false,
    isGiftable: false,
    sortOrder: 0,
    createdAt: day(1),
  };
  const raw = (id: number, subcategory: string, prices: ReturnType<typeof price>[]) => ({
    ...rawBase,
    id,
    subcategory,
    prices,
  });
  const shop: ShopData = {
    categories: [
      {
        slug: "costumes",
        name: "Trajes",
        children: [
          { slug: "outfits", name: "Ropa" },
          { slug: "weapons", name: "Armas" },
        ],
      },
      { slug: "boosts", name: "Mejoras", children: [{ slug: "ships", name: "Barcos" }] },
    ],
    items: [
      raw(1, "outfits", [
        price(),
        price({
          salePriceAp: 700,
          campaignId: 9,
          campaign: "Invierno",
          startsAt: day(5),
          endsAt: day(10),
        }),
      ]),
      // Solo tuvo precio en una campaña ya acabada: no está a la venta.
      raw(2, "weapons", [price({ startsAt: day(1), endsAt: day(3) })]),
    ],
  };

  it("aplica la rebaja con su campaña y su fin mientras dura", () => {
    const [sold] = catalogAt(shop, day(6)).items;
    expect(sold).toMatchObject({ priceAp: 1000, salePriceAp: 700, campaign: "Invierno" });
    expect(sold?.saleEndsAt).toEqual(day(10));
    expect(catalogAt(shop, day(11)).items[0]).toMatchObject({ salePriceAp: null, campaign: null });
  });

  it("oculta artículos sin precio y categorías vacías", () => {
    const { items, categories } = catalogAt(shop, day(6));
    expect(items.map((i) => i.id)).toEqual([1]);
    expect(categories).toEqual([
      { slug: "costumes", name: "Trajes", children: [{ slug: "outfits", name: "Ropa" }] },
    ]);
  });
});
