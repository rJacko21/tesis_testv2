/**
 * Destino tras iniciar sesión (`?next=`).
 *
 * Solo se aceptan rutas internas del mismo idioma. Así un enlace como
 * `/es/sign-in?next=https://otro-sitio` no sirve para llevar al jugador,
 * ya con la sesión iniciada, a una web falsa (redirección abierta, ASVS V5.1.5).
 */
import type { Locale } from "@/config/locales";

export function safeNext(next: string, locale: Locale): string {
  const fallback = `/${locale}/account`;
  if (!next.startsWith(`/${locale}/`) || next.startsWith("//") || /[\\\s]/.test(next)) {
    return fallback;
  }
  return next;
}
