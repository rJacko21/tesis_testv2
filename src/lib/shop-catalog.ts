/**
 * Reglas del catálogo de la tienda (RF-05) como funciones puras: qué precio
 * está vigente, qué artículos entran en un filtro y en qué orden.
 *
 * La tienda tiene decenas o pocos cientos de artículos. `shop.ts` carga el
 * catálogo entero de un idioma una vez (en caché) y estas funciones lo
 * filtran en memoria: cada vista cuesta microsegundos, sin una consulta por
 * combinación de filtros, y las reglas se prueban sin base de datos.
 *
 * @see RF-05 · F-19
 */
import { SHOP_PAGE_SIZE, type ShopFilter } from "./shop-filters";

/** Una fila de `item_prices`. */
export interface PriceRow {
  priceAp: number;
  salePriceAp: number | null;
  campaignId: number | null;
  startsAt: Date;
  endsAt: Date | null;
}

/**
 * Precio vigente de un artículo en un momento.
 *
 * Entre las filas activas (`startsAt ≤ now < endsAt`) gana la que empezó
 * más tarde: una campaña se superpone al precio normal mientras dura y,
 * al acabar, vuelve sola el precio normal. `null` si no hay ninguna activa
 * (el artículo no se vende).
 */
export function currentPrice<T extends PriceRow>(rows: readonly T[], now: Date): T | null {
  let best: T | null = null;
  for (const row of rows) {
    const active = row.startsAt <= now && (row.endsAt === null || row.endsAt > now);
    if (active && (best === null || row.startsAt > best.startsAt)) best = row;
  }
  return best;
}

/** Imagen de un artículo, guardada en la tabla `media`. */
export interface ItemImage {
  src: string;
  width: number;
  height: number;
}

export interface CatalogItem {
  id: number;
  name: string;
  description: string;
  /** Categoría principal y subcategoría (slugs). */
  category: string;
  subcategory: string | null;
  /**
   * Icono del objeto en el juego (32 × 32 px); `null` si el artículo no
   * tiene imagen y se pinta el arte provisional.
   */
  image: ItemImage | null;
  /**
   * Capturas del juego con un personaje que lleva el objeto, como en la
   * tienda oficial. Vacío en los consumibles, que solo tienen icono.
   */
  previews: ItemImage[];
  priceAp: number;
  /** Precio rebajado; `null` sin rebaja. */
  salePriceAp: number | null;
  /** Nombre de la campaña de la rebaja (Festival de invierno…). */
  campaign: string | null;
  /** Fin de la rebaja, para decir hasta cuándo dura. */
  saleEndsAt: Date | null;
  /** Días de validez; `null` = permanente. */
  validityDays: number | null;
  isBundle: boolean;
  isLimited: boolean;
  isGiftable: boolean;
  sortOrder: number;
  createdAt: Date;
}

/** Lo que se paga: el precio rebajado si lo hay. */
export const finalPrice = (item: CatalogItem) => item.salePriceAp ?? item.priceAp;

export interface CatalogPage {
  items: CatalogItem[];
  total: number;
  page: number;
  pageCount: number;
}

/** Quita acentos y pasa a minúsculas: «Sombrero» encuentra «sombréro». */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Aplica filtro, búsqueda, orden y página al catálogo. */
export function filterCatalog(items: readonly CatalogItem[], filter: ShopFilter): CatalogPage {
  const words = filter.query ? fold(filter.query).split(/\s+/).filter(Boolean) : [];
  const matches = items.filter((item) => {
    if (filter.category && item.category !== filter.category) return false;
    if (filter.subcategory && item.subcategory !== filter.subcategory) return false;
    if (filter.onSale && item.salePriceAp === null) return false;
    if (filter.maxPrice && finalPrice(item) > filter.maxPrice) return false;
    if (words.length > 0) {
      // Todas las palabras, en cualquier parte del nombre.
      const name = fold(item.name);
      if (!words.every((word) => name.includes(word))) return false;
    }
    return true;
  });

  const byOrder = (a: CatalogItem, b: CatalogItem) => a.sortOrder - b.sortOrder || a.id - b.id;
  const compare: Record<ShopFilter["sort"], (a: CatalogItem, b: CatalogItem) => number> = {
    relevance: byOrder,
    "price-asc": (a, b) => finalPrice(a) - finalPrice(b) || byOrder(a, b),
    "price-desc": (a, b) => finalPrice(b) - finalPrice(a) || byOrder(a, b),
    newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id,
  };
  matches.sort(compare[filter.sort]);

  const start = (filter.page - 1) * SHOP_PAGE_SIZE;
  return {
    items: matches.slice(start, start + SHOP_PAGE_SIZE),
    total: matches.length,
    page: filter.page,
    pageCount: Math.max(1, Math.ceil(matches.length / SHOP_PAGE_SIZE)),
  };
}

export interface ShopCategory {
  slug: string;
  name: string;
  /** Subcategorías, en el orden de la tienda. */
  children: { slug: string; name: string }[];
}

/** Artículo sin precio calculado, tal como sale de la caché. */
export type RawItem = Omit<CatalogItem, "priceAp" | "salePriceAp" | "campaign" | "saleEndsAt"> & {
  prices: (PriceRow & { campaign: string | null })[];
};

export interface ShopData {
  categories: ShopCategory[];
  items: RawItem[];
}

/**
 * El catálogo a la venta en un momento: aplica el precio vigente, quita los
 * artículos sin precio y las categorías que se quedan vacías.
 */
export function catalogAt(
  shop: ShopData,
  now: Date,
): { categories: ShopCategory[]; items: CatalogItem[] } {
  const items: CatalogItem[] = shop.items.flatMap(({ prices, ...item }) => {
    const price = currentPrice(prices, now) as (typeof prices)[number] | null;
    if (!price) return [];
    const onSale = price.salePriceAp !== null && price.salePriceAp < price.priceAp;
    return [
      {
        ...item,
        priceAp: price.priceAp,
        salePriceAp: onSale ? price.salePriceAp : null,
        campaign: onSale ? price.campaign : null,
        saleEndsAt: onSale ? price.endsAt : null,
      },
    ];
  });

  // Una categoría sin nada a la venta no se muestra (criterio de aceptación).
  const used = new Set(items.map((item) => `${item.category}/${item.subcategory ?? ""}`));
  const categories = shop.categories.flatMap((category) => {
    const children = category.children.filter((child) =>
      used.has(`${category.slug}/${child.slug}`),
    );
    return children.length > 0 || used.has(`${category.slug}/`) ? [{ ...category, children }] : [];
  });
  return { categories, items };
}
