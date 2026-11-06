/**
 * Soporte con preguntas frecuentes (RF-10).
 *
 * En la web original "Soporte" era un enlace `mailto:` sin más (F-23).
 * Aquí hay una página propia, traducida, con las dudas más comunes:
 * - cada pregunta es un `<details>`/`<summary>` nativo: se abre con teclado
 *   y lector de pantalla sin JavaScript, y el texto está en el HTML (los
 *   buscadores lo indexan aunque esté plegado);
 * - las categorías cubren las del formulario de contacto de RF-10 (cuenta,
 *   pagos, migración de personaje, denuncia). El formulario llegará con los
 *   tickets de soporte, cuando exista la cuenta de usuario (T-17).
 *
 * Es estática: se prerenderiza en los 7 idiomas.
 */
import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui";
import { SOCIAL_LINKS } from "@/config/navigation";
import { languageAlternates } from "@/config/site";
import { getLocale, getTranslator } from "@/i18n/server";
import { faqPage } from "@/lib/structured-data";

/** Orden de las preguntas en pantalla. */
const QUESTIONS = ["free", "system", "ap", "password", "report", "migration"] as const;

const DISCORD_URL = SOCIAL_LINKS.find((link) => link.name === "Discord")!.href;

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  return {
    title: t("support.title"),
    description: t("support.description"),
    alternates: { canonical: `/${locale}/support`, languages: languageAlternates("/support") },
  };
}

export default async function SupportPage() {
  const t = await getTranslator();
  return (
    <main className="flex-1 py-8 sm:py-12">
      <JsonLd
        data={faqPage(
          QUESTIONS.map((key) => ({
            question: t(`support.faq.${key}.question`),
            answer: t(`support.faq.${key}.answer`),
          })),
        )}
      />
      <Container className="flex max-w-3xl flex-col gap-8">
        <header>
          <h1 className="font-display text-navy-900 text-4xl font-bold">{t("support.title")}</h1>
          <p className="text-ink-600 mt-2 text-lg">{t("support.intro")}</p>
        </header>

        <section aria-labelledby="faq-title">
          <h2 id="faq-title" className="font-display text-navy-900 text-2xl font-bold">
            {t("support.faqTitle")}
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {QUESTIONS.map((key) => (
              <details
                key={key}
                className="rounded-panel shadow-panel group bg-white open:ring-2 open:ring-sky-300"
              >
                <summary className="text-navy-900 flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 p-4 font-bold">
                  {t(`support.faq.${key}.question`)}
                  <span
                    aria-hidden="true"
                    className="text-gold-700 text-xl transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="text-ink-900 px-4 pb-4">{t(`support.faq.${key}.answer`)}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="community-title"
          className="rounded-panel bg-navy-900 p-6 text-white"
        >
          <h2 id="community-title" className="font-display text-gold-300 text-2xl font-bold">
            {t("support.communityTitle")}
          </h2>
          <p className="mt-2 text-sky-100">{t("support.communityBody")}</p>
          <a
            href={DISCORD_URL}
            rel="noopener noreferrer"
            className="bg-gold-500 text-ink-900 hover:bg-gold-300 mt-4 inline-flex min-h-11 items-center rounded-lg px-5 font-bold"
          >
            {t("support.discord")}
            <span className="sr-only"> {t("nav.externalSite")}</span>
          </a>
        </section>
      </Container>
    </main>
  );
}
