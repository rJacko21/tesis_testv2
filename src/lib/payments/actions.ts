"use server";
/**
 * Server Actions de la recarga de AP (RF-06): empezar una recarga y, en la
 * pasarela simulada, pagar o cancelar.
 *
 * Como la cesta, son formularios normales que terminan en una redirección
 * con el resultado en la URL (patrón PRG) y no añaden JavaScript.
 *
 * @see RF-06 · ADR-09 · M-33
 */
import { redirect } from "next/navigation";

import type { Locale } from "@/config/locales";
import { formLocale, text } from "@/lib/auth/action-helpers";
import { getSession } from "@/lib/auth/session";

import { getPayment, startTopup } from "./topup";
import { mockGatewayNotify } from "./webhook";

const topupPath = (locale: Locale) => `/${locale}/topup`;

async function sessionUser(locale: Locale, back: string) {
  const session = await getSession();
  if (!session) redirect(`/${locale}/sign-in?next=${encodeURIComponent(back)}`);
  return Number(session.user.id);
}

/** Crea el pago del paquete elegido y lleva a la pasarela. */
export async function startTopupAction(form: FormData): Promise<void> {
  const { locale } = await formLocale(form);
  const userId = await sessionUser(locale, topupPath(locale));
  const packageId = Number(text(form, "packageId"));
  const started = Number.isSafeInteger(packageId)
    ? await startTopup(userId, packageId)
    : ({ ok: false, problem: "package" } as const);
  redirect(
    started.ok
      ? `${topupPath(locale)}/checkout/${started.providerPaymentId}`
      : `${topupPath(locale)}?error=${started.problem}`,
  );
}

/**
 * Pasarela simulada (ADR-09): «Pagar» o «Cancelar». Envía el aviso firmado
 * como lo haría la pasarela real y vuelve a la web, que solo lee el estado.
 */
export async function mockGatewayAction(form: FormData): Promise<void> {
  const { locale } = await formLocale(form);
  const id = text(form, "payment");
  const userId = await sessionUser(locale, `${topupPath(locale)}/checkout/${id}`);
  const payment = await getPayment(userId, id);
  if (!payment) redirect(topupPath(locale));

  if (payment.status === "pending") {
    await mockGatewayNotify(payment, text(form, "outcome") === "pay" ? "paid" : "failed");
  }
  redirect(`${topupPath(locale)}/return?payment=${payment.providerPaymentId}`);
}
