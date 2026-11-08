/**
 * Cesta y compra con AP (RF-05) sobre los datos de demo.
 *
 * Cada prueba crea su cuenta. El saldo, el correo confirmado y el personaje
 * se ponen directamente en la base: la recarga llega en T-21 y los
 * personajes vienen del juego. Las reglas de la transacción y la
 * concurrencia se prueban contra MySQL en `tests/db/purchase.test.ts`.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { isolateEachTest, signedInAccount, withDb } from "./helpers";

isolateEachTest();

/** Confirma el correo, da saldo (con su movimiento) y un personaje sin dueño. */
async function prepare(username: string, balance: number, { character = true } = {}) {
  return withDb(async (db) => {
    const [[user]] = (await db.query("SELECT id FROM users WHERE username = ?", [
      username.toLowerCase(),
    ])) as [{ id: number }[], unknown];
    await db.query("UPDATE users SET email_verified = 1, ap_balance = ? WHERE id = ?", [
      balance,
      user!.id,
    ]);
    if (balance > 0) {
      await db.query(
        "INSERT INTO ap_ledger (user_id, delta, reason, balance_after) VALUES (?, ?, 'admin', ?)",
        [user!.id, balance, balance],
      );
    }
    if (!character) return null;
    const [[picked]] = (await db.query(
      `SELECT c.id, c.name, s.name AS server FROM characters c JOIN servers s ON s.id = c.server_id
        WHERE c.user_id IS NULL ORDER BY RAND() LIMIT 1`,
    )) as [{ id: number; name: string; server: string }[], unknown];
    await db.query("UPDATE characters SET user_id = ? WHERE id = ?", [user!.id, picked!.id]);
    return picked!;
  });
}

/** Abre la ficha del artículo más barato y devuelve su nombre y precio final. */
async function openCheapestItem(page: Page) {
  await page.goto("/es/shop?sort=price-asc");
  const card = page.getByRole("article").first();
  const name = (await card.getByRole("heading").textContent())!;
  const price = Number((await card.locator("strong").textContent())!.replace(/\D/g, ""));
  await card.getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  return { name, price };
}

const status = (page: Page) => page.getByRole("main").filter({ visible: true }).getByRole("status");

test("sin sesión, «Añadir a la cesta» lleva a iniciar sesión y vuelve a la ficha", async ({
  page,
}) => {
  await openCheapestItem(page);
  const itemPath = new URL(page.url()).pathname;
  await page.getByRole("button", { name: "Añadir a la cesta" }).click();
  await expect(page).toHaveURL(`/es/sign-in?next=${encodeURIComponent(itemPath)}`);
});

test("comprar: añadir, cambiar la cantidad, elegir personaje y pagar con AP", async ({ page }) => {
  const account = await signedInAccount(page);
  const character = await prepare(account.username, 5000);

  const { name, price } = await openCheapestItem(page);
  await page.getByLabel("Cantidad").selectOption("3");
  await page.getByRole("button", { name: "Añadir a la cesta" }).click();
  await expect(page).toHaveURL(/\/es\/cart\?added=\d+$/);
  await expect(status(page)).toHaveText(`${name} se ha añadido a tu cesta.`);

  const line = page.getByRole("article", { name });
  await expect(line.getByLabel("Cantidad")).toHaveValue("3");
  await line.getByLabel("Cantidad").selectOption("2");
  await line.getByRole("button", { name: "Actualizar" }).click();
  await expect(status(page)).toHaveText("Cantidad actualizada.");

  const amount = (n: number) => `${new Intl.NumberFormat("es").format(n)} AP`;
  const summary = page.getByRole("region", { name: "Resumen" });
  await expect(summary).toContainText(`Total${amount(price * 2)}`);
  await expect(summary).toContainText(`Saldo tras pagar${amount(5000 - price * 2)}`);

  // Axe con la cesta llena, antes de pagar.
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

  await expect(page.getByLabel("Personaje que recibe los objetos")).toContainText(
    `${character!.name} (${character!.server})`,
  );
  await page.getByRole("button", { name: `Pagar ${amount(price * 2)}` }).click();
  await expect(status(page)).toContainText(/^Compra completada: pedido n\.º \d+\./);
  await expect(page.getByText("Tu cesta está vacía.")).toBeVisible();

  await status(page).getByRole("link", { name: "Ver mis compras" }).click();
  const order = page.getByRole("article").first();
  await expect(order).toContainText(`2 × ${name}`);
  await expect(order).toContainText(`Para ${character!.name}`);
  await expect(order).toContainText("Entregado");
  await page.goto("/es/account");
  await expect(page.getByText(amount(5000 - price * 2), { exact: true })).toBeVisible();
});

test("sin saldo suficiente dice cuánto falta y ofrece recargar (CA de RF-05)", async ({ page }) => {
  const account = await signedInAccount(page);
  await prepare(account.username, 100);
  const { price } = await openCheapestItem(page);
  await page.getByRole("button", { name: "Añadir a la cesta" }).click();

  const missing = new Intl.NumberFormat("es").format(price - 100);
  await expect(page.getByText(`Te faltan ${missing} AP para pagar esta cesta.`)).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Recargar AP" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Pagar/ })).toHaveCount(0);
});

test("sin correo confirmado o sin personajes no se puede pagar, y se explica", async ({ page }) => {
  const account = await signedInAccount(page);
  const { name } = await openCheapestItem(page);
  await page.getByRole("button", { name: "Añadir a la cesta" }).click();
  await expect(page.getByText(/^Para comprar, confirma antes tu correo/)).toBeVisible();

  await prepare(account.username, 5000, { character: false });
  await page.reload();
  await expect(
    page.getByText("Tu cuenta aún no tiene personajes.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Pagar/ })).toHaveCount(0);

  await page.getByRole("button", { name: `Quitar ${name}` }).click();
  await expect(status(page)).toHaveText("Artículo quitado de la cesta.");
  await expect(page.getByText("Tu cesta está vacía.")).toBeVisible();
});
