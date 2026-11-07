/**
 * «Mi cuenta» (RF-04): secciones, historiales vacíos y con datos, «Mis
 * rankings», cambio de contraseña y de correo, y sesiones abiertas.
 *
 * Las compras y recargas aún no se pueden hacer desde la web (T-20, T-21),
 * así que la prueba con datos los inserta directamente en la base local.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  isolateEachTest,
  linkFromMail,
  register,
  signIn,
  signedInAccount,
  withDb,
} from "./helpers";

isolateEachTest();

/**
 * Pasa a la cuenta un personaje del ranking y le añade una compra y una
 * recarga. Devuelve el personaje con su puesto en el ranking general.
 */
async function giveTestData(username: string) {
  return withDb(async (db) => {
    const [[user]] = (await db.query("SELECT id FROM users WHERE username = ?", [
      username.toLowerCase(),
    ])) as [{ id: number }[], unknown];
    const [[picked]] = (await db.query(
      `SELECT c.id, c.name, c.server_id AS serverId, s.\`rank\`
         FROM ranking_snapshots s JOIN characters c ON c.id = s.character_id
        WHERE s.taken_at = (SELECT MAX(taken_at) FROM ranking_snapshots)
          AND s.area = 'all' AND s.class_scope = 0
        ORDER BY RAND() LIMIT 1`,
    )) as [{ id: number; name: string; serverId: number; rank: number }[], unknown];
    await db.query("UPDATE characters SET user_id = ? WHERE id = ?", [user!.id, picked!.id]);

    const [[item]] = (await db.query("SELECT id FROM shop_items ORDER BY id LIMIT 1")) as [
      { id: number }[],
      unknown,
    ];
    const [order] = (await db.query(
      "INSERT INTO orders (user_id, total_ap, status) VALUES (?, 1200, 'completed')",
      [user!.id],
    )) as [{ insertId: number }, unknown];
    await db.query(
      `INSERT INTO order_items (order_id, item_id, quantity, unit_price_ap, server_id, character_id)
       VALUES (?, ?, 2, 600, ?, ?)`,
      [order.insertId, item!.id, picked!.serverId, picked!.id],
    );
    const [[pack]] = (await db.query(
      "SELECT id, price_cents AS cents FROM topup_packages ORDER BY ap_amount LIMIT 1",
    )) as [{ id: number; cents: number }[], unknown];
    await db.query(
      `INSERT INTO payments (user_id, package_id, provider, provider_payment_id, status, amount_cents, currency)
       VALUES (?, ?, 'mock', ?, 'paid', ?, 'EUR')`,
      [user!.id, pack!.id, `e2e-${username}`, pack!.cents],
    );
    return picked!;
  });
}

test("sin sesión, cada sección lleva a iniciar sesión y vuelve después", async ({ page }) => {
  await page.goto("/es/account/purchases");
  await expect(page).toHaveURL(/\/es\/sign-in\?next=%2Fes%2Faccount%2Fpurchases$/);
});

