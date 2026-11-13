/**
 * Portada (RF-01): clases, imágenes y rendimiento de la cabecera.
 */
import { expect, test } from "@playwright/test";

test("las 4 clases se eligen con pestañas y cada una muestra sus 2 evoluciones", async ({
  page,
}) => {
  await page.goto("/es");
  const classes = page.getByRole("region", { name: "Elige tu clase" });
  const tabs = classes.getByRole("group", { name: "Elige tu clase" }).getByRole("radio");
  await expect(tabs).toHaveCount(4);
  // La primera está elegida al cargar, sin JavaScript.
  await expect(tabs.first()).toBeChecked();

  const evolutions: Record<string, [string, string]> = {
    Mercenary: ["Gladiator", "Guardian Swordsman"],
    Explorer: ["Excavator", "Sniper"],
    Noble: ["Court Magician", "Magic Knight"],
    Saint: ["Priest", "Shaman"],
  };
  for (const [name, pair] of Object.entries(evolutions)) {
    // `force`: el `radio` está oculto a la vista; se pulsa su etiqueta.
    await classes.getByRole("radio", { name }).check({ force: true });
    await expect(classes.getByRole("heading", { level: 3 })).toHaveText([name]);
    await expect(classes.getByRole("heading", { level: 4 })).toHaveText(pair);
  }
});

test("el tema se cambia con el botón y se recuerda al recargar (M-44)", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/es");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "light");

  // En móvil el botón está dentro del menú.
  const menu = page.getByRole("button", { name: "Abrir menú" });
  if (await menu.isVisible()) await menu.click();
  const toggle = page.getByRole("button", { name: "Tema oscuro" }).filter({ visible: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
});

test("sin elección guardada, el tema sigue al sistema", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/es");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
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
