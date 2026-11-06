/**
 * Configuración central de idiomas.
 *
 * Única fuente de verdad para los 7 idiomas del sitio. El enrutado, el
 * selector de idioma, `hreflang`, el sitemap y la tabla `locales` de MySQL
 * se derivan de esta lista, para que añadir o quitar un idioma sea un único
 * cambio.
 *
 * @see RF-02 Navegación global y selector de idioma
 * @see RNF-04 i18n
 * @see ADR-06 next-intl y rutas con prefijo
 */

/** Códigos BCP 47 admitidos, en el orden en que se muestran en el selector. */
export const LOCALES = ["en", "pt-BR", "tr", "it", "de", "fr", "es"] as const;

/** Un código de idioma admitido por el sitio. */
export type Locale = (typeof LOCALES)[number];

/** Idioma usado como `x-default` y cuando no se puede detectar otro. */
export const DEFAULT_LOCALE: Locale = "en";

/**
 * Nombre de cada idioma escrito en ese mismo idioma (endónimo).
 *
 * El selector muestra endónimos porque quien no entiende el idioma actual
 * debe poder reconocer el suyo (fallo F-01 de la web original).
 */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
  tr: "Türkçe",
  it: "Italiano",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
};

/**
 * Redirecciones desde códigos de la web original que ya no existen.
 *
 * La web original usaba `/pt`; aquí es `pt-BR` (ADR-06). Se mantiene la
 * correspondencia para emitir 301 y no perder posicionamiento.
 */
export const LEGACY_LOCALE_ALIASES: Readonly<Record<string, Locale>> = {
  pt: "pt-BR",
};

/**
 * Comprueba si un texto es un código de idioma admitido.
 *
 * @param value - Texto a comprobar, por ejemplo el primer segmento de la URL.
 * @returns `true` si `value` es exactamente uno de {@link LOCALES}.
 */
export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Convierte un código cualquiera (de la URL, de una cookie o de un alias
 * antiguo) en un idioma admitido.
 *
 * La comparación ignora mayúsculas porque los navegadores y enlaces externos
 * no son consistentes (`pt-br`, `PT-BR`).
 *
 * @param value - Código a normalizar.
 * @returns El idioma admitido equivalente, o `null` si no hay ninguno.
 */
export function normalizeLocale(value: string): Locale | null {
  const lower = value.toLowerCase();
  const match = LOCALES.find((locale) => locale.toLowerCase() === lower);
  if (match) return match;
  return LEGACY_LOCALE_ALIASES[lower] ?? null;
}
