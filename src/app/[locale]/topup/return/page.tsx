/**
 * Vuelta de la pasarela de pago (RF-06).
 *
 * Solo **lee** el estado del pago: los AP los acredita el aviso firmado de
 * la pasarela, nunca esta página, porque cualquiera puede abrir esta URL
 * sin haber pagado. Si el aviso aún no ha llegado, lo dice.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { buttonStyles, Container } from "@/components/ui";
import { getLocale, getTranslator } from "@/i18n/server";
import { getApBalance } from "@/lib/account/queries";
import { getSession } from "@/lib/auth/session";
import { getPayment } from "@/lib/payments/topup";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("topup.result.title"), robots: { index: false, follow: false } };
}

export default async function TopupReturnPage({
  searchParams,
}: PageProps<"/[locale]/topup/return">) {
  const [locale, t, query] = await Promise.all([getLocale(), getTranslator(), searchParams]);
  const id = typeof query.payment === "string" ? query.payment : "";
  const session = await getSession();
  if (!session) {
    const here = `/${locale}/topup/return?payment=${encodeURIComponent(id)}`;
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(here)}`);
  }
  const userId = Number(session.user.id);
  const payment = await getPayment(userId, id);
  if (!payment) notFound();
  const balance = await getApBalance(userId);

  const message =
    payment.status === "paid"
      ? t("topup.result.paid", { ap: payment.apAmount, balance })
      : payment.status === "pending"
        ? t("topup.result.pending")
        : t("topup.result.failed");

  return (
    <main className="flex-1 py-8 sm:py-12">
      <Container className="max-w-2xl">
        <h1 className="font-display text-heading text-4xl font-bold">{t("topup.result.title")}</h1>
        <p
          role="status"
          className={`mt-6 rounded-lg p-4 ${payment.status === "paid" ? "bg-teal-100 text-teal-900" : "bg-parchment-50 border-parchment-300 border"}`}
        >
          {message}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {payment.status === "paid" ? (
            <>
              <Link href={`/${locale}/shop`} className={buttonStyles({ variant: "primary" })}>
                {t("topup.result.shop")}
              </Link>
              <Link
                href={`/${locale}/account/topups`}
                className={buttonStyles({ variant: "secondary" })}
              >
                {t("topup.result.history")}
              </Link>
            </>
          ) : payment.status === "pending" ? (
            <Link
              href={`/${locale}/topup/return?payment=${payment.providerPaymentId}`}
              className={buttonStyles({ variant: "secondary" })}
            >
              {t("topup.result.refresh")}
            </Link>
          ) : (
            <Link href={`/${locale}/topup`} className={buttonStyles({ variant: "primary" })}>
              {t("topup.result.again")}
            </Link>
          )}
        </div>
      </Container>
    </main>
  );
}
