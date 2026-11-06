/**
 * Paginación de listados (noticias y rankings): Anterior, "Página 2 de 5" y Siguiente.
 *
 * Con enlaces reales (`?page=2`): la web original no tenía listado
 * paginado ni indexable (F-14). Los enlaces que no aplican (Anterior en la
 * primera página) no se muestran, en lugar de dejarlos deshabilitados sin
 * explicación.
 */
import Link from "next/link";

import type { Translate } from "@/i18n/translator";

const LINK =
  "border-parchment-300 text-navy-900 hover:border-navy-700 inline-flex min-h-11 items-center rounded-lg border bg-white px-4 font-bold";

export interface PaginationProps {
  page: number;
  pageCount: number;
  /** URL de una página concreta, conservando el filtro. */
  hrefFor: (page: number) => string;
  t: Translate;
}

export function Pagination({ page, pageCount, hrefFor, t }: PaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label={t("pagination.label")} className="mt-8">
      <ul className="flex items-center justify-between gap-4">
        <li className="min-w-0 flex-1">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} rel="prev" className={LINK}>
              <span aria-hidden="true">←&nbsp;</span>
              {t("pagination.previous")}
            </Link>
          ) : null}
        </li>
        <li className="text-ink-600 text-center text-sm">
          {t("pagination.page", { page, count: pageCount })}
        </li>
        <li className="flex min-w-0 flex-1 justify-end">
          {page < pageCount ? (
            <Link href={hrefFor(page + 1)} rel="next" className={LINK}>
              {t("pagination.next")}
              <span aria-hidden="true">&nbsp;→</span>
            </Link>
          ) : null}
        </li>
      </ul>
    </nav>
  );
}
