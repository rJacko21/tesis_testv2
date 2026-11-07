/**
 * Descarga de los datos de la cuenta en JSON (RGPD, art. 15 y 20; RF-04).
 *
 * - Solo con sesión, y solo los datos de esa sesión.
 * - `Cache-Control: no-store`: son datos personales y nunca deben quedar en
 *   una caché compartida.
 * - Límite de 5 descargas por hora y cuenta: reunir los datos recorre
 *   varias tablas.
 * - Un GET sin efectos: aunque otro sitio enlace aquí, el navegador no le
 *   deja leer la respuesta (política del mismo origen).
 */
import { exportAccountData } from "@/lib/account/privacy";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getSession } from "@/lib/auth/session";

const PRIVATE = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) return new Response(null, { status: 401, headers: PRIVATE });

  const userId = Number(session.user.id);
  const limit = await consumeRateLimit(`export:user:${userId}`, 60 * 60, 5);
  if (!limit.allowed) {
    return new Response(null, {
      status: 429,
      headers: { ...PRIVATE, "Retry-After": String(limit.retryAfter) },
    });
  }

  const data = await exportAccountData(userId);
  if (!data) return new Response(null, { status: 404, headers: PRIVATE });
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      ...PRIVATE,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="florensia-account-${day}.json"`,
    },
  });
}