test("una cuenta nueva ve cada sección con un mensaje que explica qué aparecerá (F-46)", async ({
  page,
}) => {
  await signedInAccount(page);
  await expect(page.getByRole("heading", { name: "Saldo de AP" })).toBeVisible();
  await expect(page.getByText("0 AP", { exact: true })).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Secciones de tu cuenta" });
  await nav.getByRole("link", { name: "Compras" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Compras" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Compras" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Aún no has comprado nada en la tienda.")).toBeVisible();

  await nav.getByRole("link", { name: "Recargas" }).click();
  await expect(page.getByText("Aún no has recargado AP.")).toBeVisible();

  await nav.getByRole("link", { name: "Personajes" }).click();
  await expect(page.getByText("Esta cuenta aún no tiene personajes.")).toBeVisible();
});

test("con datos: compras, recargas y el puesto de cada personaje en el ranking", async ({
  page,
}) => {
  const account = await signedInAccount(page);

  const character = await giveTestData(account.username);

  await page.goto("/es/account/purchases");
  const order = page.getByRole("article");
  await expect(order.getByRole("heading", { name: /^Pedido n\.º \d+$/ })).toBeVisible();
  await expect(order).toContainText("Entregado");
  await expect(order).toContainText(`Para ${character.name}`);
  await expect(order).toContainText("Total: 1200 AP");

  await page.goto("/es/account/topups");
  const table = page.getByRole("table");
  await expect(table.getByRole("columnheader", { name: "Importe" })).toBeVisible();
  await expect(table.getByRole("row").nth(1)).toContainText("2500 AP");
  await expect(table.getByRole("row").nth(1)).toContainText("Pagada");

  await page.goto("/es/account/characters");
  const card = page.getByRole("article", { name: character.name });
  const rank = new Intl.NumberFormat("es").format(character.rank);
  const rankLink = card.getByRole("link", { name: `Total n.º ${rank}` });
  await expect(rankLink).toBeVisible();
  // «Ir a mi personaje» (RF-07): el ranking muestra su fila con el puesto real.
  await rankLink.click();
  await expect(page).toHaveURL(/\/es\/rankings\?q=/);
  await expect(page.getByRole("row", { name: new RegExp(character.name) }).first()).toContainText(
    String(character.rank),
  );
});

test("cambiar la contraseña pide la actual y cierra las demás sesiones", async ({
  page,
  browser,
}) => {
  const account = await signedInAccount(page);

  // Una segunda sesión de la misma cuenta, en otro navegador.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.setExtraHTTPHeaders({ "x-forwarded-for": "10.200.0.1" });
  await signIn(otherPage, account.username, account.password);
  await expect(otherPage).toHaveURL(/\/es\/account$/);

  await page.goto("/es/account/security");
  const sessions = page.getByRole("region", { name: "Sesiones abiertas" });
  await expect(sessions.getByRole("listitem")).toHaveCount(2);
  await expect(sessions.getByText("Este dispositivo")).toBeVisible();

  const form = page.getByRole("region", { name: "Cambiar la contraseña" });
  await form.getByLabel("Contraseña actual").fill("no es la contraseña");
  await form.getByLabel("Contraseña nueva").fill(`${account.password} nueva`);
  await form.getByRole("button", { name: "Cambiar la contraseña" }).click();
  await expect(form.getByText("La contraseña actual no es correcta.")).toBeVisible();

  await form.getByLabel("Contraseña actual").fill(account.password);
  await form.getByLabel("Contraseña nueva").fill(`${account.password} nueva`);
  await form.getByRole("button", { name: "Cambiar la contraseña" }).click();
  await expect(form.getByRole("status")).toContainText("Tu contraseña ha cambiado");
  await linkFromMail(page, account.email, /Tu contraseña de Florensia ha cambiado/);

  // La otra sesión ya no vale; esta sigue abierta.
  await otherPage.goto("/es/account");
  await expect(otherPage).toHaveURL(/\/es\/sign-in/);
  await page.goto("/es/account");
  await expect(page).toHaveURL(/\/es\/account$/);
  await other.close();
});

test("cerrar las demás sesiones desde la lista", async ({ page, browser }) => {
  const account = await signedInAccount(page);
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.setExtraHTTPHeaders({ "x-forwarded-for": "10.201.0.1" });
  await signIn(otherPage, account.username, account.password);
  await expect(otherPage).toHaveURL(/\/es\/account$/);

  await page.goto("/es/account/security");
  await page.getByRole("button", { name: "Cerrar las demás sesiones" }).click();
  await expect(page.getByRole("status")).toHaveText("Sesión cerrada.");
  await expect(page.getByText("Solo tienes abierta la sesión de este dispositivo.")).toBeVisible();

  await otherPage.goto("/es/account");
  await expect(otherPage).toHaveURL(/\/es\/sign-in/);
  await other.close();
});

test("cambiar el correo: enlace al nuevo, aviso al actual y cambio al abrirlo", async ({
  page,
}) => {
  const account = await signedInAccount(page);
  const newEmail = `nuevo-${account.email}`;

  await page.goto("/es/account/security");
  const form = page.getByRole("region", { name: "Cambiar el correo" });
  await form.getByLabel("Correo nuevo").fill(newEmail);
  await form.getByLabel("Contraseña actual").fill(account.password);
  await form.getByRole("button", { name: "Enviar enlace de confirmación" }).click();
  await expect(form.getByRole("status")).toContainText(`Te hemos enviado un enlace a ${newEmail}`);

  // El correo no cambia hasta abrir el enlace.
  await page.goto("/es/account");
  await expect(page.getByText(account.email, { exact: false })).toBeVisible();
  await linkFromMail(page, account.email, /Se ha pedido cambiar el correo/);

  const link = await linkFromMail(page, newEmail, /Confirma tu nuevo correo/);
  await page.goto(link);
  await expect(page.getByText("Tu correo está confirmado.")).toBeVisible();
  await page.goto("/es/account");
  await expect(page.getByText(newEmail, { exact: false })).toBeVisible();
});

test("canjear códigos: AP al saldo, ya usado, caducado y objeto para un personaje (RF-13)", async ({
  page,
}) => {
  const account = await signedInAccount(page);
  const redeem = async (code: string, character?: string) => {
    await page.goto("/es/account/redeem");
    await page.getByLabel("Código", { exact: true }).fill(code);
    if (character) await page.getByLabel("Personaje que recibe el objeto").selectOption(character);
    await page.getByRole("button", { name: "Canjear" }).click();
  };
  const main = page.getByRole("main");

  // Da igual mayúsculas o espacios.
  await redeem(" welcome2026 ");
  await expect(main.getByRole("status")).toContainText(
    "Has recibido 500 AP. Tu saldo es ahora de 500 AP.",
  );
  await redeem("WELCOME2026");
  await expect(main.getByRole("alert")).toHaveText("Ya has usado este código.");
  await redeem("HALLOWEEN2026");
  await expect(main.getByRole("alert")).toHaveText("Ese código ha caducado.");

  // Sin personajes, un código de objeto no se puede canjear.
  await redeem("WINTERGIFT");
  await expect(main.getByRole("alert")).toHaveText(/aún no tiene personajes/);

  const character = await giveTestData(account.username);
  await redeem("WINTERGIFT");
  await expect(main.getByRole("alert")).toHaveText("Elige qué personaje recibirá el objeto.");
  await redeem("WINTERGIFT", String(character.id));
  await expect(main.getByRole("status")).toContainText(`${character.name} recibirá`);

  await page.goto("/es/account");
  await expect(page.getByText("500 AP", { exact: true })).toBeVisible();
});

test("10 códigos no válidos en 10 minutos bloquean el canje (CA de RF-13)", async ({ page }) => {
  await signedInAccount(page);
  for (let i = 0; i < 10; i++) {
    await page.goto("/es/account/redeem");
    await page.getByLabel("Código", { exact: true }).fill(`NOEXISTE${i}`);
    await page.getByRole("button", { name: "Canjear" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "Ese código no existe o no está activo.",
    );
  }
  // Ni con un código válido: hay que esperar.
  await page.goto("/es/account/redeem");
  await page.getByLabel("Código", { exact: true }).fill("WELCOME2026");
  await page.getByRole("button", { name: "Canjear" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    /^Demasiadas solicitudes\. Espera/,
  );
});

test("descargar mis datos y borrar la cuenta (RGPD)", async ({ page }) => {
  const account = await signedInAccount(page);
  await page.goto("/es/account/privacy");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Descargar mis datos" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^florensia-account-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(
    await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString()),
  );
  expect(data.account.email).toBe(account.email);
  expect(JSON.stringify(data)).not.toMatch(/argon2|password/i);

  const form = page.getByRole("region", { name: "Borrar mi cuenta" });
  await form.getByLabel("Contraseña actual").fill(account.password);
  await form.getByRole("button", { name: "Borrar mi cuenta" }).click();
  // Sin marcar la casilla, el navegador no envía el formulario.
  await expect(page).toHaveURL(/\/es\/account\/privacy$/);

  await form.getByLabel("Contraseña actual").fill(account.password);
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Borrar mi cuenta" }).click();
  await expect(page).toHaveURL(/\/es\/sign-in\?deleted=1$/);
  await expect(page.getByRole("main").getByRole("status")).toContainText("Tu cuenta se ha borrado");

  // Ya no se puede entrar, y el nombre y el correo quedan libres.
  await signIn(page, account.username, account.password);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "El nombre de cuenta, el correo o la contraseña no son correctos.",
  );
  await register(page, account);
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `te hemos enviado un enlace a ${account.email}`,
  );
});

test("todas las secciones, en los 7 idiomas: sin infracciones de axe ni scroll horizontal", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const account = await signedInAccount(page);
  await giveTestData(account.username);
  for (const locale of ["en", "pt-BR", "tr", "it", "de", "fr", "es"]) {
    for (const section of [
      "",
      "/purchases",
      "/topups",
      "/characters",
      "/redeem",
      "/security",
      "/privacy",
    ]) {
      await page.goto(`/${locale}/account${section}`);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations.map((v) => `${locale}${section}: ${v.id}: ${v.help}`)).toEqual([]);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${locale}${section}`).toBeLessThanOrEqual(0);
    }
  }
});
