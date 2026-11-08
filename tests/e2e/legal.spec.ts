/**
 * Reglas y páginas legales (RF-10, RF-11), cargadas por `pnpm db:seed`.
 */
import { expect, test } from "@playwright/test";

test("las reglas tienen índice, fecha de vigencia y versión (RF-10)", async ({ page }) => {
  await page.goto("/en/rules");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Code of Conduct");
  await expect(page.getByText(/^In force since .* · version 1$/)).toBeVisible();

  const toc = page.getByRole("navigation", { name: "Contents" });
  await toc.getByRole("link", { name: "Gameplay rules" }).click();
  await expect(page).toHaveURL(/#gameplay-rules$/);
  await expect(page.locator("#gameplay-rules")).toBeInViewport();
});

test("aviso legal, reglas y privacidad son los textos oficiales, sin aviso de ejemplo", async ({
  page,
}) => {
  await page.goto("/es/imprint");
  // Solo en inglés, como en la web original: se ve con el aviso de idioma.
  await expect(page.getByText("Disponible solo en inglés")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Imprint");
  await expect(page.getByText("HRB 27763", { exact: false })).toBeVisible();
  await expect(page.getByText(/Sample text|Texto de ejemplo/)).toHaveCount(0);
  for (const [path, title] of [
    ["/es/rules", "Code of Conduct"],
    ["/es/privacy", "Privacy Policy"],
  ]) {
    await page.goto(path!);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title!);
    await expect(page.getByText(/Sample text|Texto de ejemplo/)).toHaveCount(0);
  }
});

test("sin traducción se ve el inglés con aviso y canónica inglesa", async ({ page }) => {
  await page.goto("/de/rules");
  await expect(page.getByText("Nur auf Englisch verfügbar")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveAttribute("lang", "en");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/rules$/);
});

test("el pie enlaza todas las páginas legales en el idioma actual", async ({ page, context }) => {
  // Con una elección ya hecha, el banner (fijo abajo) no tapa el pie en móvil.
  await context.addCookies([
    { name: "consent", value: "1.analytics:0", domain: "localhost", path: "/" },
  ]);
  await page.goto("/it");
  const footer = page.getByRole("contentinfo");
  for (const path of ["imprint", "terms", "rules", "privacy", "cookies"]) {
    const link = footer.locator(`a[href="/it/${path}"]`);
    await expect(link).toHaveCount(1);
  }
  await footer.locator('a[href="/it/cookies"]').click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("consent_id")).toBeVisible();
});

test("la política de cookies describe las cookies reales del sitio", async ({ page, context }) => {
  await page.goto("/en/cookies");
  await page.getByRole("button", { name: "Reject all" }).click();
  const names = (await context.cookies()).map((c) => c.name).sort();
  // Toda cookie que pone el sitio aparece en la política.
  for (const name of names) {
    await expect(page.locator("code").filter({ hasText: new RegExp(`^${name}$`) })).toHaveCount(1);
  }
});
