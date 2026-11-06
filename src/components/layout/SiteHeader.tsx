/**
 * Cabecera del sitio (versión inicial).
 *
 * Contiene la marca y el selector de idioma. La navegación completa con
 * menú móvil accesible llega en T-11, sobre los componentes de T-09.
 */
import Link from "next/link";

import { Container } from "@/components/ui";
import { LOCALE_NAMES } from "@/config/locales";
import { getLocale, getTranslator } from "@/i18n/server";

import { LocaleSwitcher } from "./LocaleSwitcher";

export async function SiteHeader() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);

  return (
    <header className="bg-navy-900 text-white">
      <Container className="flex items-center justify-between gap-4 py-2">
        <Link
          href={`/${locale}`}
          className="font-display flex min-h-11 items-center text-2xl font-bold tracking-wide"
        >
          Florensia
        </Link>
        <LocaleSwitcher
          current={locale}
          label={t("localeSwitcher.label")}
          currentLabel={t("localeSwitcher.current", { language: LOCALE_NAMES[locale] })}
        />
      </Container>
    </header>
  );
}
