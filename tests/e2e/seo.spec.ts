/**
 * SEO (RNF-05): robots, sitemap, redirecciones de la web original, títulos
 * únicos, Open Graph absoluto y datos estructurados.
 */
import { expect, test } from "@playwright/test";

test("robots.txt permite rastrear y declara el sitemap (F-10)", async ({ request }) => {
  const body = await (await request.get("/robots.txt")).text();
  expect(body).toContain("Disallow: /api/");
  expect(body).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
});

test("el sitemap tiene los 7 idiomas, x-default y las noticias traducidas", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const locale of ["en", "pt-BR", "tr", "it", "de", "fr", "es"]) {
    expect(xml).toContain(`/${locale}/download</loc>`);
  }
  expect(xml).toContain('hreflang="x-default"');
  expect(xml).toContain("/es/news/event-12</loc>");
  // La noticia solo traducida al inglés no aparece en otros idiomas.
  expect(xml).toContain("/en/news/redeem-5</loc>");
  expect(xml).not.toContain("/es/news/redeem-5</loc>");
  // Ni borradores ni programadas.
  expect(xml).not.toContain("maintenance-14");
  expect(xml).not.toContain("shop-13");
});

test("las URLs de la web original redirigen con 301 en un solo salto", async ({ request }) => {
  for (const [from, to] of [
    ["/pt/post/event-12", "/pt-BR/news/event-12"],
    ["/en/lp/style1/PlayNow", "/en/play-now"],
  ]) {
    const response = await request.get(from!, { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(new URL(response.headers().location!, "http://localhost").pathname).toBe(to);
  }
});

test("cada página tiene título propio y traducido (F-08)", async ({ page }) => {
  const titles = new Set<string>();
  for (const path of ["", "/news", "/download", "/support", "/rules", "/news/event-12"]) {
    await page.goto(`/de${path}`);
    titles.add(await page.title());
  }
  expect(titles.size).toBe(6);
});

test("Open Graph con imagen absoluta y JSON-LD válido (F-12)", async ({ page }) => {
  await page.goto("/fr");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /^https?:\/\/.+\/og\.png$/,
  );
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = blocks.flatMap((text) => [JSON.parse(text)].flat().map((d) => d["@type"]));
  expect(types).toEqual(expect.arrayContaining(["Organization", "VideoGame"]));
});
