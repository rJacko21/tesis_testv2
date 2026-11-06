/**
 * Criterios de aceptación de RF-02 (navegación y selector de idioma) y
 * RNF-04/RNF-05 (idiomas y SEO multilingüe).
 */
import { expect, test } from "@playwright/test";

const LOCALES = ["en", "pt-BR", "tr", "it", "de", "fr", "es"] as const;

test.describe("RF-02 idioma", () => {
  test("la raíz redirige al idioma del navegador", async ({ browser }) => {
    const context = await browser.newContext({ locale: "es-AR" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/es$/);
    await context.close();
  });

  test("las URLs antiguas /pt redirigen a /pt-BR", async ({ page }) => {
    const response = await page.request.get("/pt", { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers()["location"]).toMatch(/\/pt-BR$/);
  });

  test("el selector muestra los 7 idiomas y conserva la ruta", async ({ page }) => {
    await page.goto("/de");
    const switcher = page.locator("details", {
      has: page.locator("summary", { hasText: "Sprache" }),
    });
    await switcher.locator("summary").click();
    const options = switcher.locator("ul a");
    await expect(options).toHaveCount(7);
    await page.getByRole("link", { name: "Español" }).click();
    await expect(page).toHaveURL(/\/es$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });

  for (const locale of LOCALES) {
    test(`${locale}: lang, canonical y hreflang correctos`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new RegExp(`/${locale}$`),
      );
      await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(8);
    });
  }
});
