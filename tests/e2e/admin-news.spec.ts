/**
 * Noticias desde el panel (RF-08, RF-12): crear un borrador, escribir los
 * textos, programar, publicar, retirar y borrar.
 *
 * Publica de verdad, así que corre en su propio proyecto después de las
 * demás pruebas (`playwright.config.ts`) y deja la base como estaba: la
 * noticia termina borrada.
 *
 * Las reglas finas (versión, slug repetido, inglés obligatorio) se prueban
 * contra MySQL en `tests/db/posts.test.ts`.
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

async function writeText(page: Page, title: string, body: string) {
  await field(page, "Título").fill(title);
  await field(page, "Entradilla").fill(`Resumen de ${title}`);
  await field(page, "Cuerpo (Markdown)").fill(body);
  await page.getByRole("button", { name: "Guardar texto" }).click();
  await expect(main(page).getByRole("status")).toHaveText("Texto guardado.");
}

test("un editor escribe, programa, publica, retira y borra una noticia", async ({ page }) => {
  const slug = `e2e-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  // Título único: varias ejecuciones pueden coincidir en la web pública.
  const es = `Festival de invierno ${slug}`;
  const editor = await signedInAccount(page);
  await grant(editor.username, "editor");

  try {
    await page.goto("/es/admin");
    const nav = page.getByRole("navigation", { name: "Secciones del panel" });
    // Un editor solo ve las noticias.
    await expect(nav.getByRole("link", { name: "Cuentas" })).toHaveCount(0);
    await nav.getByRole("link", { name: "Noticias" }).click();
    await page.getByRole("link", { name: "Nueva noticia" }).click();

    await field(page, "Slug de la URL").fill(slug);
    await field(page, "Categoría").selectOption("event");
    await page.getByRole("button", { name: "Crear borrador" }).click();
    await expect(main(page).getByRole("status")).toHaveText(
      "Borrador creado. Ahora escribe el texto en inglés.",
    );
    await expect(page.getByRole("heading", { level: 3, name: "Texto en English" })).toBeVisible();

    // Publicar sin el inglés no se puede.
    await field(page, "Estado").selectOption("published");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(main(page).getByRole("alert")).toContainText("El texto en inglés hace falta");

    await writeText(page, "Winter festival", "## Rewards\n\n- **Snow** hat\n- Sled");
    const preview = page.getByRole("region", { name: "Vista previa (texto guardado)" });
    await expect(preview.getByRole("heading", { name: "Rewards" })).toBeVisible();
    await expect(preview.getByText("Snow")).toHaveCSS("font-weight", "700");

    await page.getByRole("link", { name: /Español/ }).click();
    await expect(page.getByRole("link", { name: /Español/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await writeText(page, es, "Llega el **festival**.");

    // Programar exige una fecha futura; el error no borra lo elegido.
    await field(page, "Estado").selectOption("scheduled");
    await field(page, "Publicación (UTC)").fill("2020-01-01T10:00");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Para programar, elige una fecha futura.")).toBeVisible();
    await expect(field(page, "Estado")).toHaveValue("scheduled");
    await expect(field(page, "Publicación (UTC)")).toHaveAttribute("aria-invalid", "true");

    await field(page, "Publicación (UTC)").fill("2099-01-01T10:00");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(main(page).getByRole("status")).toHaveText("Guardado.");
    await expect(main(page).getByText(/^Aparece el/)).toBeVisible();
    // Programada para el futuro: la web pública aún no la enseña.
    const response = await page.request.get(`/es/news/${slug}`);
    expect(await response.text()).not.toContain(es);

    // Publicar ya: sin fecha, es ahora.
    await field(page, "Estado").selectOption("published");
    await field(page, "Publicación (UTC)").fill("");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(main(page).getByRole("status")).toHaveText("Guardado.");
    await page.getByRole("link", { name: "Ver en la web" }).click();
    await expect(page.getByRole("heading", { level: 1, name: es })).toBeVisible();
    await page.goto("/es/news");
    await expect(page.getByRole("link", { name: es })).toBeVisible();

    // Retirar (a borrador) y borrar.
    await page.goto("/es/admin/news");
    await page.getByRole("link", { name: es }).click();
    await expect(page).toHaveURL(/\/es\/admin\/news\/\d+$/);
    await expect(
      page.getByRole("heading", { level: 2, name: "Datos y publicación" }),
    ).toBeVisible();
    await field(page, "Estado").selectOption("draft");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page).toHaveURL(/\?done=saved$/);
    await page.getByRole("button", { name: "Borrar borrador" }).click();
    await expect(main(page).getByRole("status")).toHaveText("Borrador borrado.");
    await page.goto("/es/news");
    await expect(page.getByRole("link", { name: es })).toHaveCount(0);
  } finally {
    // Si algo falló a medias, no dejar la noticia publicada para la siguiente vez.
    await withDb((db) => db.query("DELETE FROM posts WHERE slug = ?", [slug]));
  }
});
