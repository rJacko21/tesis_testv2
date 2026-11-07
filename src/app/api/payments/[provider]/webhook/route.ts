/**
 * Avisos de pago firmados (webhook) del proveedor (RF-06, ADR-09).
 *
 * `POST /api/payments/mock/webhook` con el cuerpo JSON y
 * `Authorization: Signature <hex>`. Responde 200 si el aviso se aplicó o ya
 * estaba aplicado (idempotente), 401 con una firma no válida, 400 con un
 * cuerpo no válido, 404 si el pago no existe y 409 si el importe no cuadra.
 *
 * No usa sesión ni cookies: la autenticidad la da la firma.
 */
import { receiveNotification } from "@/lib/payments/webhook";

/** Tamaño máximo de un aviso: unos cientos de bytes bastan. */
const MAX_BODY = 4096;

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/payments/[provider]/webhook">,
) {
  const { provider } = await params;
  if (provider !== "mock") return new Response(null, { status: 404 });

  const body = await request.text();
  if (body.length > MAX_BODY) return new Response(null, { status: 413 });
  const { status } = await receiveNotification(
    provider,
    body,
    request.headers.get("authorization"),
  );
  return new Response(null, { status, headers: { "Cache-Control": "no-store" } });
}
