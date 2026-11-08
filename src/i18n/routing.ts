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
 * - Rutas de la web original que aquí cambian de nombre (`/en/post/x` →
 *   `/en/news/x`, ver {@link LEGACY_PATHS}) → 301, en un solo salto aunque
 *   además haya que corregir el idioma (`/pt/post/x` → `/pt-BR/news/x`).
 *
 * @see RF-02 · RNF-05 (redirecciones 301 desde URLs antiguas) · F-07
 */
import { isLocale, type Locale, normalizeLocale } from "@/config/locales";
import { RANKING_AREAS, RANKING_CLASS_CODES } from "@/lib/ranking-filters";

/**
 * `/rankings/global/{área}/{clase}` de la web original → `/rankings?area=…&class=…`.
 * Un área o clase que no se reconoce se descarta en lugar de dar 404: el
 * visitante llega al ranking general, que es lo más parecido.
 */
function legacyRanking(rest: string[]): string {
  const [area = "", rawClass = ""] = rest.map((s) => s.toLowerCase());
  const classCode = rawClass.replaceAll(/(?:%20|[\s_])+/g, "-");
  const params = new URLSearchParams();
  if (area !== "all" && (RANKING_AREAS as readonly string[]).includes(area))
    params.set("area", area);
  if (RANKING_CLASS_CODES.includes(classCode)) params.set("class", classCode);
  const query = params.toString();
  return `/rankings${query ? `?${query}` : ""}`;
}

/**
 * Rutas de la web original (Camaleon CMS) con su equivalente aquí, sin el
 * idioma. Cada regla recibe los segmentos que siguen al prefijo.
 */
export const LEGACY_PATHS: readonly { prefix: string; to: (rest: string[]) => string }[] = [
  // Noticias: `/en/post` y `/en/post/{slug}`.
  { prefix: "/post", to: (rest) => (rest.length > 0 ? `/news/${rest.join("/")}` : "/news") },
  // Landing de "Jugar ahora".
  { prefix: "/lp/style1/PlayNow", to: () => "/play-now" },
  // `/register` de esta web: desde el 2026-11-08 el registro está solo en
  // «Jugar ahora», el mismo formulario con el contexto del juego (M-40).
  { prefix: "/register", to: () => "/play-now" },
  // Ficha de la tienda: `/en/shop/detail/index/{id}` → `/shop/item/{id}` (T-19).
  { prefix: "/shop/detail/index", to: (rest) => `/shop/item/${rest.join("/")}` },
  // Rankings: el área y la clase pasan de la ruta a la URL de filtros (RF-07).
  { prefix: "/rankings/global", to: legacyRanking },
];

/**
 * Traduce una ruta antigua sin idioma, o devuelve `null` si no lo es. El
 * resultado puede llevar parámetros (`/rankings?area=sea`); el proxy los
 * suma a los que ya traía la URL (p. ej. `?page=3`).
 */
export function legacyPath(path: string): string | null {
  for (const rule of LEGACY_PATHS) {
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) {
      const rest = path.slice(rule.prefix.length).split("/").filter(Boolean);
      return rule.to(rest);
    }
  }
  return null;
}

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

  const canonical = isLocale(first) ? first : first ? normalizeLocale(first) : null;
  if (canonical) {
    const renamed = legacyPath(tail);
    if (renamed !== null) {
      return { action: "redirect", status: 301, pathname: `/${canonical}${renamed}` };
    }
    if (canonical === first) return { action: "serve", locale: canonical };
    return { action: "redirect", status: 301, pathname: `/${canonical}${tail}` };
  }

  const suffix = pathname === "/" ? "" : pathname;
  return { action: "redirect", status: 307, pathname: `/${preferred}${suffix}` };
}
