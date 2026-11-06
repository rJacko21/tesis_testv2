/**
 * Datos generales del sitio usados en metadatos, enlaces canónicos y
 * `hreflang`.
 */
import { DEFAULT_LOCALE, LOCALES } from "./locales";

/**
 * URL pública del sitio, sin barra final. En producción se define con la
 * variable de entorno `SITE_URL` (p. ej. la URL de Vercel).
 */
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * Enlaces alternativos por idioma para una ruta.
 *
 * La web original no tenía `canonical` ni `x-default` y usaba `pt` en vez de
 * `pt-BR` (F-09). Next.js convierte este objeto en etiquetas
 * `<link rel="alternate" hreflang="…">`.
 *
 * @param path - Ruta sin idioma, empezando por `/` (o `""` para la portada).
 * @returns Un mapa idioma → URL relativa, incluido `x-default`.
 */
export function languageAlternates(path: string): Record<string, string> {
  const entries = LOCALES.map((locale) => [locale, `/${locale}${path}`] as const);
  return Object.fromEntries([...entries, ["x-default", `/${DEFAULT_LOCALE}${path}`]]);
}

/**
 * Imagen para compartir en redes (1200 × 630, `scripts/make-og-image.py`).
 * Es relativa, pero Next.js la publica como URL absoluta gracias a
 * `metadataBase`. La original era relativa y, en algunas páginas, la imagen
 * «image-not-found» del CMS (F-12).
 */
export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "Florensia" } as const;
