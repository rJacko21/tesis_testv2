/**
 * Layout raíz, uno por idioma (`/[locale]/…`).
 *
 * - Fija `<html lang>` al idioma de la URL (lectores de pantalla, traductores
 *   automáticos y la regla de mayúsculas del turco dependen de él).
 * - Pre-genera las 7 variantes en el build (`generateStaticParams`).
 * - Carga las tipografías del rediseño (Cinzel para títulos, Plus Jakarta
 *   Sans para texto, M-44) autoalojadas con `next/font`: sin peticiones a
 *   Google Fonts y sin salto de diseño (CLS) al cargarlas. Son fuentes
 *   variables: un solo fichero por alfabeto cubre todos los grosores.
 * - Fija el tema claro u oscuro antes de pintar (`THEME_SCRIPT`).
 *
 * @see RF-02 · RNF-04 · RNF-01 · P6 · M-44
 */
import type { Metadata, Viewport } from "next";
import { Cinzel, Plus_Jakarta_Sans } from "next/font/google";

import { Consent } from "@/components/consent/Consent";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LOCALES } from "@/config/locales";
import { languageAlternates, OG_IMAGE, SITE_URL } from "@/config/site";
import { getLocale, getTranslator } from "@/i18n/server";
import { CONSENT_HIDE_SCRIPT } from "@/lib/consent";
import { THEME_SCRIPT } from "@/lib/theme";

import "../globals.css";

const display = Cinzel({
  variable: "--font-display-face",
  // `subsets` solo decide qué se precarga. latin-ext (ğ, ş, ı, İ del turco)
  // sigue declarado con su `unicode-range` y el navegador lo descarga solo
  // si la página usa esos caracteres. Precargar los dos subconjuntos de las
  // dos fuentes eran 4 × 40 KB compitiendo con la imagen LCP.
  subsets: ["latin"],
  display: "swap",
  // Se precarga (15 KB): Cinzel es mucho más ancha que la fuente de reserva
  // y, si llega tarde, el titular de la portada cambia de número de líneas
  // y empuja lo de debajo (CLS 0,04 medido sin precarga).
});

const body = Plus_Jakarta_Sans({
  variable: "--font-body-face",
  subsets: ["latin"],
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
    openGraph: { siteName: "Florensia", locale, type: "website", images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", images: [OG_IMAGE.url] },
  };
}

/**
 * Viewport sin `maximum-scale` ni `user-scalable=no`: la web original
 * impedía hacer zoom en móvil (fallo F-26, WCAG 1.4.4).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#071d33",
};

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);

  return (
    // `suppressHydrationWarning`: los dos scripts del `<head>` añaden
    // `data-consent` y `data-theme` a `<html>` antes de hidratar, a propósito.
    <html lang={locale} className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `${THEME_SCRIPT};${CONSENT_HIDE_SCRIPT}` }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="bg-gold-500 text-navy-950 sr-only z-50 rounded px-4 py-2 font-semibold focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
        >
          {t("a11y.skipToContent")}
        </a>
        <SiteHeader />
        <div id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
        <SiteFooter />
        <Consent />
      </body>
    </html>
  );
}
