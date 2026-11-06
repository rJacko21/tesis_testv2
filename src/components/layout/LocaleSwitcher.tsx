"use client";

/**
 * Selector de idioma.
 *
 * Muestra los 7 idiomas (la web original solo mostraba inglés y alemán,
 * F-01), cada uno con su nombre en su propio idioma, y mantiene la página
 * actual al cambiar (`/de/rankings` → `/es/rankings`).
 *
 * Usa `<details>`/`<summary>` nativos: abrir y cerrar funciona con teclado
 * y lector de pantalla sin JavaScript propio. Solo se necesita JS para leer
 * la ruta actual, por eso es un Client Component pequeño. Los textos llegan
 * ya traducidos desde el servidor.
 *
 * @see RF-02
 */
import { usePathname } from "next/navigation";

import { type Locale, LOCALE_NAMES, LOCALES } from "@/config/locales";

export interface LocaleSwitcherProps {
  /** Idioma de la página actual. */
  current: Locale;
  /** Texto del botón, p. ej. "Idioma". */
  label: string;
  /** Texto accesible del idioma actual, p. ej. "Español (idioma actual)". */
  currentLabel: string;
}

/**
 * Sustituye el idioma de una ruta.
 *
 * @param pathname - Ruta actual, siempre con idioma (lo garantiza el proxy).
 * @param locale - Idioma de destino.
 */
export function switchLocalePath(pathname: string, locale: Locale): string {
  const segments = pathname.split("/");
  segments[1] = locale;
  return segments.join("/") || `/${locale}`;
}

export function LocaleSwitcher({ current, label, currentLabel }: LocaleSwitcherProps) {
  const pathname = usePathname();

  return (
    <details className="group relative">
      <summary className="hover:bg-navy-700 flex min-h-11 cursor-pointer list-none items-center gap-2 rounded px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [&::-webkit-details-marker]:hidden">
        <span>{label}</span>
        <span aria-hidden="true" className="uppercase">
          {current}
        </span>
      </summary>
      <ul className="text-ink-900 absolute right-0 z-10 mt-1 min-w-52 rounded-md bg-white py-1 shadow-lg">
        {LOCALES.map((locale) => (
          <li key={locale}>
            <a
              href={switchLocalePath(pathname, locale)}
              hrefLang={locale}
              lang={locale}
              aria-current={locale === current ? "true" : undefined}
              className="aria-[current]:text-navy-700 block px-4 py-2.5 hover:bg-sky-100 aria-[current]:font-bold"
            >
              {locale === current ? currentLabel : LOCALE_NAMES[locale]}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
