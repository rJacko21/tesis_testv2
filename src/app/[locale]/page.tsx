/**
 * Portada provisional, ya traducida a los 7 idiomas.
 *
 * Sirve para comprobar el enrutado por idioma y el sistema de diseño; la
 * portada real se construye en T-12 según RF-01.
 */
import { ButtonLink } from "@/components/ui";
import { getLocale, getTranslator } from "@/i18n/server";

export default async function HomePage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-4 py-12 sm:px-6">
      <h1 className="font-display text-navy-900 text-4xl font-bold sm:text-5xl">Florensia</h1>
      <p className="text-lg">{t("home.tagline")}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={`/${locale}/play-now`} size="lg">
          {t("nav.playNow")}
        </ButtonLink>
        <ButtonLink href={`/${locale}/download`} size="lg" variant="secondary">
          {t("nav.download")}
        </ButtonLink>
      </div>
      <p className="text-ink-600 text-sm">{t("home.underConstruction")}</p>
    </main>
  );
}
