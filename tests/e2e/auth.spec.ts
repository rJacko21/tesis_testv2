/**
 * Cuentas (RF-03): registro, verificación del correo, inicio y cierre de
 * sesión, límite de intentos y recuperación de la contraseña.
 *
 * Los correos se leen de Mailpit (`docker compose up -d mail`), que los
 * recoge sin enviarlos. Cada prueba usa datos únicos y una IP propia
 * (`X-Forwarded-For`), para que los límites por IP de una prueba no
 * afecten a otra.
 */
import { expect, type Page, test } from "@playwright/test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

let counter = 0;
/** Datos de una cuenta nueva, distintos en cada llamada. */
function newAccount() {
  const id = `${Date.now().toString(36)}${(counter++).toString(36)}${Math.floor(Math.random() * 1e4)}`;
  return {
    username: `e2e_${id}`.slice(0, 16),
    email: `e2e-${id}@example.test`,
    // Frases largas y únicas: no aparecen en filtraciones.
    password: `farolillo verde ${id} navega`,
  };
}

test.beforeEach(async ({ page }) => {
  const ip = `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
  // Sin banner de cookies tapando los botones en móvil.
  await page
    .context()
    .addCookies([{ name: "consent", value: "1.analytics:0", domain: "localhost", path: "/" }]);
});

/** Espera el correo con ese asunto y devuelve el enlace que contiene, como ruta local. */
async function linkFromMail(page: Page, to: string, subject: RegExp): Promise<string> {
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

async function register(page: Page, account: ReturnType<typeof newAccount>) {
  await page.goto("/es/register");
  await page.getByLabel("Nombre de cuenta").fill(account.username);
  await page.getByLabel("Correo electrónico").fill(account.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(account.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
}

async function signIn(page: Page, identifier: string, password: string) {
  await page.goto("/es/sign-in");
  await page.getByLabel("Nombre de cuenta o correo").fill(identifier);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

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
  await page.getByLabel("Contraseña nueva").fill(newPassword);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "Tu contraseña ha cambiado.",
  );

  // El enlace solo sirve una vez.
  await page.goto(resetLink);
  await page.getByLabel("Contraseña nueva").fill(`${newPassword} otra vez`);
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
