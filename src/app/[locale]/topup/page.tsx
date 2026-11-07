/**
 * Recarga de AP (RF-06, F-49).
 *
 * En la web original, «TopUp» abría directamente la pasarela de Xsolla, sin
 * una página que explicara los paquetes, cómo se paga ni qué pasa después
 * (F-49), y el widget de Xsolla se cargaba en todas las páginas (F-48).
 * Aquí:
 * - los paquetes con sus AP, su precio y los AP extra frente al más pequeño;
 * - los pasos: elegir, pagar en la pasarela y recibir los AP con el recibo;
 * - qué son los AP y que no se reembolsan;
 * - sin ningún script de la pasarela: cada paquete es un formulario, y la
 *   pasarela es otra página.
 *
 * Elegir un paquete pide sesión y el correo confirmado (RF-03).
 *
 * Ruta bloqueante (`instant = false`): el aviso de error depende de la URL.
 * Los paquetes están en caché.
 */
import type { Metadata } from "next";

import { buttonStyles, Container } from "@/components/ui";
import { Badge } from "@/components/ui";
import { languageAlternates } from "@/config/site";
import { getLocale, getTranslator } from "@/i18n/server";
import { formatMoney } from "@/lib/format";
import { startTopupAction } from "@/lib/payments/actions";
import { bonusPercent } from "@/lib/payments/bonus";
import { listPackages } from "@/lib/payments/topup";
import { tryLoad } from "@/lib/safe";

export const instant = false;

const ERRORS = ["unverified", "package"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  return {
    title: t("topup.title"),
    description: t("topup.description"),
    alternates: { canonical: `/${locale}/topup`, languages: languageAlternates("/topup") },
  };
}

export default async function TopupPage({ searchParams }: PageProps<"/[locale]/topup">) {
  const [locale, t, query] = await Promise.all([getLocale(), getTranslator(), searchParams]);
  const loaded = await tryLoad("los paquetes de AP", listPackages);
  const packages = loaded.ok ? loaded.data : [];
  const base = packages[0];
  const error = ERRORS.find((code) => code === query.error);

  return (
    <main className="flex-1 py-8 sm:py-12">
      <Container>
        <h1 className="font-display text-navy-900 text-4xl font-bold">{t("topup.title")}</h1>
        <p className="text-ink-600 mt-2 max-w-2xl text-lg">{t("topup.intro")}</p>

        {error ? (
          <p
            role="alert"
            className="border-danger-700 mt-6 max-w-2xl rounded-lg border-l-4 bg-white p-4"
          >
            {t(`topup.errors.${error}`)}
          </p>
        ) : null}

        <section aria-labelledby="topup-packages" className="mt-8">
          <h2 id="topup-packages" className="font-display text-navy-900 text-2xl font-bold">
            {t("topup.packages")}
          </h2>
          {!loaded.ok ? (
            <p role="alert" className="bg-parchment-50 border-gold-500 mt-4 rounded-lg border p-4">
              {t("topup.unavailable")}
            </p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {packages.map((pack) => {
                const bonus = base ? bonusPercent(pack, base) : null;
                const price = formatMoney(locale, pack.priceCents, pack.currency);
                const name = t("topup.amount", { ap: pack.apAmount });
                return (
                  <li key={pack.id}>
                    <article
                      aria-labelledby={`pack-${pack.id}`}
                      className="rounded-panel shadow-panel flex h-full flex-col gap-3 bg-white p-5"
                    >
                      <div className="min-h-6">
                        {bonus ? (
                          <Badge tone="success">{t("topup.bonus", { percent: bonus })}</Badge>
                        ) : null}
                      </div>
                      <h3
                        id={`pack-${pack.id}`}
                        className="font-display text-navy-900 text-3xl font-bold"
                      >
                        {name}
                      </h3>
                      <p className="text-ink-900 text-xl font-semibold">{price}</p>
                      <form action={startTopupAction} className="mt-auto">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="packageId" value={pack.id} />
                        <button
                          type="submit"
                          aria-label={t("topup.buyOne", { name, price })}
                          className={buttonStyles({ variant: "primary", className: "w-full" })}
                        >
                          {t("topup.buy")}
                        </button>
                      </form>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <section aria-labelledby="topup-how">
            <h2 id="topup-how" className="font-display text-navy-900 text-2xl font-bold">
              {t("topup.how.title")}
            </h2>
            <ol className="mt-4 grid list-decimal gap-3 pl-6">
              <li>{t("topup.how.choose")}</li>
              <li>{t("topup.how.pay")}</li>
              <li>{t("topup.how.receive")}</li>
            </ol>
          </section>
          <section aria-labelledby="topup-info">
            <h2 id="topup-info" className="font-display text-navy-900 text-2xl font-bold">
              {t("topup.info.title")}
            </h2>
            <ul className="mt-4 grid list-disc gap-3 pl-6">
              <li>{t("topup.info.methods")}</li>
              <li>{t("topup.info.value")}</li>
              <li>{t("topup.info.verified")}</li>
            </ul>
          </section>
        </div>
      </Container>
    </main>
  );
}
