/**
 * Recepción de los avisos de pago (webhooks) y proveedor simulado (ADR-09).
 *
 * `receiveNotification` es la única puerta por la que entran AP de una
 * recarga. La usan la ruta `/api/payments/[provider]/webhook` y la pasarela
 * simulada, con el mismo cuerpo firmado que enviaría Xsolla:
 * 1. Comprueba la firma del cuerpo exacto (401 si no vale).
 * 2. Valida el contenido (400).
 * 3. Aplica el aviso una sola vez (`applyNotification`).
 * 4. Si se acreditaron AP, envía el recibo por correo. Un fallo del correo
 *    no deshace la recarga.
 *
 * La pasarela simulada llama a esta función directamente, sin una petición
 * HTTP a la propia web: así no depende de la URL pública del despliegue.
 * Las pruebas envían avisos reales a la ruta para comprobar el camino HTTP.
 *
 * @see RF-06 · ADR-09 · M-33
 */
import "server-only";

import { createHmac } from "node:crypto";

import { eq } from "drizzle-orm";

import { SITE_URL } from "@/config/site";
import { isLocale } from "@/config/locales";
import { users } from "@/db/schema";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { sendMail } from "@/lib/mail/send";
import { topupReceiptMessage } from "@/lib/mail/templates";

import { signatureHeader, verifySignature } from "./signature";
import {
  applyNotification,
  notificationSchema,
  type NotificationOutcome,
  type PaymentNotification,
  type PaymentProvider,
} from "./topup";

/** Clave de los avisos: la configurada o una derivada del secreto de sesión. */
export function webhookSecret(): string {
  return (
    env.PAYMENT_WEBHOOK_SECRET ??
    createHmac("sha256", env.BETTER_AUTH_SECRET).update("payment-webhook").digest("hex")
  );
}

/** Código HTTP de cada resultado: el proveedor reintenta mientras no sea 2xx. */
const HTTP_STATUS: Record<NotificationOutcome["kind"], number> = {
  credited: 200,
  failed: 200,
  duplicate: 200,
  unknown: 404,
  mismatch: 409,
};

/** Recibe un aviso de pago con su cuerpo exacto y su cabecera `Authorization`. */
export async function receiveNotification(
  provider: PaymentProvider,
  body: string,
  authorization: string | null,
): Promise<{ status: number; outcome?: NotificationOutcome["kind"] }> {
  if (!verifySignature(body, authorization, webhookSecret())) return { status: 401 };

  let notification: PaymentNotification;
  try {
    notification = notificationSchema.parse(JSON.parse(body));
  } catch {
    return { status: 400 };
  }

  const outcome = await applyNotification(provider, notification);
  if (outcome.kind === "credited") await sendReceipt(outcome, notification);
  return { status: HTTP_STATUS[outcome.kind], outcome: outcome.kind };
}

/** Recibo por correo en el idioma del jugador. */
async function sendReceipt(
  outcome: Extract<NotificationOutcome, { kind: "credited" }>,
  notification: PaymentNotification,
) {
  try {
    const { db } = await import("@/db/client");
    const [user] = await db
      .select({
        email: users.email,
        name: users.displayUsername,
        login: users.username,
        locale: users.locale,
      })
      .from(users)
      .where(eq(users.id, outcome.userId));
    if (!user) return;
    const locale = isLocale(user.locale) ? user.locale : "en";
    await sendMail(
      await topupReceiptMessage(
        { email: user.email, name: user.name ?? user.login, locale },
        {
          paymentId: outcome.paymentId,
          apAmount: outcome.apAmount,
          price: formatMoney(locale, notification.amount_cents, notification.currency),
          balance: outcome.balance,
        },
        `${SITE_URL}/${locale}/account/topups`,
      ),
    );
  } catch (error) {
    console.error("[pagos] No se pudo enviar el recibo de la recarga:", error);
  }
}

/**
 * Pasarela simulada: «cobra» y avisa como lo haría Xsolla, con el cuerpo
 * firmado. Solo existe para la demostración (ADR-09): no mueve dinero.
 */
export async function mockGatewayNotify(
  payment: { providerPaymentId: string; amountCents: number; currency: string },
  status: "paid" | "failed",
) {
  const body = JSON.stringify({
    provider_payment_id: payment.providerPaymentId,
    status,
    amount_cents: payment.amountCents,
    currency: payment.currency,
  } satisfies PaymentNotification);
  return receiveNotification("mock", body, signatureHeader(body, webhookSecret()));
}
