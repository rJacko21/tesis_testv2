/**
 * Filtros del catálogo de la tienda (RF-05) como funciones puras: leer la
 * URL, construir enlaces y calcular descuentos. Sin base de datos, para
 * probarlos solos.
 *
 * Todo vive en la URL (`/es/shop?cat=costumes&sub=outfits&sale=1&sort=price-asc`):
 * cada vista se puede compartir, y la paginación conserva el filtro. Es lo
 * que faltaba en la web original: sin buscador, filtros ni ordenación (F-19)
 * y sin URL por artículo (F-44).
 *
 * @see RF-05 · F-19 · F-44
 */
import type { Locale } from "@/config/locales";

/** Artículos por página: múltiplo de 2, 3 y 4 columnas. */
export const SHOP_PAGE_SIZE = 24;

/** Longitud máxima de la búsqueda. */
export const SHOP_QUERY_MAX = 40;

export const SHOP_SORTS = ["relevance", "price-asc", "price-desc", "newest"] as const;
export type ShopSort = (typeof SHOP_SORTS)[number];

/** Topes de precio que ofrece el filtro, en AP. */
export const SHOP_PRICE_STEPS = [1000, 2500, 5000] as const;

const SLUG = /^[a-z0-9-]{1,60}$/;

export interface ShopFilter {
  /** Slug de la categoría principal (`costumes`). */
  category?: string;
  /** Slug de la subcategoría (`outfits`); solo con `category`. */
  subcategory?: string;
  /** Texto buscado en el nombre. */
  query?: string;
  /** Solo artículos rebajados. */
  onSale: boolean;
  /** Precio máximo en AP (precio final, con la rebaja). */
  maxPrice?: number;
  sort: ShopSort;
  page: number;
}

type RawQuery = Record<string, string | string[] | undefined>;

/**
 * Lee el filtro de la URL.
 *
 * @returns `null` si algún parámetro no es válido o está repetido: la
 *   página responde entonces 404 en lugar de un listado vacío.
 */
export function parseShopQuery(raw: RawQuery): ShopFilter | null {
  const value = (key: string): string | undefined | null => {
    const v = raw[key];
    // Un valor vacío cuenta como ausente: el formulario envía `sort=` y `max=` vacíos.
    return Array.isArray(v) ? null : v?.trim() || undefined;
  };
  const [category, subcategory, query, sale, max, sort, rawPage] = [
    "cat",
    "sub",
    "q",
    "sale",
    "max",
    "sort",
    "page",
  ].map(value);
  if ([category, subcategory, query, sale, max, sort, rawPage].includes(null)) return null;

  if (category !== undefined && !SLUG.test(category!)) return null;
  if (subcategory !== undefined && (category === undefined || !SLUG.test(subcategory!)))
    return null;
  if (sale !== undefined && sale !== "1") return null;
  if (sort !== undefined && !(SHOP_SORTS as readonly string[]).includes(sort!)) return null;

  let maxPrice: number | undefined;
  if (max !== undefined) {
    maxPrice = Number(max);
    if (!(SHOP_PRICE_STEPS as readonly number[]).includes(maxPrice)) return null;
  }

  const page = rawPage === undefined ? 1 : Number(rawPage);
  if (!Number.isSafeInteger(page) || page < 1 || String(page) !== (rawPage ?? "1")) return null;

  return {
    category: category ?? undefined,
    subcategory: subcategory ?? undefined,
    query: query?.slice(0, SHOP_QUERY_MAX),
    onSale: sale === "1",
    maxPrice,
    sort: (sort as ShopSort | undefined) ?? "relevance",
    page,
  };
}

/** Enlace a una vista del catálogo, sin los parámetros por defecto. */
export function shopHref(locale: Locale, filter: Partial<ShopFilter>, page = filter.page ?? 1) {
  const params = new URLSearchParams();
  if (filter.category) params.set("cat", filter.category);
  if (filter.category && filter.subcategory) params.set("sub", filter.subcategory);
  if (filter.query) params.set("q", filter.query);
  if (filter.onSale) params.set("sale", "1");
  if (filter.maxPrice) params.set("max", String(filter.maxPrice));
  if (filter.sort && filter.sort !== "relevance") params.set("sort", filter.sort);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return `/${locale}/shop${search ? `?${search}` : ""}`;
}

/** Enlace a la ficha de un artículo. */
export const itemHref = (locale: Locale, id: number) => `/${locale}/shop/item/${id}`;

/**
 * Descuento en porcentaje entero, redondeado hacia abajo para no prometer
 * más de lo real: 1500 → 1000 es «-33 %». `null` si no hay rebaja.
 */
export function discountPercent(priceAp: number, salePriceAp: number | null): number | null {
  if (salePriceAp === null || salePriceAp >= priceAp || priceAp <= 0) return null;
  return Math.floor(((priceAp - salePriceAp) / priceAp) * 100);
}

/** Id de artículo de la URL (`/shop/item/12`): entero positivo o `null`. */
export function parseItemId(raw: string): number | null {
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}
