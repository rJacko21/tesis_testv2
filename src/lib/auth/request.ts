/**
 * Datos de la petición actual para los límites de intentos.
 */
import "server-only";

import { headers } from "next/headers";

/**
 * IP del cliente. Vercel y la mayoría de proxies ponen la IP real como
 * primer valor de `X-Forwarded-For`. Si no hay cabecera (en local), se usa
 * una IP fija: todas las peticiones cuentan juntas, lo que es más estricto.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || h.get("x-real-ip") || "0.0.0.0").slice(0, 45);
}
