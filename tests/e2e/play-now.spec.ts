/**
 * Landing «Jugar ahora» (RF-03): el único formulario de registro, sin vídeo
 * de fondo. La URL antigua y `/register` redirigen aquí (M-40).
 */
import { expect, test } from "@playwright/test";

import { isolateEachTest, linkFromMail, newAccount } from "./helpers";

isolateEachTest();

test("registra desde la landing y ofrece descargar el juego", async ({ page }) => {
  const account = newAccount();
  await page.goto("/es/play-now");
  await expect(
    page.getByRole("heading", { level: 1, name: "Tu aventura empieza aquí" }),
  ).toBeVisible();
  await expect(page.locator("video")).toHaveCount(0);

  const form = page.getByRole("main").locator("form");
  await form.getByLabel("Nombre de cuenta").fill(account.username);
  await form.getByLabel("Correo electrónico").fill(account.email);
  await form.getByLabel("Contraseña", { exact: true }).fill(account.password);
  await form.getByLabel("Repite la contraseña").fill(account.password);
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Crear cuenta" }).click();

  const done = page.getByRole("main").getByRole("status");
  await expect(done).toBeVisible();
  await expect(done.getByRole("link", { name: "Descargar el juego" })).toHaveAttribute(
    "href",
    "/es/download",
  );
  await linkFromMail(page, account.email, /Confirma tu cuenta de Florensia/);
});

test("/register lleva aquí: hay un solo formulario de registro", async ({ page }) => {
  await page.goto("/es/register");
  await expect(page).toHaveURL(/\/es\/play-now$/);
  const form = page.getByRole("main").locator("form");
  await expect(form.getByLabel("Contraseña", { exact: true })).toHaveAttribute("minlength", "10");
  await expect(form.getByLabel("Nombre de cuenta")).toHaveAttribute("maxlength", "16");
  await expect(form.getByRole("checkbox")).toHaveAttribute("required", "");
  await expect(page.getByRole("heading", { name: "Tres pasos para jugar" })).toBeVisible();
});
