/**
 * Portada (RF-01).
 *
 * Todo se renderiza en el servidor y se puede prerenderizar por idioma: la
 * página no envía JavaScript propio, salvo el selector de idioma de la
 * cabecera. Las últimas noticias se resuelven al pedir la página y llegan
 * en streaming (`LatestNews`); las promociones llegarán con T-12.
 */
import { ClassShowcase } from "@/components/home/ClassShowcase";
import { FeatureList } from "@/components/home/FeatureList";
import { Hero } from "@/components/home/Hero";
import { LatestNews } from "@/components/home/LatestNews";
import { getLocale, getTranslator } from "@/i18n/server";

export default async function HomePage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);

  return (
    <main className="flex flex-1 flex-col">
      <Hero locale={locale} t={t} />
      <LatestNews locale={locale} t={t} />
      <FeatureList t={t} />
      <ClassShowcase t={t} />
    </main>
  );
}
