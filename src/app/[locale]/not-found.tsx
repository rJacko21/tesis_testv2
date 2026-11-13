/**
 * Página 404 traducida.
 *
 * Se muestra cuando una ruta con idioma no existe (`/es/no-existe`) o
 * cuando el idioma de la URL no es válido.
 */
import { ButtonLink } from "@/components/ui";
import { getLocale, getTranslator } from "@/i18n/server";

export default async function NotFound() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-4 py-12">
      <h1 className="font-display text-heading text-3xl font-bold">{t("notFound.title")}</h1>
      <p>{t("notFound.body")}</p>
      <p>
        <ButtonLink href={`/${locale}`} variant="secondary">
          {t("notFound.back")}
        </ButtonLink>
      </p>
    </main>
  );
}
