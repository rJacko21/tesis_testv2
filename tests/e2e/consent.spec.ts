/**
 * Consentimiento de cookies (RF-11, F-31).
 */
import { expect, test, type Page } from "@playwright/test";

const banner = (page: Page) => page.getByRole("region", { name: "Respetamos tu privacidad" });

test("aceptar, rechazar y configurar tienen el mismo peso visual", async ({ page }) => {
  await page.goto("/es");
  const buttons = banner(page).getByRole("button");
  await expect(buttons).toHaveText(["Aceptar todas", "Rechazar todas", "Configurar"]);
  const classes = await buttons.evaluateAll((els) => els.map((el) => el.className));
  expect(new Set(classes).size).toBe(1);
});

test("rechazar guarda la elección, oculta el banner y no vuelve a salir", async ({
  page,
  context,
}) => {
  await page.goto("/es");
  await banner(page).getByRole("button", { name: "Rechazar todas" }).click();
  await expect(banner(page)).toBeHidden();
  const cookie = (await context.cookies()).find((c) => c.name === "consent");
  expect(decodeURIComponent(cookie!.value)).toBe("1.analytics:0");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Florensia", level: 1 })).toBeVisible();
  await expect(banner(page)).toBeHidden();
});

test("la elección se puede cambiar desde el pie", async ({ page, context }) => {
  await page.goto("/es");
  await banner(page).getByRole("button", { name: "Aceptar todas" }).click();
  await page.getByRole("contentinfo").getByRole("button", { name: "Configurar cookies" }).click();

  const settings = page.getByRole("dialog", { name: "Configuración de cookies" });
  const analytics = settings.getByRole("checkbox", { name: /Análisis/ });
  await expect(analytics).toBeChecked();
  await expect(settings.getByRole("checkbox", { name: /Necesarias/ })).toBeDisabled();

  await analytics.uncheck();
  await settings.getByRole("button", { name: "Guardar elección" }).click();
  await expect(settings).toBeHidden();
  const cookie = (await context.cookies()).find((c) => c.name === "consent");
  expect(decodeURIComponent(cookie!.value)).toBe("1.analytics:0");
});

test("sin elección no se carga ningún script de terceros (F-37)", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://localhost")) external.push(request.url());
  });
  await page.goto("/es", { waitUntil: "networkidle" });
  expect(external).toEqual([]);
});
