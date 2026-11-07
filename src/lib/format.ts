/**
 * Formato de fechas según el idioma de la página.
 *
 * Se usa `Intl` del servidor: el navegador recibe el texto ya formateado y
 * no descarga datos de idioma. Las fechas se muestran en UTC, la zona en la
 * que se guardan (`schema/_columns.ts`), para que el servidor y el
 * prerender den el mismo resultado sin depender de su zona horaria.
 *
 * @see RF-08 (fechas visibles, F-17) · RNF-04 i18n
 */
import type { Locale } from "@/config/locales";

const formatters = new Map<Locale, Intl.DateTimeFormat>();

/** "6 de noviembre de 2026", "November 6, 2026", "6. November 2026"… */
export function formatDate(locale: Locale, date: Date): string {
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });
    formatters.set(locale, formatter);
  }
  return formatter.format(date);
}

/** Valor para el atributo `datetime` de `<time>` (ISO 8601). */
export function isoDate(date: Date): string {
  return date.toISOString();
}

const timeFormatters = new Map<Locale, Intl.DateTimeFormat>();

/** Hora en UTC con el formato del idioma: "17:06", "5:06 PM"… */
export function formatTime(locale: Locale, date: Date): string {
  let formatter = timeFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone: "UTC" });
    timeFormatters.set(locale, formatter);
  }
  return formatter.format(date);
}

/** Importe en céntimos con su moneda (ISO 4217): "4,99 €", "€4.99"… */
export function formatMoney(locale: Locale, cents: number, currency: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}
