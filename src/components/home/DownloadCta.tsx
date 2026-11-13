/**
 * Cierre de la portada: descargar el juego, con los requisitos a la vista
 * (M-44).
 *
 * Solo dice lo que es cierto: el juego es para Windows y se instala con el
 * launcher oficial o desde Steam. Los requisitos son los mínimos de la
 * ficha de Steam (`config/download.ts`), los mismos que la página de
 * descarga; no se inventan tamaños ni versiones.
 *
 * Fondo marino en los dos temas, como la cabecera y el pie.
 *
 * @see RF-01 Portada · RF-09 Descarga · M-44
 */
import { ButtonLink, Container } from "@/components/ui";
import { CLIENT_VERSION, MINIMUM, STEAM_URL, STORAGE_GB } from "@/config/download";
import type { Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";

export interface DownloadCtaProps {
  locale: Locale;
  t: Translate;
}

export function DownloadCta({ locale, t }: DownloadCtaProps) {
  const requirements = [
    [t("download.requirements.os"), t("download.requirements.osValue")],
    [t("download.requirements.processor"), MINIMUM.processor],
    [t("download.requirements.memory"), `${MINIMUM.memoryMb} MB`],
    [t("download.requirements.graphics"), MINIMUM.graphics],
    [
      t("download.requirements.storage"),
      t("download.requirements.storageValue", { size: STORAGE_GB }),
    ],
  ] as const;

  return (
    <section
      aria-labelledby="download-cta-title"
      className="from-navy-900 to-navy-950 bg-linear-to-b py-12 text-white sm:py-16"
    >
      <Container className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-center">
        <div className="reveal flex flex-col gap-5">
          <h2
            id="download-cta-title"
            className="font-display text-gold-300 text-3xl font-bold sm:text-4xl"
          >
            {t("home.download.title")}
          </h2>
          <p className="text-on-dark max-w-xl text-lg">{t("home.download.body")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={`/${locale}/download`} size="lg">
              {CLIENT_VERSION
                ? t("home.hero.downloadClient", { version: CLIENT_VERSION })
                : t("nav.download")}
            </ButtonLink>
            <a
              href={STEAM_URL}
              rel="noopener"
              className="inline-flex min-h-13 items-center justify-center rounded-lg border-2 border-white/80 px-7 text-lg font-semibold transition-colors hover:bg-white/10"
            >
              {t("download.steam")}
            </a>
          </div>
        </div>
        <div className="rim reveal border-azure-400/25 bg-navy-950/60 relative rounded-xl border p-6">
          <h3 className="font-display text-xl font-bold">{t("download.requirements.title")}</h3>
          <dl className="divide-azure-400/15 mt-3 divide-y text-sm">
            {requirements.map(([name, value]) => (
              <div key={name} className="flex justify-between gap-4 py-2.5">
                <dt className="text-on-dark">{name}</dt>
                <dd className="text-right font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
