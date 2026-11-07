/**
 * Menú de categorías de la tienda: «Todo», las categorías principales y,
 * debajo de la elegida, sus subcategorías.
 *
 * Son enlaces normales a la URL filtrada (`?cat=costumes&sub=outfits`) con
 * `aria-current`. En móvil cada fila se desplaza en horizontal dentro de su
 * caja, sin mover la página. Al cambiar de categoría se conservan la
 * búsqueda y el orden, y se vuelve a la página 1.
 */
import Link from "next/link";

import type { Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";
import type { ShopCategory } from "@/lib/shop-catalog";
import { shopHref, type ShopFilter } from "@/lib/shop-filters";

const PILL =
  "border-parchment-300 text-navy-900 hover:border-navy-700 aria-[current]:bg-navy-900 aria-[current]:border-navy-900 inline-flex min-h-11 items-center rounded-full border bg-white px-4 font-semibold whitespace-nowrap aria-[current]:text-white";

export interface CategoryNavProps {
  locale: Locale;
  categories: readonly ShopCategory[];
  filter: ShopFilter;
  t: Translate;
}

export function CategoryNav({ locale, categories, filter, t }: CategoryNavProps) {
  const selected = categories.find((category) => category.slug === filter.category);
  const href = (category?: string, subcategory?: string) =>
    shopHref(locale, { ...filter, category, subcategory }, 1);
  const current = (match: boolean) => (match ? ("page" as const) : undefined);

  return (
    <nav aria-label={t("shop.categories.label")} className="mt-6">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <li>
          <Link href={href()} aria-current={current(!filter.category)} className={PILL}>
            {t("shop.categories.all")}
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={href(category.slug)}
              aria-current={current(filter.category === category.slug && !filter.subcategory)}
              className={PILL}
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
      {selected && selected.children.length > 0 ? (
        <ul
          aria-label={selected.name}
          className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 text-sm"
        >
          {selected.children.map((child) => (
            <li key={child.slug}>
              <Link
                href={href(selected.slug, child.slug)}
                aria-current={current(filter.subcategory === child.slug)}
                className={PILL}
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}
