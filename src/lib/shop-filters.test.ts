import { describe, expect, it } from "vitest";

import { discountPercent, parseItemId, parseShopQuery, shopHref } from "./shop-filters";

describe("parseShopQuery", () => {
  it("sin parámetros: todo el catálogo por relevancia", () => {
    expect(parseShopQuery({})).toEqual({
      category: undefined,
      subcategory: undefined,
      query: undefined,
      onSale: false,
      maxPrice: undefined,
      sort: "relevance",
      page: 1,
    });
  });

  it("lee categoría, búsqueda, oferta, precio, orden y página", () => {
    expect(
      parseShopQuery({
        cat: "costumes",
        sub: "outfits",
        q: " coat ",
        sale: "1",
        max: "2500",
        sort: "price-asc",
        page: "2",
      }),
    ).toEqual({
      category: "costumes",
      subcategory: "outfits",
      query: "coat",
      onSale: true,
      maxPrice: 2500,
      sort: "price-asc",
      page: 2,
    });
  });

  it("los valores vacíos del formulario cuentan como ausentes", () => {
    expect(parseShopQuery({ cat: "", sort: "", max: "", q: "" })?.sort).toBe("relevance");
  });

  it.each([
    { cat: "Costumes" },
    { sub: "outfits" },
    { sale: "yes" },
    { max: "1234" },
    { sort: "cheapest" },
    { page: "0" },
    { page: "02" },
    { cat: ["a", "b"] },
  ])("rechaza %o", (raw) => {
    expect(parseShopQuery(raw)).toBeNull();
  });
});

describe("shopHref", () => {
  it("omite lo que está por defecto y conserva el filtro al paginar", () => {
    expect(shopHref("es", {})).toBe("/es/shop");
    expect(shopHref("es", { category: "costumes", onSale: true, sort: "price-asc" }, 3)).toBe(
      "/es/shop?cat=costumes&sale=1&sort=price-asc&page=3",
    );
  });
});

describe("discountPercent", () => {
  it("redondea hacia abajo para no prometer de más", () => {
    expect(discountPercent(1500, 1000)).toBe(33);
    expect(discountPercent(1000, 700)).toBe(30);
  });

  it("sin rebaja real, null", () => {
    expect(discountPercent(1000, null)).toBeNull();
    expect(discountPercent(1000, 1000)).toBeNull();
  });
});

describe("parseItemId", () => {
  it("solo enteros positivos", () => {
    expect(parseItemId("12")).toBe(12);
    expect(parseItemId("0")).toBeNull();
    expect(parseItemId("12a")).toBeNull();
  });
});
