/**
 * Catálogo de la tienda (RF-05).
 *
 * `/es/shop?cat=costumes&sub=outfits&q=sombrero&sale=1&max=2500&sort=price-asc`.
 * Resuelve F-19 y F-44:
 * - Menú de categorías y subcategorías; las vacías no se muestran.
 * - Búsqueda por nombre (sin distinguir acentos), solo rebajas, precio
 *   máximo y orden por precio o novedad. Todo en la URL.
 * - Nombre completo, duración aparte, precio rebajado con el original
 *   tachado y el descuento en texto.
 * - Cada artículo enlaza a su ficha con URL propia.
 * - Sin JavaScript de cliente: formulario GET y enlaces.
 *
 * Las categorías se indexan; las búsquedas, filtros y órdenes no (`noindex`):
 * son combinaciones sin valor para un buscador y duplican las categorías.
 *
 * Ruta bloqueante (`instant = false`), por lo mismo que el ranking: la
 * canónica, el `noindex` y el 404 de un filtro no válido dependen de la URL.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { CategoryNav } from "@/components/shop/CategoryNav";
import { ItemCard } from "@/components/shop/ItemCard";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { buttonStyles, Container } from "@/components/ui";
import { Pagination } from "@/components/ui/Pagination";
import type { Locale } from "@/config/locales";
import { languageAlternates } from "@/config/site";
import { getLocale, getTranslator } from "@/i18n/server";
import { tryLoad } from "@/lib/safe";
import { loadShop } from "@/lib/shop";
import { catalogAt, filterCatalog } from "@/lib/shop-catalog";
import { parseShopQuery, shopHref, type ShopFilter } from "@/lib/shop-filters";

export const instant = false;

type Props = PageProps<"/[locale]/shop">;

/** Hay algo más que categoría y página: búsqueda, filtro u orden. */
const isRefined = (filter: ShopFilter) =>
  Boolean(filter.query || filter.onSale || filter.maxPrice || filter.sort !== "relevance");

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [locale, t, query] = await Promise.all([getLocale(), getTranslator(), searchParams]);
  const filter = parseShopQuery(query);
  // La canónica conserva categoría y página, sin búsqueda, filtros ni orden.
  const canonical = filter
    ? shopHref(locale, {
        category: filter.category,
        subcategory: filter.subcategory,
        page: filter.page,
      })
    : `/${locale}/shop`;
  return {
    title: t("shop.title"),
    description: t("shop.description"),
    alternates: { canonical, languages: languageAlternates("/shop") },
    robots: filter && isRefined(filter) ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: Props) {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  return (
    <main className="flex-1 py-8 sm:py-12">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-navy-900 text-4xl font-bold">{t("shop.title")}</h1>
          <Link href={`/${locale}/cart`} className={buttonStyles({ variant: "secondary" })}>
            {t("shop.cart.view")}
          </Link>
        </div>
        <p className="text-ink-600 mt-2 max-w-2xl text-lg">{t("shop.intro")}</p>
        <ShopResults locale={locale} searchParams={searchParams} />
      </Container>
    </main>
  );
}

async function ShopResults({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Props["searchParams"];
}) {
  const filter = parseShopQuery(await searchParams);
  if (!filter) notFound();
  // El precio vigente depende de la hora de la petición.
  await connection();

  const [t, loaded] = await Promise.all([
    getTranslator(),
    tryLoad("la tienda", () => loadShop(locale)),
  ]);
  if (!loaded.ok) {
    return (
      <p role="alert" className="bg-parchment-50 border-gold-500 mt-6 rounded-lg border p-4">
        {t("shop.unavailable")}
      </p>
    );
  }

  const { categories, items } = catalogAt(loaded.data, new Date());
  if (filter.category) {
    const category = categories.find((c) => c.slug === filter.category);
    if (!category) notFound();
    if (filter.subcategory && !category.children.some((c) => c.slug === filter.subcategory))
      notFound();
  }
  const result = filterCatalog(items, filter);
  if (filter.page > result.pageCount) notFound();

  return (
    <>
      <CategoryNav locale={locale} categories={categories} filter={filter} t={t} />
      <ShopFilters locale={locale} filter={filter} t={t} />

      <p role="status" className="text-ink-600 mt-6 text-sm">
        <strong className="text-navy-900">{t("shop.results", { total: result.total })}</strong>
        {filter.query ? <> · {t("shop.searchNote", { query: filter.query })}</> : null}
      </p>

      {result.items.length === 0 ? (
        <p className="bg-parchment-50 border-parchment-300 mt-4 max-w-2xl rounded-lg border p-4">
          {items.length === 0
            ? t("shop.emptyShop")
            : filter.query
              ? t("shop.emptySearch", { query: filter.query })
              : t("shop.empty")}
        </p>
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {result.items.map((item) => (
              <li key={item.id}>
                <ItemCard item={item} locale={locale} t={t} />
              </li>
            ))}
          </ul>
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            hrefFor={(page) => shopHref(locale, filter, page)}
            t={t}
          />
        </>
      )}
    </>
  );
}
