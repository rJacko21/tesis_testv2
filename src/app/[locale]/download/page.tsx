/**
 * Descarga del juego (RF-09).
 *
 * - Detecta el sistema en el servidor y adapta el mensaje: en Windows
 *   "puedes jugar"; en Mac/Linux, que necesita Windows; en el móvil, que es
 *   un juego de PC. El botón de Steam está siempre, se detecte lo que se
 *   detecte (la detección puede fallar).
 * - Requisitos mínimos y recomendados en una tabla real, con los datos de
 *   la ficha oficial de Steam (`config/download.ts`).
 * - La página es estática salvo la recomendación, que llega en streaming
 *   dentro de `<Suspense>`.
 *
 * @see RF-09 · F-24 (la web original enviaba a otro dominio solo en inglés)
 */
import type { Metadata } from "next";
import { Suspense } from "react";

import { DetectedPlatformAdvice, PlatformAdvice } from "@/components/download/PlatformAdvice";
import { RequirementsTable } from "@/components/download/RequirementsTable";
import { ButtonLink, Container } from "@/components/ui";
import { CLIENT_VERSION, INSTALLER_URL, STEAM_URL } from "@/config/download";
import { languageAlternates } from "@/config/site";
import { getLocale, getTranslator } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  return {
    title: t("download.title"),
    description: t("download.description"),
    alternates: { canonical: `/${locale}/download`, languages: languageAlternates("/download") },
  };
}

export default async function DownloadPage() {
  const t = await getTranslator();
  const external = t("nav.externalSite");

  return (
    <main className="flex-1">
      <section className="from-navy-700 to-navy-950 bg-linear-to-b py-10 text-white sm:py-14">
        <Container className="flex flex-col gap-4">
          <p className="border-gold-500/60 text-gold-300 w-fit rounded-full border px-3 py-1 text-sm font-bold uppercase">
            {t("download.free")}
            {CLIENT_VERSION ? ` · ${t("download.version", { version: CLIENT_VERSION })}` : null}
          </p>
          <h1 className="font-display text-gold-300 text-4xl font-extrabold sm:text-5xl">
            {t("download.title")}
          </h1>
          <p className="text-on-dark max-w-2xl text-lg">{t("download.intro")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={STEAM_URL} size="lg" rel="noopener noreferrer">
              {t("download.steam")}
              <span className="sr-only"> {external}</span>
            </ButtonLink>
            {INSTALLER_URL ? (
              <ButtonLink href={INSTALLER_URL} size="lg" variant="onDark">
                {t("download.installer")}
              </ButtonLink>
            ) : null}
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-10 py-10">
        <Suspense fallback={<PlatformAdvice platform="unknown" t={t} />}>
          <DetectedPlatformAdvice t={t} />
        </Suspense>

        <section aria-labelledby="steps-title">
          <h2 id="steps-title" className="font-display text-heading text-3xl font-bold">
            {t("download.steps.title")}
          </h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {(["one", "two", "three"] as const).map((step, i) => (
              <li key={step} className="rounded-panel shadow-panel bg-surface flex gap-3 p-4">
                <span
                  aria-hidden="true"
                  className="bg-gold-500 text-navy-950 flex size-8 shrink-0 items-center justify-center rounded-full font-bold"
                >
                  {i + 1}
                </span>
                <span>{t(`download.steps.${step}`)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="requirements-title">
          <h2 id="requirements-title" className="font-display text-heading text-3xl font-bold">
            {t("download.requirements.title")}
          </h2>
          <div className="mt-4">
            <RequirementsTable t={t} />
          </div>
        </section>
      </Container>
    </main>
  );
}
