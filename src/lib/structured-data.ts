/**
 * Datos estructurados schema.org en JSON-LD (RNF-05).
 *
 * La web original no tenía ninguno. Con ellos, los buscadores entienden
 * qué es cada página: la empresa (Organization), el juego (VideoGame), cada
 * noticia (NewsArticle) con su ruta de migas (BreadcrumbList) y las
 * preguntas frecuentes (FAQPage).
 *
 * Funciones puras que devuelven objetos: se prueban sin renderizar y las
 * pinta `components/seo/JsonLd.tsx`. Todas las URL son absolutas.
 */
import { STEAM_URL } from "@/config/download";
import type { Locale } from "@/config/locales";
import { SOCIAL_LINKS } from "@/config/navigation";
import { OG_IMAGE, SITE_URL } from "@/config/site";

type Thing = Record<string, unknown>;

const abs = (path: string) => `${SITE_URL}${path}`;

export function organization(): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": abs("/#organization"),
    name: "Giiku Games GmbH",
    url: SITE_URL,
    sameAs: SOCIAL_LINKS.map((link) => link.href),
  };
}

export function videoGame(locale: Locale, description: string): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Florensia",
    url: abs(`/${locale}`),
    description,
    image: abs(OG_IMAGE.url),
    inLanguage: locale,
    genre: ["MMORPG", "Anime"],
    gamePlatform: "PC",
    operatingSystem: "Windows 10",
    applicationCategory: "Game",
    playMode: "MultiPlayer",
    publisher: { "@id": abs("/#organization") },
    offers: { "@type": "Offer", price: 0, priceCurrency: "EUR", url: STEAM_URL },
  };
}

export interface ArticleInput {
  url: string;
  headline: string;
  description: string;
  datePublished: Date;
  dateModified: Date;
  /** Idioma real del texto (puede ser el inglés de respaldo). */
  inLanguage: Locale;
  author: string | null;
}

export function newsArticle(article: ArticleInput): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: abs(article.url),
    headline: article.headline,
    description: article.description,
    image: [abs(OG_IMAGE.url)],
    datePublished: article.datePublished.toISOString(),
    dateModified: article.dateModified.toISOString(),
    inLanguage: article.inLanguage,
    author: article.author
      ? { "@type": "Person", name: article.author }
      : { "@id": abs("/#organization") },
    publisher: { "@id": abs("/#organization") },
  };
}

/** Migas de pan: lista de `[nombre, ruta]` desde la portada. */
export function breadcrumbs(items: readonly (readonly [name: string, path: string])[]): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: abs(path),
    })),
  };
}

export function faqPage(questions: readonly { question: string; answer: string }[]): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}

/**
 * Serializa para un `<script type="application/ld+json">`. Escapa `<` para
 * que un texto como `</script>` (p. ej. en un título de noticia) no pueda
 * cerrar la etiqueta e inyectar HTML.
 */
export function serializeJsonLd(data: Thing | Thing[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
