/**
 * Reglas de enrutado por idioma, como función pura para poder testearlas
 * sin levantar Next.js. El proxy (`src/proxy.ts`) solo las aplica.
 *
 * Todas las páginas viven bajo `/{idioma}/…` (ADR-06). Casos:
 * - `/es/tienda` → se sirve tal cual.
 * - `/pt/…` (código de la web original) o `/PT-br/…` → 301 a `/pt-BR/…`
 *   permanente, para conservar el posicionamiento de las URLs antiguas.
 * - `/tienda` (sin idioma) → 307 a `/{idioma negociado}/tienda`. Es
 *   temporal porque depende del visitante.
 *
 * @see RF-02 · RNF-05 (redirecciones 301 desde URLs antiguas) · F-07
 */
import { isLocale, type Locale, normalizeLocale } from "@/config/locales";

/** Qué hacer con una petición. */
export type LocaleRoute =
  { action: "serve"; locale: Locale } | { action: "redirect"; status: 301 | 307; pathname: string };

/**
 * Decide cómo tratar una ruta.
 *
 * @param pathname - Ruta pedida, p. ej. `/pt/shop`.
 * @param preferred - Idioma negociado para el visitante (cookie o navegador).
 */
export function resolveLocaleRoute(pathname: string, preferred: Locale): LocaleRoute {
  const [, first = "", ...rest] = pathname.split("/");
  const tail = rest.length > 0 ? `/${rest.join("/")}` : "";

  if (isLocale(first)) return { action: "serve", locale: first };

  const canonical = first ? normalizeLocale(first) : null;
  if (canonical) return { action: "redirect", status: 301, pathname: `/${canonical}${tail}` };

  const suffix = pathname === "/" ? "" : pathname;
  return { action: "redirect", status: 307, pathname: `/${preferred}${suffix}` };
}
