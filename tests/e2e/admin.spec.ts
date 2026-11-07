/**
 * Panel de administración (RF-12): acceso por roles, suspender y reactivar
 * cuentas, cambiar roles y auditoría.
 *
 * Las reglas finas (quién puede suspender a quién, cambios simultáneos) se
 * prueban contra MySQL en `tests/db/admin.test.ts`; aquí, el recorrido.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { isolateEachTest, signedInAccount, signIn, withDb } from "./helpers";

isolateEachTest();

/** Da roles del equipo a una cuenta (aún no hay otra forma de crear el primer admin). */
const grant = (username: string, ...roles: string[]) =>
  withDb((db) =>
    db.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT u.id, r.id FROM users u JOIN roles r ON r.code IN (?) WHERE u.username = ?`,
      [roles, username.toLowerCase()],
    ),
  );

const userId = (username: string) =>
  withDb(async (db) => {
    const [rows] = await db.query("SELECT id FROM users WHERE username = ?", [
      username.toLowerCase(),
    ]);
    return (rows as { id: number }[])[0]!.id;
  });

async function axe(page: Page) {
  // Tras navegar con un enlace, Next pone el título un instante después.
  await expect(page).toHaveTitle(/\S/);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test("un jugador no ve el panel: ni enlace ni página", async ({ page }) => {
  await signedInAccount(page);
  await expect(page.getByRole("link", { name: "Panel de administración" })).toHaveCount(0);
  for (const path of ["/es/admin", "/es/admin/users", "/es/admin/audit"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { level: 1, name: "Página no encontrada" }),
    ).toBeVisible();
  }
});

test("soporte suspende a un jugador: le cierra la sesión y no puede volver a entrar", async ({
  page,
  browser,
}) => {
  // El jugador, con la sesión abierta en otro navegador.
  const playerContext = await browser.newContext({
    extraHTTPHeaders: {
      "x-forwarded-for": `10.9.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254) + 1}`,
    },
  });
  const playerPage = await playerContext.newPage();
  const player = await signedInAccount(playerPage);

  const support = await signedInAccount(page);
  await grant(support.username, "support");
  await page.reload();
  await page.getByRole("link", { name: "Panel de administración" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Panel de administración" }),
  ).toBeVisible();
  // Soporte no ve la auditoría.
  const nav = page.getByRole("navigation", { name: "Secciones del panel" });
  await expect(nav.getByRole("link", { name: "Auditoría" })).toHaveCount(0);

  await nav.getByRole("link", { name: "Cuentas" }).click();
  await page.getByLabel("Nombre, correo o n.º de cuenta").fill(player.email);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("1 cuenta", { exact: true })).toBeVisible();
  await axe(page);
  await page.getByRole("link", { name: player.username }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: `Cuenta ${player.username}` }),
  ).toBeVisible();
  const reason = page.getByLabel("Motivo (queda en la auditoría)");
  await expect(reason).toHaveAttribute("required", "");
  await expect(reason).toHaveAttribute("minlength", "5");
  await axe(page);
  await reason.fill("Venta de oro fuera del juego");
  await page.getByRole("button", { name: "Suspender cuenta" }).click();

  await expect(page.getByRole("main").getByRole("status")).toHaveText(
    "Cuenta suspendida y sesiones cerradas.",
  );
  await expect(page.getByRole("main").getByText("Suspendida", { exact: true })).toBeVisible();
  // Soporte no puede cambiar roles: solo los ve.
  await expect(page.getByRole("button", { name: "Guardar roles" })).toHaveCount(0);

  // La sesión del jugador ya no vale…
  await playerPage.goto("/es/account");
  await expect(playerPage).toHaveURL(/\/es\/sign-in\?next=/);
  // …y no puede abrir otra.
  await signIn(playerPage, player.username, player.password);
  await expect(playerPage.getByRole("main").getByRole("alert")).toBeVisible();
  await expect(playerPage).toHaveURL(/\/es\/sign-in/);

  // Reactivar: vuelve a entrar.
  await page.getByRole("button", { name: "Reactivar cuenta" }).click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText("Cuenta reactivada.");
  await signIn(playerPage, player.username, player.password);
  await expect(playerPage).toHaveURL(/\/es\/account$/);
  await playerContext.close();
});

test("un admin cambia roles y lo ve en la auditoría", async ({ page }) => {
  const admin = await signedInAccount(page);
  await grant(admin.username, "admin");
  // Otra cuenta, creada directamente en la base para no cerrar la sesión del admin.
  const name = `e2e_p${Date.now().toString(36)}`.slice(0, 16);
  await withDb((db) =>
    db.query("INSERT INTO users (username, name, email) VALUES (?, ?, ?)", [
      name,
      name,
      `${name}@example.test`,
    ]),
  );
  const id = await userId(name);

  await page.goto(`/es/admin/users/${id}`);
  await page.getByRole("checkbox", { name: "Editor" }).check();
  await page.getByRole("button", { name: "Guardar roles" }).click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText("Roles guardados.");
  await expect(page.getByRole("checkbox", { name: "Editor" })).toBeChecked();
  await expect(page.getByText("roles: ∅ → editor")).toBeVisible();

  // Un admin no puede quitarse su propio rol.
  await page.goto(`/es/admin/users/${await userId(admin.username)}`);
  await expect(page.getByText(/es la tuya o es del equipo/)).toBeVisible();
  await page.getByRole("checkbox", { name: "Administrador" }).uncheck();
  await page.getByRole("button", { name: "Guardar roles" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "No tienes permiso para este cambio. No ha cambiado nada.",
  );

  await page
    .getByRole("navigation", { name: "Secciones del panel" })
    .getByRole("link", { name: "Auditoría" })
    .click();
  const row = page.getByRole("row").filter({ hasText: `Cuenta n.º ${id}` });
  await expect(row).toContainText("Roles cambiados");
  await expect(row).toContainText(admin.username);
  await expect(row).toContainText("roles: ∅ → editor");
  await axe(page);
});

test("el panel cumple WCAG 2.2 AA y no tiene scroll horizontal en los 7 idiomas", async ({
  page,
}) => {
  test.slow();
  const admin = await signedInAccount(page);
  await grant(admin.username, "admin");
  const id = await userId(admin.username);
  for (const locale of ["en", "pt-BR", "tr", "it", "de", "fr", "es"]) {
    for (const path of ["/admin", "/admin/users", `/admin/users/${id}`, "/admin/audit"]) {
      await page.goto(`/${locale}${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await axe(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${locale}${path}`).toBeLessThanOrEqual(0);
    }
  }
});
