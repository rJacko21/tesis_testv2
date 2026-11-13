/**
 * Tienda desde el panel (RF-05, RF-12): crear una campaña y un artículo,
 * traducirlo, activarlo, ponerle precio, una rebaja de campaña y terminarla.
 *
 * Cambia lo que se vende de verdad, así que corre en el proyecto
 * `publicacion`, después de las demás pruebas (`playwright.config.ts`), y
 * deja la base como estaba: el artículo y la campaña terminan borrados.
 *
 * Las reglas finas (historia de precios, fechas de campaña, SKU repetido) se
 * prueban contra MySQL en `tests/db/shop-admin.test.ts`.
 */
import { expect, type Page, test } from "@playwright/test";

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
/** Campo visible por su etiqueta (Next deja la página anterior oculta en el DOM). */
const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });

/** Fecha UTC para un `<input type="datetime-local">`, a `days` días de hoy. */
const utcLocal = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 16);

test("un admin crea un artículo, le pone precio y una rebaja de campaña", async ({ page }) => {
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const sku = `E2E-${suffix.toUpperCase()}`;
  const code = `e2e-${suffix}`;
  const name = `Winter hat ${suffix}`;
  const campaignName = `Winter sale ${suffix}`;
  const admin = await signedInAccount(page);
  await grant(admin.username, "admin");

  try {
    await page.goto("/es/admin");
    const nav = page.getByRole("navigation", { name: "Secciones del panel" });

    // Una campaña en curso, de ayer a dentro de una semana.
    await nav.getByRole("link", { name: "Campañas" }).click();
    await page.getByRole("link", { name: "Nueva campaña" }).click();
    await field(page, "Código").fill(code);
    await field(page, "Inicio (UTC)").fill(utcLocal(-1));
    await field(page, "Fin (UTC)").fill(utcLocal(7));
    await field(page, "Nombre en English").fill(campaignName);
    await page.getByRole("button", { name: "Crear campaña" }).click();
    await expect(main(page).getByRole("status")).toHaveText("Campaña creada.");

    // El artículo se crea inactivo.
    await nav.getByRole("link", { name: "Tienda" }).click();
    await page.getByRole("link", { name: "Nuevo artículo" }).click();
    await field(page, "SKU").fill(sku);
    await field(page, "Categoría").selectOption({ label: "Atuendos › Trajes" });
    await page.getByRole("button", { name: "Crear artículo" }).click();
    await expect(main(page).getByRole("status")).toHaveText(
      "Artículo creado. Ahora escribe su nombre en inglés.",
    );
    await expect(page).toHaveURL(/\/es\/admin\/shop\/\d+\?done=created$/);
    const id = Number(new URL(page.url()).pathname.split("/").pop());

    // Activarlo sin el nombre en inglés no se puede.
    await field(page, "Activo en la tienda").check();
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(main(page).getByRole("alert")).toContainText(
      "El nombre en inglés hace falta para activar el artículo.",
    );

    await field(page, "Nombre").fill(name);
    await field(page, "Descripción").fill("A warm hat for the snow.");
    await page.getByRole("button", { name: "Guardar texto" }).click();
    await expect(main(page).getByRole("status")).toHaveText("Texto guardado.");

    await field(page, "Activo en la tienda").check();
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(main(page).getByRole("status")).toHaveText("Guardado.");
    // Activo pero sin precio: el panel avisa de que no se vende.
    await expect(page.getByText(/no tiene precio actual/)).toBeVisible();
    await page.goto(`/es/shop/item/${id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Página no encontrada");
    await page.goto(`/es/admin/shop/${id}`);

    // Precio normal.
    await field(page, "Precio (AP)").fill("500");
    await page.getByRole("button", { name: "Añadir precio" }).click();
    await expect(main(page).getByRole("status")).toHaveText("Precio añadido.");
    await expect(page.getByText(/no tiene precio actual/)).toHaveCount(0);

    // Una rebaja inferior al precio, dentro de la campaña (toma sus fechas).
    await field(page, "Precio (AP)").fill("500");
    await field(page, "Precio rebajado (AP)").fill("600");
    await page.getByRole("button", { name: "Añadir precio" }).click();
    await expect(field(page, "Precio rebajado (AP)")).toHaveAttribute("aria-invalid", "true");
    await field(page, "Precio rebajado (AP)").fill("300");
    await field(page, "Campaña").selectOption({ label: campaignName });
    await page.getByRole("button", { name: "Añadir precio" }).click();
    await expect(main(page).getByRole("status")).toHaveText("Precio añadido.");

    const prices = page.getByRole("table", { name: "Precios" });
    await expect(prices.getByRole("row")).toHaveCount(3);
    await expect(prices.getByRole("row").nth(1)).toContainText("Vigente");
    await expect(prices.getByRole("row").nth(1)).toContainText(code);

    // La web pública enseña la rebaja con el nombre de la campaña.
    await page.goto(`/es/shop/item/${id}`);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(main(page)).toContainText("300");
    await expect(main(page)).toContainText(campaignName);

    // Terminar la rebaja: vuelve el precio normal.
    await page.goto(`/es/admin/shop/${id}`);
    await page.getByRole("button", { name: "Terminar ya el precio de 300 AP" }).click();
    await expect(main(page).getByRole("status")).toHaveText("Precio terminado.");
    await page.goto(`/es/shop/item/${id}`);
    await expect(main(page)).not.toContainText(campaignName);

    // Y todo queda en la auditoría.
    await page.goto("/es/admin/audit");
    await expect(page.getByRole("cell", { name: "Precio terminado" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: `Artículo n.º ${id}` }).first()).toBeVisible();
  } finally {
    await withDb(async (db) => {
      await db.query("DELETE FROM shop_items WHERE sku = ?", [sku]);
      await db.query("DELETE FROM campaigns WHERE code = ?", [code]);
    });
  }
});
