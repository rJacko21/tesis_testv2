/**
 * Fecha y hora en UTC dentro de un `<time datetime>`: «6 de noviembre de
 * 2026, 17:06 UTC». La zona se dice siempre, porque el servidor no conoce
 * la del jugador.
 */
import type { Locale } from "@/config/locales";
import { formatDate, formatTime, isoDate } from "@/lib/format";

export function DateTime({ locale, date }: { locale: Locale; date: Date }) {
  return (
    <time dateTime={isoDate(date)}>
      {formatDate(locale, date)}, {formatTime(locale, date)} UTC
    </time>
  );
}
