/**
 * Contacto con soporte (RF-10, M-39): el mensaje llega por correo al buzón
 * de soporte (Mailpit en local) con `Reply-To` del jugador.
 */
import { expect, type Page, test } from "@playwright/test";

import { isolateEachTest, newAccount, signedInAccount } from "./helpers";

isolateEachTest();

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "tigremorado4@gmail.com";

interface MailDetail {
  To: { Address: string }[];
  ReplyTo: { Address: string }[];
  Subject: string;
  Text: string;
}

/** Espera el correo cuyo asunto contiene `subject` y devuelve su detalle. */
async function mailWithSubject(page: Page, subject: string): Promise<MailDetail> {
  let detail: MailDetail | undefined;
  await expect(async () => {
    const search = await page.request.get(`${MAILPIT}/api/v1/search`, {
      params: { query: `subject:"${subject}"` },
    });
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    expect(messages).toHaveLength(1);
    const response = await page.request.get(`${MAILPIT}/api/v1/message/${messages[0]!.ID}`);
    detail = (await response.json()) as MailDetail;
  }).toPass({ timeout: 10_000 });
  return detail!;
}

async function fillContact(page: Page, email: string, subject: string) {
  await page.getByLabel("Tu nombre").fill("Ana Prueba");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Motivo").selectOption({ label: "Pagos y AP" });
  await page.getByLabel("Asunto").fill(subject);
  await page
    .getByLabel("Mensaje")
    .fill("Compré 500 AP ayer y no aparecen.\nCuenta: ana, servidor Bergruen.");
}

test("desde soporte se llega al formulario y el mensaje llega al buzón", async ({ page }) => {
  await page.goto("/es/support");
  await page.getByRole("link", { name: "Escribir a soporte" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contactar con soporte");

  const { email } = newAccount();
  const subject = `AP no recibidos ${Date.now().toString(36)}`;
  await fillContact(page, email, subject);
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText(
    `Mensaje enviado. El equipo de soporte responderá a ${email}.`,
  );

  const mail = await mailWithSubject(page, subject);
  expect(mail.Subject).toBe(`[Support · Payments and AP] ${subject}`);
  expect(mail.To.map((to) => to.Address)).toEqual([SUPPORT_EMAIL]);
  expect(mail.ReplyTo.map((to) => to.Address)).toEqual([email]);
  expect(mail.Text).toContain("Page language: Español (es)");
  expect(mail.Text).toContain("Account: Not signed in");
  expect(mail.Text).toContain("Cuenta: ana, servidor Bergruen.");
});

test("con sesión iniciada, el correo dice qué cuenta escribe", async ({ page }) => {
  const account = await signedInAccount(page);
  await page.goto("/es/support/contact");
  const subject = `Cuenta ${Date.now().toString(36)}`;
  await fillContact(page, account.email, subject);
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Mensaje enviado.");

  const mail = await mailWithSubject(page, subject);
  expect(mail.Text).toContain(`Account: ${account.username.toLowerCase()} (id `);
});

test("el servidor valida y conserva lo escrito", async ({ page }) => {
  await page.goto("/es/support/contact");
  // Sin la validación del navegador, para comprobar la del servidor.
  await page
    .getByRole("main")
    .locator("form")
    .evaluate((form) => form.setAttribute("novalidate", ""));
  await page.getByLabel("Tu nombre").fill("Ana");
  await page.getByLabel("Correo electrónico").fill("no-es-un-correo");
  await page.getByLabel("Mensaje").fill("Muy corto");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();

  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Revisa los campos marcados.");
  await expect(page.getByLabel("Motivo")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Asunto")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Mensaje")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Entre 20 y 5000 caracteres.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Tu nombre")).toHaveValue("Ana");
  await expect(page.getByLabel("Mensaje")).toHaveValue("Muy corto");
});
