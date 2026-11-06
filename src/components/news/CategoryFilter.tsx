/**
 * Filtro por categoría del listado de noticias.
 *
 * Son enlaces normales (`?category=event`), no botones con JavaScript: cada
 * filtro tiene su URL, se puede compartir, funciona sin JS y lo rastrean los
 * buscadores. El activo lleva `aria-current="page"`.
 */
import Link from "next/link";

import type { PostCategory } from "@/db/schema/content";
import type { Translate } from "@/i18n/translator";

import { POST_CATEGORIES } from "./categories";

const BASE =
  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold whitespace-nowrap";
const ACTIVE = `${BASE} border-navy-900 bg-navy-900 text-white`;
const IDLE = `${BASE} border-parchment-300 bg-white text-navy-900 hover:border-navy-700`;

export interface CategoryFilterProps {
  locale: string;
  current?: PostCategory;
  t: Translate;
}

export function CategoryFilter({ locale, current, t }: CategoryFilterProps) {
  const options = [undefined, ...POST_CATEGORIES] as const;
  return (
    <nav aria-label={t("news.filter")}>
      {/* En móvil se desplaza en horizontal dentro de su caja, nunca la página. */}
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        {options.map((category) => {
          const active = category === current;
          return (
            <li key={category ?? "all"}>
              <Link
                href={category ? `/${locale}/news?category=${category}` : `/${locale}/news`}
                aria-current={active ? "page" : undefined}
                className={active ? ACTIVE : IDLE}
              >
                {t(category ? `news.categories.${category}` : "news.categories.all")}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
