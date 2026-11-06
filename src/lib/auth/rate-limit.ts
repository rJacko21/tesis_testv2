/**
 * Límite de peticiones en ventana fija, guardado en MySQL (RF-03, RNF-06).
 *
 * En memoria no serviría: en Vercel cada petición puede llegar a una
 * instancia distinta. La comprobación y el incremento son **una sola
 * sentencia** (`INSERT … ON DUPLICATE KEY UPDATE`), así que dos peticiones
 * simultáneas no pueden leer a la vez el mismo contador y pasar las dos.
 */
import "server-only";

import { eq, sql } from "drizzle-orm";

import { rateLimits } from "@/db/schema";

export interface RateLimitResult {
  allowed: boolean;
  /** Segundos hasta que se libera la ventana, si no se permite. */
  retryAfter: number;
}

/**
 * Cuenta una petición para `key` y dice si se permite.
 *
 * @param key - Qué se limita, p. ej. `signup:ip:203.0.113.5`.
 * @param windowSeconds - Duración de la ventana.
 * @param max - Peticiones permitidas por ventana.
 */
export async function consumeRateLimit(
  key: string,
  windowSeconds: number,
  max: number,
): Promise<RateLimitResult> {
  const { db } = await import("@/db/client");
  // Si la ventana caducó, se reinicia a 1; si no, se suma 1.
  const expired = sql`${rateLimits.windowStart} < now(3) - interval ${windowSeconds} second`;
  await db
    .insert(rateLimits)
    .values({ key, count: 1, windowStart: sql`now(3)` })
    .onDuplicateKeyUpdate({
      set: {
        count: sql`if(${expired}, 1, ${rateLimits.count} + 1)`,
        windowStart: sql`if(${expired}, now(3), ${rateLimits.windowStart})`,
      },
    });
  const [row] = await db
    .select({
      count: rateLimits.count,
      remaining: sql<number>`greatest(0, ${windowSeconds} - timestampdiff(second, ${rateLimits.windowStart}, now(3)))`,
    })
    .from(rateLimits)
    .where(eq(rateLimits.key, key));
  const count = row?.count ?? 1;
  return {
    allowed: count <= max,
    retryAfter: count <= max ? 0 : Number(row?.remaining ?? windowSeconds),
  };
}
