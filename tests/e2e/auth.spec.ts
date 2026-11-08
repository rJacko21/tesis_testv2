/**
 * Cuentas (RF-03): registro, verificación del correo, inicio y cierre de
 * sesión, límite de intentos y recuperación de la contraseña.
 *
 * Los correos se leen de Mailpit (`docker compose up -d mail`), que los
 * recoge sin enviarlos. Cada prueba usa datos únicos y una IP propia
 * (`helpers.ts`), para que los límites por IP de una prueba no afecten a
 * otra.
 */
import { expect, test } from "@playwright/test";

import { isolateEachTest, linkFromMail, newAccount, register, signIn } from "./helpers";

isolateEachTest();

test("registro, verificación del correo, inicio y cierre de sesión", async ({ page }) => {
  const account = newAccount();
  await register(page, account);
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `te hemos enviado un enlace a ${account.email}`,
  );

  const verifyLink = await linkFromMail(page, account.email, /Confirma tu cuenta/);
  expect(verifyLink).toMatch(/^\/es\/verify-email\?token=/);
  await page.goto(verifyLink);
  await expect(page.getByText("Tu correo está confirmado.")).toBeVisible();

  await signIn(page, account.username, account.password);
  await expect(page).toHaveURL(/\/es\/account$/);
  await expect(page.getByRole("heading", { level: 1, name: "Mi cuenta" })).toBeVisible();
  await expect(page.getByText("Confirmado", { exact: true })).toBeVisible();

  // La cookie de sesión es HttpOnly: el JavaScript de la página no puede leerla.
  const session = (await page.context().cookies()).find((c) => c.name.endsWith("fl.session_token"));
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/es$/);
  await page.goto("/es/account");
  await expect(page).toHaveURL(/\/es\/sign-in\?next=%2Fes%2Faccount$/);
});

test("un correo ya registrado recibe la misma respuesta y su dueño un aviso", async ({ page }) => {
  const first = newAccount();
  await register(page, first);
  await expect(page.getByRole("main").getByRole("status")).toBeVisible();

  const second = { ...newAccount(), email: first.email };
  await register(page, second);
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `te hemos enviado un enlace a ${first.email}`,
  );
  const link = await linkFromMail(page, first.email, /Alguien intentó registrarse/);
  expect(link).toBe("/es/sign-in");
});

test("un nombre de cuenta en uso se indica en su campo", async ({ page }) => {
  const first = newAccount();
  await register(page, first);
  await expect(page.getByRole("main").getByRole("status")).toBeVisible();

  await register(page, { ...newAccount(), username: first.username.toUpperCase() });
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Revisa los campos marcados.");
  const field = page.getByLabel("Nombre de cuenta");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Ese nombre de cuenta ya está en uso.")).toBeVisible();
  // Lo escrito se conserva, salvo la contraseña.
  await expect(field).toHaveValue(first.username.toUpperCase());
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue("");
});

test("5 fallos en 15 minutos piden esperar, sin decir si la cuenta existe (CA de RF-03)", async ({
  page,
}) => {
  const account = newAccount();
  await register(page, account);
  await expect(page.getByRole("main").getByRole("status")).toBeVisible();

  for (let i = 0; i < 5; i++) {
    await signIn(page, account.username, "contraseña equivocada");
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "El nombre de cuenta, el correo o la contraseña no son correctos.",
    );
  }
  // Ni con la contraseña correcta: hay que esperar.
  await signIn(page, account.username, account.password);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    /^Demasiados intentos\. Espera 1[45] minutos/,
  );

  // Una cuenta que no existe da el mismo mensaje que una contraseña errónea.
  await signIn(page, "no_existe_nunca", "contraseña equivocada");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "El nombre de cuenta, el correo o la contraseña no son correctos.",
  );
});

test("recuperar la contraseña: mismo mensaje exista o no el correo (CA de RF-03)", async ({
  page,
}) => {
  const account = newAccount();
  await register(page, account);
  await expect(page.getByRole("main").getByRole("status")).toBeVisible();

  const sentMessage = async (email: string) => {
    await page.goto("/es/forgot-password");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByRole("button", { name: "Enviar enlace" }).click();
    return page.getByRole("main").getByRole("status").textContent();
  };
  const unknown = await sentMessage(`nadie-${Date.now()}@example.test`);
  const known = await sentMessage(account.email);
  expect(known).toBe(unknown);

  const resetLink = await linkFromMail(page, account.email, /Recupera tu contraseña/);
  expect(resetLink).toMatch(/^\/es\/reset-password\?token=/);
  await page.goto(resetLink);
  const newPassword = `${account.password} renovada`;
  await page.getByLabel("Contraseña nueva", { exact: true }).fill(newPassword);
  await page.getByLabel("Repite la contraseña nueva").fill(`${newPassword} distinta`);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();
  await page.getByLabel("Contraseña nueva", { exact: true }).fill(newPassword);
  await page.getByLabel("Repite la contraseña nueva").fill(newPassword);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "Tu contraseña ha cambiado.",
  );
  // También al recuperarla llega el aviso al correo de la cuenta.
  await linkFromMail(page, account.email, /Tu contraseña de Florensia ha cambiado/);

  // El enlace solo sirve una vez.
  await page.goto(resetLink);
  await page.getByLabel("Contraseña nueva", { exact: true }).fill(`${newPassword} otra vez`);
  await page.getByLabel("Repite la contraseña nueva").fill(`${newPassword} otra vez`);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "El enlace no es válido o ha caducado.",
  );

  await signIn(page, account.email, newPassword);
  await expect(page).toHaveURL(/\/es\/account$/);
});

test("tras iniciar sesión no se redirige a otro sitio", async ({ page }) => {
  const account = newAccount();
  await register(page, account);
  await expect(page.getByRole("main").getByRole("status")).toBeVisible();

  await page.goto("/es/sign-in?next=https://example.com/robo");
  await page.getByLabel("Nombre de cuenta o correo").fill(account.username);
  await page.getByLabel("Contraseña", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/localhost:\d+\/es\/account$/);
});

test("un enlace de verificación manipulado no es válido", async ({ page }) => {
  await page.goto("/es/verify-email?token=no-es-un-token");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "El enlace no es válido o ha caducado.",
  );
});
