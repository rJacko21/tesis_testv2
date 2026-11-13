/**
 * Pasarela de pago simulada (ADR-09).
 *
 * Ocupa el lugar de Xsolla Pay Station en la demostración de la tesis: no
 * cobra dinero. Dice claramente que es una simulación, enseña el paquete y
 * el precio, y ofrece «Pagar» o «Cancelar». Cualquiera de los dos envía el
 * aviso firmado, igual que la pasarela real, y vuelve a la web.
 *
 * Solo la ve el dueño del pago, y solo mientras está pendiente.
 */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { buttonStyles, Container } from "@/components/ui";
import { getLocale, getTranslator } from "@/i18n/server";
import { getSession } from "@/lib/auth/session";
import { formatMoney } from "@/lib/format";
import { mockGatewayAction } from "@/lib/payments/actions";
import { getPayment } from "@/lib/payments/topup";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("topup.gateway.title"), robots: { index: false, follow: false } };
}

export default async function MockCheckoutPage({
  params,
}: PageProps<"/[locale]/topup/checkout/[payment]">) {
  const [{ payment: id }, locale, t] = await Promise.all([params, getLocale(), getTranslator()]);
  const session = await getSession();
  const here = `/${locale}/topup/checkout/${id}`;
  if (!session) redirect(`/${locale}/sign-in?next=${encodeURIComponent(here)}`);

  const payment = await getPayment(Number(session.user.id), id);
  if (!payment) notFound();
  if (payment.status !== "pending") redirect(`/${locale}/topup/return?payment=${id}`);
  const price = formatMoney(locale, payment.amountCents, payment.currency);

  return (
    <main className="flex-1 py-8 sm:py-12">
      <Container className="max-w-xl">
        <p className="bg-gold-300 text-navy-950 rounded-lg p-3 text-sm font-semibold">
          {t("topup.gateway.demo")}
        </p>
        <section
          aria-labelledby="gateway-title"
          className="border-strong bg-surface mt-6 rounded-lg border-2 border-dashed p-6"
        >
          <h1 id="gateway-title" className="font-display text-heading text-3xl font-bold">
            {t("topup.gateway.title")}
          </h1>
          <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
            <dt>{t("topup.gateway.product")}</dt>
            <dd className="text-right font-semibold">
              {t("topup.amount", { ap: payment.apAmount })}
            </dd>
            <dt>{t("topup.gateway.price")}</dt>
            <dd className="text-heading text-right text-xl font-bold">{price}</dd>
          </dl>
          <form action={mockGatewayAction} className="mt-6 flex flex-wrap gap-3">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="payment" value={payment.providerPaymentId} />
            <button
              type="submit"
              name="outcome"
              value="pay"
              className={buttonStyles({ variant: "primary" })}
            >
              {t("topup.gateway.pay", { price })}
            </button>
            <button
              type="submit"
              name="outcome"
              value="cancel"
              className={buttonStyles({ variant: "secondary" })}
            >
              {t("topup.gateway.cancel")}
            </button>
          </form>
        </section>
      </Container>
    </main>
  );
}
