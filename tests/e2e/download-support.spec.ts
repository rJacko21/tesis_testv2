/**
 * Descarga (RF-09) y soporte (RF-10).
 */
import { expect, test } from "@playwright/test";

const WINDOWS_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0";
const MAC_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Safari/605.1.15";

test.describe("descarga en Windows", () => {
  test.use({ userAgent: WINDOWS_UA });
  test("dice que el equipo es compatible y enlaza Steam", async ({ page }) => {
    await page.goto("/es/download");
    await expect(page.getByText("Tu equipo usa Windows: puedes jugar")).toBeVisible();
    await expect(page.getByRole("link", { name: /Descargar en Steam/ })).toHaveAttribute(
      "href",
      /store\.steampowered\.com\/app\/384030/,
    );
  });
});

test.describe("descarga en Mac", () => {
  test.use({ userAgent: MAC_UA });
  test("avisa de que hace falta Windows, pero mantiene el enlace", async ({ page }) => {
    await page.goto("/en/download");
    await expect(page.getByText("Florensia needs Windows")).toBeVisible();
    await expect(page.getByRole("link", { name: /Get it on Steam/ })).toBeVisible();
  });
});

test("los requisitos son una tabla con cabeceras", async ({ page }) => {
  await page.goto("/de/download");
  const table = page.getByRole("table", { name: "Systemanforderungen" });
  await expect(table.getByRole("columnheader")).toHaveText(["Komponente", "Minimum", "Empfohlen"]);
  await expect(table.getByRole("row", { name: /Arbeitsspeicher/ })).toContainText("512 MB");
  await expect(table.getByRole("row", { name: /Arbeitsspeicher/ })).toContainText("2 GB");
});

test("soporte: las preguntas se abren con teclado, sin JavaScript propio", async ({ page }) => {
  await page.goto("/es/support");
  const question = page.getByText("¿Florensia es gratis?");
  const answer = page.getByText(/El juego es gratuito/);
  await expect(answer).toBeHidden();
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(answer).toBeVisible();
});

test("soporte ya no es un mailto (F-23)", async ({ page }) => {
  await page.goto("/fr");
  // El enlace está dentro del menú Comunidad (plegado): se comprueba en el HTML.
  await expect(page.locator('header a[href="/fr/support"]').first()).toBeAttached();
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
});
