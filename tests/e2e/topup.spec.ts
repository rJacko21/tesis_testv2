/**
 * Recarga de AP (RF-06, F-48, F-49) con la pasarela simulada (ADR-09).
 *
 * La idempotencia del aviso firmado (CA de RF-06) se prueba contra MySQL en
 * `tests/db/topup.test.ts`; aquí, el recorrido del jugador y la ruta HTTP.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { isolateEachTest, linkFromMail, signedInAccount, withDb } from "./helpers";

isolateEachTest();

const confirmEmail = (username: string) =>
  withDb((db) =>
    db.query("UPDATE users SET email_verified = 1 WHERE username = ?", [username.toLowerCase()]),
  );

const chooseSmallest = (page: Page) =>
  page.getByRole("button", { name: /^Elegir 2500 AP por 4,99/ }).click();

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test("la página explica paquetes, pasos y AP, sin scripts de la pasarela (F-48, F-49)", async ({
  page,
}) => {
  await page.goto("/es/topup");
  await expect(page.getByRole("heading", { level: 1, name: "Recargar AP" })).toBeVisible();
  const packs = page.getByRole("region", { name: "Paquetes de AP" }).getByRole("article");
  await expect(packs).toHaveCount(4);
  await expect(packs.first()).toContainText("4,99");
  await expect(packs.nth(1)).toContainText("+9 % de AP");
  await expect(page.getByRole("heading", { name: "Cómo funciona" })).toBeVisible();
  await expect(page.getByText(/la pasarela es simulada: no se cobra dinero/)).toBeVisible();
  const scripts = await page
    .locator("script[src]")
    .evaluateAll((nodes) => nodes.map((node) => (node as HTMLScriptElement).src));
  expect(scripts.filter((src) => /xsolla/i.test(src))).toEqual([]);
});

test("sin sesión lleva a iniciar sesión; sin correo confirmado lo explica", async ({ page }) => {
  await page.goto("/es/topup");
  await chooseSmallest(page);
  await expect(page).toHaveURL("/es/sign-in?next=%2Fes%2Ftopup");

  await signedInAccount(page);
  await page.goto("/es/topup");
  await chooseSmallest(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Para recargar, confirma antes tu correo",
  );
});

test("recargar: pasarela simulada, AP acreditados, recibo e historial", async ({ page }) => {
  const account = await signedInAccount(page);
  await confirmEmail(account.username);

  await page.goto("/es/topup");
  await chooseSmallest(page);
  await expect(page).toHaveURL(/\/es\/topup\/checkout\/[0-9a-f-]{36}$/);
  await expect(page.getByText(/^Pasarela de pago simulada/)).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: /^Pagar 4,99/ }).click();

  await expect(page).toHaveURL(/\/es\/topup\/return\?payment=/);
  await expect(page.getByRole("status")).toHaveText(
    "Hecho: se han añadido 2500 AP. Tu saldo ahora es de 2500 AP. Te hemos enviado el recibo por correo.",
  );
  await linkFromMail(page, account.email, /Tu recibo: 2500 AP añadidos/);

  // Volver a abrir la página de vuelta no acredita otra vez.
  await page.reload();
  await expect(page.getByRole("status")).toContainText("Tu saldo ahora es de 2500 AP");

  await page.goto("/es/account/topups");
  await expect(page.getByRole("table").getByRole("row").nth(1)).toContainText("Pagada");
  await page.goto("/es/account");
  await expect(page.getByText("2500 AP", { exact: true })).toBeVisible();
});

test("cancelar en la pasarela no acredita nada", async ({ page }) => {
  const account = await signedInAccount(page);
  await confirmEmail(account.username);
  await page.goto("/es/topup");
  await chooseSmallest(page);
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "El pago no se completó. No se ha cobrado nada y tu saldo no ha cambiado.",
  );
  await page.goto("/es/account");
  await expect(page.getByText("0 AP", { exact: true })).toBeVisible();
});

test("el webhook rechaza avisos sin firma válida y proveedores desconocidos", async ({
  request,
}) => {
  const body = JSON.stringify({
    provider_payment_id: "x",
    status: "paid",
    amount_cents: 499,
    currency: "EUR",
  });
  const forged = await request.post("/api/payments/mock/webhook", {
    data: body,
    headers: { "content-type": "application/json", authorization: `Signature ${"0".repeat(64)}` },
  });
  expect(forged.status()).toBe(401);
  const unknown = await request.post("/api/payments/xsolla/webhook", { data: body });
  expect(unknown.status()).toBe(404);
});
