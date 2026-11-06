/**
 * Accesibilidad automática (RNF-03) y diseño responsive (RNF-02) en cada
 * idioma: 0 infracciones de axe (WCAG 2.2 A y AA) y sin scroll horizontal.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const LOCALES = ["en", "pt-BR", "tr", "it", "de", "fr", "es"] as const;
// Las de noticias necesitan la base de datos con la demo (`pnpm db:seed:demo`).
const PAGES = ["", "/no-existe", "/news", "/news/shop-8", "/news/redeem-5"] as const;

for (const locale of LOCALES) {
  for (const path of PAGES) {
    test(`${locale}${path || "/"}: sin infracciones de accesibilidad`, async ({ page }) => {
      await page.goto(`/${locale}${path}`);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }

  test(`${locale}: sin scroll horizontal`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("se puede hacer zoom en móvil (F-26)", async ({ page }) => {
  await page.goto("/en");
  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/);
});

test("el enlace para saltar al contenido es el primer elemento con foco", async ({ page }) => {
  await page.goto("/es");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Saltar al contenido principal" })).toBeFocused();
});
