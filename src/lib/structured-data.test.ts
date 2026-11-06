import { describe, expect, it } from "vitest";

import { breadcrumbs, faqPage, newsArticle, serializeJsonLd, videoGame } from "./structured-data";

describe("datos estructurados", () => {
  it("VideoGame: gratuito, para Windows y con URL absoluta", () => {
    const game = videoGame("es", "MMORPG");
    expect(game).toMatchObject({ "@type": "VideoGame", operatingSystem: "Windows 10" });
    expect(game.url).toMatch(/^https?:\/\/.+\/es$/);
    expect(game.offers).toMatchObject({ price: 0 });
  });

  it("NewsArticle: fechas ISO e idioma real del texto", () => {
    const article = newsArticle({
      url: "/de/news/x",
      headline: "Free code 5",
      description: "…",
      datePublished: new Date("2026-09-17T10:00:00Z"),
      dateModified: new Date("2026-09-19T10:00:00Z"),
      inLanguage: "en",
      author: null,
    });
    expect(article).toMatchObject({
      datePublished: "2026-09-17T10:00:00.000Z",
      dateModified: "2026-09-19T10:00:00.000Z",
      inLanguage: "en",
    });
    expect(article.author).toHaveProperty("@id");
  });

  it("BreadcrumbList numera desde 1", () => {
    const list = breadcrumbs([
      ["Florensia", "/es"],
      ["Noticias", "/es/news"],
    ]);
    expect(list.itemListElement).toMatchObject([{ position: 1 }, { position: 2 }]);
  });

  it("FAQPage con preguntas y respuestas", () => {
    expect(faqPage([{ question: "¿?", answer: "Sí." }]).mainEntity).toEqual([
      { "@type": "Question", name: "¿?", acceptedAnswer: { "@type": "Answer", text: "Sí." } },
    ]);
  });

  it("un título con </script> no puede cerrar la etiqueta", () => {
    const out = serializeJsonLd({ headline: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual({ headline: "</script><script>alert(1)</script>" });
  });
});
