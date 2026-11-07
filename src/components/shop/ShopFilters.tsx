/**
 * Búsqueda, filtros y orden de la tienda (RF-05, F-19).
 *
 * Un `<form method="get">` normal, como el del ranking: funciona sin
 * JavaScript, no añade nada al paquete del cliente y el resultado es una
 * URL que se puede compartir. La categoría elegida viaja en campos ocultos,
 * y al filtrar se vuelve a la página 1.
 */
import Link from "next/link";

import { buttonStyles } from "@/components/ui";
import type { Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";
import {
  SHOP_PRICE_STEPS,
  SHOP_QUERY_MAX,
  SHOP_SORTS,
  shopHref,
  type ShopFilter,
} from "@/lib/shop-filters";

const FIELD =
  "border-parchment-300 text-ink-900 min-h-11 w-full rounded-lg border bg-white px-3 focus:border-navy-700";
const LABEL = "text-navy-900 mb-1 block text-sm font-bold";

export interface ShopFiltersProps {
  locale: Locale;
  filter: ShopFilter;
  t: Translate;
}

export function ShopFilters({ locale, filter, t }: ShopFiltersProps) {
  const hasFilters =
    filter.query || filter.onSale || filter.maxPrice || filter.sort !== "relevance";
  return (
    <form
      method="get"
      action={`/${locale}/shop`}
      aria-label={t("shop.filters.label")}
      className="bg-parchment-50 border-parchment-300 mt-4 grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto]"
    >
      {filter.category ? <input type="hidden" name="cat" value={filter.category} /> : null}
      {filter.subcategory ? <input type="hidden" name="sub" value={filter.subcategory} /> : null}

      <div className="sm:col-span-2 lg:col-span-1">
        <label htmlFor="shop-q" className={LABEL}>
          {t("shop.filters.search")}
        </label>
        <input
          id="shop-q"
          name="q"
          type="search"
          defaultValue={filter.query ?? ""}
          maxLength={SHOP_QUERY_MAX}
          autoComplete="off"
          aria-describedby="shop-q-hint"
          className={FIELD}
        />
        <p id="shop-q-hint" className="text-ink-600 mt-1 text-xs">
          {t("shop.filters.searchHint")}
        </p>
      </div>

      <div>
        <label htmlFor="shop-max" className={LABEL}>
          {t("shop.filters.maxPrice")}
        </label>
        <select id="shop-max" name="max" defaultValue={filter.maxPrice ?? ""} className={FIELD}>
          <option value="">{t("shop.filters.anyPrice")}</option>
          {SHOP_PRICE_STEPS.map((step) => (
            <option key={step} value={step}>
              {t("shop.filters.upTo", { amount: step })}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="shop-sort" className={LABEL}>
          {t("shop.filters.sort")}
        </label>
        <select id="shop-sort" name="sort" defaultValue={filter.sort} className={FIELD}>
          {SHOP_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {t(`shop.filters.sorts.${sort}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:col-span-2 lg:col-span-1 lg:mt-6 lg:flex-col lg:items-stretch">
        <label className="text-navy-900 inline-flex min-h-11 items-center gap-2 font-semibold">
          <input
            type="checkbox"
            name="sale"
            value="1"
            defaultChecked={filter.onSale}
            className="accent-navy-900 size-5"
          />
          {t("shop.filters.onSale")}
        </label>
        <button type="submit" className={buttonStyles({ variant: "secondary" })}>
          {t("shop.filters.apply")}
        </button>
        {hasFilters ? (
          <Link
            href={shopHref(locale, { category: filter.category, subcategory: filter.subcategory })}
            className={buttonStyles({ variant: "ghost" })}
          >
            {t("shop.filters.reset")}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
