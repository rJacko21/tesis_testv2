/**
 * Promociones desde el panel (RF-01, RF-12): subir la imagen, que la
 * portada la enseñe con su texto alternativo y su fecha de fin, y borrarla.
 *
 * Cambia la portada de verdad, así que corre en el proyecto `publicacion`,
 * después de las demás pruebas (`playwright.config.ts`), y deja la base
 * como estaba.
 *
 * Las reglas finas (versión, imagen compartida, imágenes huérfanas) se
 * prueban contra MySQL en `tests/db/promotions.test.ts`.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import sharp from "sharp";

import { isolateEachTest, signedInAccount, withDb } from "./helpers";

isolateEachTest();

const grant = (username: string, ...roles: string[]) =>
  withDb((db) =>
    db.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT u.id, r.id FROM users u JOIN roles r ON r.code IN (?) WHERE u.username = ?`,
      [roles, username.toLowerCase()],
    ),
  );

const main = (page: Page) => page.getByRole("main");
const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });
const utcLocal = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 16);

/** Una imagen PNG de verdad para subirla. */
async function png(width: number, height: number) {
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: Math.floor(Math.random() * 256), g: 120, b: 200 },
    },
  })
    .png()
    .toBuffer();
  return { name: "banner.png", mimeType: "image/png", buffer };
}

test("un editor sube una promoción, sale en la portada y la borra", async ({ page }) => {
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const english = `Winter sale ${suffix}`;
  const spanish = `Rebajas de invierno ${suffix}`;
  const alt = `Two heroes in winter costumes ${suffix}`;
  const editor = await signedInAccount(page);
  await grant(editor.username, "editor");

  try {
    await page.goto("/es/admin");
    const nav = page.getByRole("navigation", { name: "Secciones del panel" });
    await nav.getByRole("link", { name: "Promociones" }).click();
    await page.getByRole("link", { name: "Nueva promoción" }).click();

    // Una imagen demasiado pequeña se rechaza sin perder lo escrito.
    await field(page, "Imagen").setInputFiles(await png(200, 100));
    await field(page, "Enlace").fill("/shop");
    await field(page, "Fin (UTC)").fill(utcLocal(7));
    await field(page, "Título en English").fill(english);
    await field(page, "Descripción de la imagen en English").fill(alt);
    await field(page, "Título en Español").fill(spanish);
    await page.getByRole("button", { name: "Crear promoción" }).click();
    await expect(main(page).getByRole("alert")).toBeVisible();
    await expect(page.getByText("La imagen debe medir al menos 320 × 160 px.")).toBeVisible();
    await expect(field(page, "Título en Español")).toHaveValue(spanish);

    await field(page, "Imagen").setInputFiles(await png(1200, 400));
    await page.getByRole("button", { name: "Crear promoción" }).click();
    await expect(main(page).getByRole("status")).toHaveText("Promoción creada.");
    await expect(page).toHaveURL(/\/es\/admin\/promotions\/\d+\?done=created$/);
    const preview = main(page).getByRole("img", { name: alt });
    await expect(preview).toBeVisible();

    // La imagen sale de MySQL, en WebP y cacheable para siempre.
    const src = await withDb(async (db) => {
      const [rows] = await db.query(
        `SELECT m.path FROM promotions p JOIN media m ON m.id = p.image_id
         JOIN promotion_translations t ON t.promotion_id = p.id AND t.locale = 'en'
         WHERE t.title = ?`,
        [english],
      );
      return `/media/${(rows as { path: string }[])[0]!.path}`;
    });
    const image = await page.request.get(src);
    expect(image.headers()["content-type"]).toBe("image/webp");
    expect(image.headers()["cache-control"]).toContain("immutable");

    // En la portada: título en español, descripción en inglés marcada como tal.
    await page.goto("/es");
    const section = page.getByRole("region", { name: "Promociones" });
    await expect(section.getByRole("link", { name: spanish })).toBeVisible();
    await expect(section.getByRole("img", { name: alt })).toHaveAttribute("lang", "en");
    await expect(section.getByText(/^Hasta el/).first()).toBeVisible();
    // La portada con la sección de promociones sigue sin errores de accesibilidad.
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    await section.getByRole("link", { name: spanish }).click();
    await expect(page).toHaveURL(/\/es\/shop$/);

    // Borrarla la quita de la portada.
    await page.goto("/es/admin/promotions");
    await page.getByRole("link", { name: spanish }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Borrar promoción" })).toBeVisible();
    await page.getByRole("button", { name: "Borrar promoción" }).click();
    await expect(main(page).getByRole("status")).toHaveText("Promoción borrada.");
    await page.goto("/es");
    await expect(page.getByRole("link", { name: spanish })).toHaveCount(0);
    expect((await page.request.get(src)).status()).toBe(404);
  } finally {
    // Si algo falló a medias, no dejar la promoción en la portada.
    await withDb(async (db) => {
      const [rows] = await db.query(
        `SELECT p.id, p.image_id FROM promotions p JOIN promotion_translations t
         ON t.promotion_id = p.id AND t.locale = 'en' WHERE t.title = ?`,
        [english],
      );
      for (const row of rows as { id: number; image_id: number }[]) {
        await db.query("DELETE FROM promotions WHERE id = ?", [row.id]);
        await db.query("DELETE FROM media WHERE id = ?", [row.image_id]);
      }
    });
  }
});
