/**
 * Utilidades de las pruebas e2e de cuentas: datos únicos, registro, inicio
 * de sesión, correos de Mailpit y acceso directo a la base de datos local.
 */
import { expect, type Page, test } from "@playwright/test";
import mysql from "mysql2/promise";

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
const DATABASE_URL =
  process.env.DATABASE_URL ?? "mysql://florensia:florensia@localhost:3306/florensia";

let counter = 0;
/** Datos de una cuenta nueva, distintos en cada llamada. */
export function newAccount() {
  const id = `${Date.now().toString(36)}${(counter++).toString(36)}${Math.floor(Math.random() * 1e4)}`;
  return {
    username: `e2e_${id}`.slice(0, 16),
    email: `e2e-${id}@example.test`,
    // Frases largas y únicas: no aparecen en filtraciones.
    password: `farolillo verde ${id} navega`,
  };
}
export type TestAccount = ReturnType<typeof newAccount>;

/**
 * IP propia por prueba (`X-Forwarded-For`), para que los límites por IP de
 * una prueba no afecten a otra, y sin banner de cookies tapando botones.
 */
export function isolateEachTest() {
  test.beforeEach(async ({ page }) => {
    const octet = () => Math.floor(Math.random() * 254) + 1;
    await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}` });
    await page
      .context()
      .addCookies([{ name: "consent", value: "1.analytics:0", domain: "localhost", path: "/" }]);
  });
}

/** Espera el correo con ese asunto y devuelve el enlace que contiene, como ruta local. */
export async function linkFromMail(page: Page, to: string, subject: RegExp): Promise<string> {
  let text = "";
  await expect(async () => {
    const search = await page.request.get(`${MAILPIT}/api/v1/search`, {
      params: { query: `to:"${to}"` },
    });
    const { messages } = (await search.json()) as { messages: { ID: string; Subject: string }[] };
    const message = messages.find((m) => subject.test(m.Subject));
    expect(message).toBeDefined();
    const detail = await page.request.get(`${MAILPIT}/api/v1/message/${message!.ID}`);
    text = ((await detail.json()) as { Text: string }).Text;
  }).toPass({ timeout: 10_000 });
  const url = new URL(text.match(/https?:\/\/\S+/)![0]);
  return `${url.pathname}${url.search}`;
}

export async function register(page: Page, account: TestAccount) {
  await page.goto("/es/play-now");
  await page.getByLabel("Nombre de cuenta").fill(account.username);
  await page.getByLabel("Correo electrónico").fill(account.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(account.password);
  await page.getByLabel("Repite la contraseña").fill(account.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
}

export async function signIn(page: Page, identifier: string, password: string) {
  await page.goto("/es/sign-in");
  await page.getByLabel("Nombre de cuenta o correo").fill(identifier);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

/** Registra una cuenta nueva, inicia sesión y espera a «Mi cuenta». */
export async function signedInAccount(page: Page): Promise<TestAccount> {
  const account = newAccount();
  await register(page, account);
  await expect(page.getByRole("main").getByRole("status")).toBeVisible();
  await signIn(page, account.username, account.password);
  await expect(page).toHaveURL(/\/es\/account$/);
  return account;
}

/** Ejecuta consultas contra la base local (datos de prueba que la web aún no crea). */
export async function withDb<T>(run: (db: mysql.Connection) => Promise<T>): Promise<T> {
  const db = await mysql.createConnection({ uri: DATABASE_URL, timezone: "Z" });
  try {
    return await run(db);
  } finally {
    await db.end();
  }
}
