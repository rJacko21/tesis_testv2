/**
 * Tarjeta de un artículo en el listado de la tienda.
 *
 * - `<article>` con el nombre como encabezado y enlace a su ficha, que
 *   tiene URL propia (F-44). Toda la tarjeta es clicable sin anidar enlaces.
 * - El nombre completo está en el HTML: se recorta a dos líneas con CSS y
 *   el atributo `title` lo enseña entero. La web original lo cortaba con
 *   «…» en el servidor y no había forma de leerlo (F-19).
 * - La duración va aparte del nombre, como texto propio (F-19).
 */
import Link from "next/link";

import type { Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";
import type { CatalogItem } from "@/lib/shop-catalog";
import { itemHref } from "@/lib/shop-filters";

import { ItemArt } from "./ItemArt";
import { ItemBadges, validityLabel } from "./ItemBadges";
import { ItemPrice } from "./ItemPrice";

export interface ItemCardProps {
  item: CatalogItem;
  locale: Locale;
  t: Translate;
}

export function ItemCard({ item, locale, t }: ItemCardProps) {
  return (
    <article className="rim lift rounded-panel shadow-panel focus-within:outline-gold-500 bg-surface relative flex h-full flex-col overflow-hidden focus-within:outline-3 focus-within:outline-offset-2">
      <ItemArt
        category={item.category}
        subcategory={item.subcategory}
        image={item.image}
        wide={item.image !== null}
      />
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <ItemBadges item={item} t={t} />
        <h2 className="text-heading leading-snug font-bold">
          <Link
            href={itemHref(locale, item.id)}
            title={item.name}
            className="line-clamp-2 after:absolute after:inset-0 hover:underline focus:outline-none"
          >
            {item.name}
          </Link>
        </h2>
        <p className="text-ink-600 text-sm">{validityLabel(item.validityDays, t)}</p>
        <div className="mt-auto">
          <ItemPrice item={item} t={t} />
        </div>
      </div>
    </article>
  );
}
