/**
 * Elección del idioma para una petición sin idioma en la URL.
 *
 * Orden de preferencia:
 * 1. La cookie `NEXT_LOCALE` (el idioma que el usuario eligió antes).
 * 2. La cabecera `Accept-Language` del navegador.
 * 3. {@link DEFAULT_LOCALE}.
 *
 * Se implementa sin dependencias porque el algoritmo es corto y se ejecuta
 * en el proxy, antes de cada petición: menos código = menos latencia.
 *
 * @see RF-02 (primera visita: idioma propuesto según Accept-Language)
 */
import { DEFAULT_LOCALE, type Locale, LOCALES, normalizeLocale } from "@/config/locales";

/** Nombre de la cookie que recuerda el idioma elegido. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Una entrada de `Accept-Language` ya interpretada. */
interface LanguageRange {
  tag: string;
  quality: number;
}

/**
 * Interpreta una cabecera `Accept-Language` (RFC 9110 §12.5.4).
 *
 * @param header - Valor de la cabecera, p. ej. `"es-AR,es;q=0.9,en;q=0.8"`.
 * @returns Las etiquetas ordenadas de mayor a menor preferencia, sin `*` ni
 *   entradas con calidad 0.
 */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];

  const ranges: LanguageRange[] = [];
  for (const part of header.split(",")) {
    const [rawTag, ...params] = part.trim().split(";");
    const tag = rawTag?.trim();
    if (!tag || tag === "*") continue;

    const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    const quality = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
    if (!Number.isFinite(quality) || quality <= 0) continue;

    ranges.push({ tag, quality });
  }

  // `sort` es estable: a igual calidad se respeta el orden de la cabecera.
  return ranges.sort((a, b) => b.quality - a.quality).map((range) => range.tag);
}

/**
 * Busca el idioma admitido que mejor encaja con una etiqueta del navegador.
 *
 * Primero coincidencia exacta (`pt-BR`), después por idioma base: `es-AR` →
 * `es`, y `pt-PT` o `pt` → `pt-BR`, el único portugués del sitio.
 */
function matchTag(tag: string): Locale | null {
  const exact = normalizeLocale(tag);
  if (exact) return exact;

  const base = tag.split("-")[0]?.toLowerCase();
  if (!base) return null;
  return LOCALES.find((locale) => locale.split("-")[0]?.toLowerCase() === base) ?? null;
}

/**
 * Decide el idioma de una petición.
 *
 * @param cookieValue - Valor de la cookie {@link LOCALE_COOKIE}, si existe.
 * @param acceptLanguage - Valor de la cabecera `Accept-Language`, si existe.
 * @returns Siempre un idioma admitido.
 */
export function negotiateLocale(
  cookieValue: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (cookieValue) {
    const fromCookie = normalizeLocale(cookieValue);
    if (fromCookie) return fromCookie;
  }

  for (const tag of parseAcceptLanguage(acceptLanguage)) {
    const match = matchTag(tag);
    if (match) return match;
  }

  return DEFAULT_LOCALE;
}
