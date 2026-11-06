/**
 * Portada provisional, ya traducida a los 7 idiomas.
 *
 * Sirve para comprobar el enrutado por idioma; la portada real se
 * construye en T-12 según RF-01.
 */
import { getTranslator } from "@/i18n/server";

export default async function HomePage() {
  const t = await getTranslator();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-4 py-12">
      <h1 className="font-display text-navy-900 text-4xl font-bold sm:text-5xl">Florensia</h1>
      <p className="text-lg">{t("home.tagline")}</p>
      <p className="text-navy-700 text-sm">{t("home.underConstruction")}</p>
    </main>
  );
}
