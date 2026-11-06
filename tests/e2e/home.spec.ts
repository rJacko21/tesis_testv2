/**
 * Portada (RF-01): clases, imágenes y rendimiento de la cabecera.
 */
import { expect, test } from "@playwright/test";

test("muestra las 4 clases con sus 2 especializaciones", async ({ page }) => {
  await page.goto("/es");
  const classes = page.getByRole("region", { name: "Elige tu clase" });
  for (const name of ["Mercenary", "Explorer", "Noble", "Saint"]) {
    await expect(classes.getByRole("heading", { level: 3, name })).toBeVisible();
  }
  await expect(classes.locator("figcaption")).toHaveCount(8);
});

test("toda imagen tiene alt y solo la de la cabecera se carga con prioridad (F-39, F-42)", async ({
  page,
}) => {
  await page.goto("/en");
  const images = page.locator("img");
  for (const img of await images.all()) expect(await img.getAttribute("alt")).not.toBeNull();
  await expect(page.locator('img[fetchpriority="high"]')).toHaveCount(1);
  // El resto, bajo el pliegue, se carga solo al acercarse (carga diferida).
  await expect(page.locator('img[loading="lazy"]')).toHaveCount((await images.count()) - 1);
});
