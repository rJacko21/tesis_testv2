/**
 * Configuración de Playwright (tests extremo a extremo y de accesibilidad).
 *
 * Cada criterio de aceptación de `docs/plan/03-especificacion.md` acaba
 * siendo un test aquí (P7). Se prueba primero en móvil (P1) y después en
 * escritorio, contra el build de producción, que es lo que verá el usuario.
 *
 * `CHROMIUM_PATH` permite usar un Chromium ya instalado en local; en CI
 * se instala el de Playwright.
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
/** Pruebas que cambian contenido público y no pueden ir en paralelo con el resto. */
const PUBLISHING = /admin-(news|shop|promotions)\.spec\.ts$/;
const executablePath = process.env.CHROMIUM_PATH;
const launchOptions = executablePath ? { executablePath } : {};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    // Móvil primero: Pixel 7 emulado en Chromium (360-412 px de ancho).
    {
      name: "movil",
      testIgnore: PUBLISHING,
      use: { ...devices["Pixel 7"], launchOptions },
    },
    {
      name: "escritorio",
      testIgnore: PUBLISHING,
      use: { ...devices["Desktop Chrome"], launchOptions },
    },
    // Publica noticias y cambia la tienda de verdad: va después, para no cambiar lo que cuentan
    // las pruebas de la web pública (`news.spec.ts`, `shop.spec.ts`) mientras se ejecutan.
    {
      name: "publicacion",
      testMatch: PUBLISHING,
      dependencies: ["movil", "escritorio"],
      use: { ...devices["Desktop Chrome"], launchOptions },
    },
  ],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
