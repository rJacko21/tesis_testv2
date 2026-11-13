/**
 * Portada (RF-01).
 *
 * Todo se renderiza en el servidor y se puede prerenderizar por idioma: la
 * página no envía JavaScript propio, salvo el selector de idioma de la
 * cabecera. Las últimas noticias se resuelven al pedir la página y llegan
 * en streaming (`LatestNews`), igual que las promociones en curso
 * (`Promotions`, M-38).
 *
 * El orden es el del rediseño (M-44): portada, características, noticias y
 * promociones, clases y descarga.
 */
import { ClassShowcase } from "@/components/home/ClassShowcase";
import { DownloadCta } from "@/components/home/DownloadCta";
import { FeatureList } from "@/components/home/FeatureList";
import { Hero } from "@/components/home/Hero";
import { LatestNews } from "@/components/home/LatestNews";
import { Promotions } from "@/components/home/Promotions";
import { JsonLd } from "@/components/seo/JsonLd";
import { getLocale, getTranslator } from "@/i18n/server";
import { organization, videoGame } from "@/lib/structured-data";

export default async function HomePage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);

  return (
    <main className="flex flex-1 flex-col">
      <JsonLd data={[organization(), videoGame(locale, t("meta.description"))]} />
      <Hero locale={locale} t={t} />
      <FeatureList locale={locale} t={t} />
      <LatestNews locale={locale} t={t} />
      <Promotions locale={locale} t={t} />
      <ClassShowcase t={t} />
      <DownloadCta locale={locale} t={t} />
    </main>
  );
}
