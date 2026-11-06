/**
 * Layout raíz, uno por idioma (`/[locale]/…`).
 *
 * - Fija `<html lang>` al idioma de la URL (lectores de pantalla, traductores
 *   automáticos y la regla de mayúsculas del turco dependen de él).
 * - Pre-genera las 7 variantes en el build (`generateStaticParams`).
 * - Carga las tipografías de la web original (Alegreya para títulos, Nunito
 *   para texto) autoalojadas con `next/font`: sin peticiones a Google Fonts
 *   y sin salto de diseño (CLS) al cargarlas.
 *
 * @see RF-02 · RNF-04 · RNF-01 · P6
 */
import type { Metadata, Viewport } from "next";
import { Alegreya, Nunito } from "next/font/google";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LOCALES } from "@/config/locales";
import { languageAlternates, SITE_URL } from "@/config/site";
import { getLocale, getTranslator } from "@/i18n/server";

import "../globals.css";

const display = Alegreya({
  variable: "--font-alegreya",
  // latin-ext cubre los caracteres del turco (ğ, ş, ı, İ) y del resto de idiomas.
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const body = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("meta.title"), template: "%s · Florensia" },
    description: t("meta.description"),
    alternates: { canonical: `/${locale}`, languages: languageAlternates("") },
    openGraph: { siteName: "Florensia", locale, type: "website" },
  };
}

/**
 * Viewport sin `maximum-scale` ni `user-scalable=no`: la web original
 * impedía hacer zoom en móvil (fallo F-26, WCAG 1.4.4).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b2a4a",
};

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);

  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="bg-gold-500 text-ink-900 sr-only z-50 rounded px-4 py-2 font-semibold focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
        >
          {t("a11y.skipToContent")}
        </a>
        <SiteHeader />
        <div id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
