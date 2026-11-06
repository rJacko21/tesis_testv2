/**
 * Rankings (RF-07) sobre los datos de demo (`pnpm db:seed:demo`).
 *
 * Los nombres de personajes son sintéticos, así que las pruebas los leen de
 * la propia tabla en lugar de fijarlos. Cubren los criterios de aceptación
 * de RF-07 y los fallos F-20 y F-28 de la web original.
 */
import { expect, type Page, test } from "@playwright/test";

const rows = (page: Page) => page.locator("tbody tr");

test("la tabla tiene cabeceras de texto, 50 filas y fecha de actualización (F-20)", async ({
  page,
}) => {
  await page.goto("/es/rankings");
  await expect(page.getByRole("heading", { level: 1, name: "Rankings" })).toBeVisible();

  const table = page.getByRole("table", {
    name: /Ranking de Total, Todas las clases\. Página 1 de \d+/,
  });
  for (const header of [
    "Puesto",
    "Cambio",
    "Personaje",
    "Clase",
    "Nivel de tierra",
    "Nivel de mar",
    "Gremio",
    "Servidor",
  ]) {
    await expect(table.getByRole("columnheader", { name: header })).toBeVisible();
  }
  await expect(rows(page)).toHaveCount(50);
  await expect(rows(page).first().locator("td").first()).toHaveText("1");
  await expect(page.locator("time")).toHaveText(/^Actualizado el .+ a las \d{1,2}:\d{2} UTC$/);
  await expect(page.getByText(/^45\.000 personajes$/)).toBeVisible();
});

test("la tendencia se anuncia con texto, no solo con una flecha (F-28)", async ({ page }) => {
  await page.goto("/es/rankings");
  const trends = page.locator("tbody td:nth-child(2)");
  const texts = await trends.allTextContents();
  // Los datos de demo tienen subidas y bajadas entre las dos fotos.
  expect(texts.some((text) => /Sube \d+ puestos?/.test(text))).toBe(true);
  for (const text of texts) expect(text).toMatch(/Sube|Baja|Sin cambios|Nuevo/);
});

test("filtro mar + Sniper: al cambiar de página el filtro se mantiene en la URL (CA de RF-07)", async ({
  page,
}) => {
  await page.goto("/es/rankings");
  await page.getByLabel("Área", { exact: true }).selectOption("sea");
  await page.getByLabel("Clase", { exact: true }).selectOption("sniper");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page).toHaveURL(/\/es\/rankings\?area=sea&class=sniper/);
  await expect(
    page.getByRole("table", { name: /Ranking de Mar, Sniper\. Página 1/ }),
  ).toBeVisible();
  for (const cell of await page.locator("tbody td:nth-child(4)").allTextContents()) {
    expect(cell.trim()).toBe("Sniper");
  }

  await page.getByRole("link", { name: "Siguiente" }).click();
  await expect(page).toHaveURL(/area=sea&class=sniper&page=2$/);
  await expect(
    page.getByRole("table", { name: /Ranking de Mar, Sniper\. Página 2/ }),
  ).toBeVisible();
  await expect(rows(page).first().locator("td").first()).toHaveText("51");
  await expect(page.getByLabel("Clase", { exact: true })).toHaveValue("sniper");
});

test("buscar un personaje muestra su fila con su puesto real (CA de RF-07)", async ({ page }) => {
  await page.goto("/es/rankings?page=3");
  const row = rows(page).nth(7);
  const name = (await row.locator("th").textContent())!.trim();
  const rank = (await row.locator("td").first().textContent())!.trim();

  await page.getByLabel("Personaje o gremio").fill(name);
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(name)}`));
  const found = rows(page).filter({ has: page.getByRole("rowheader", { name, exact: true }) });
  await expect(found.locator("td").first()).toHaveText(rank);
  // Una búsqueda no se indexa.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("buscar por gremio muestra a sus miembros", async ({ page }) => {
  await page.goto("/es/rankings");
  const guild = (await page.locator("tbody td:nth-child(7)").first().textContent())!.trim();
  await page.goto(`/es/rankings?q=${encodeURIComponent(guild)}`);
  const guilds = await page.locator("tbody td:nth-child(7)").allTextContents();
  expect(guilds.length).toBeGreaterThan(0);
  // Coinciden por gremio o por el nombre del personaje.
  const names = await page.locator("tbody th").allTextContents();
  guilds.forEach((g, i) => {
    const prefix = guild.toLowerCase();
    expect(g.toLowerCase().startsWith(prefix) || names[i]!.toLowerCase().startsWith(prefix)).toBe(
      true,
    );
  });
});

test("una búsqueda sin resultados lo dice", async ({ page }) => {
  await page.goto("/es/rankings?q=zzzzzz");
  await expect(page.getByText("Ningún personaje ni gremio empieza por «zzzzzz».")).toBeVisible();
});

test("se puede saltar a cualquier página (F-20)", async ({ page }) => {
  await page.goto("/es/rankings?area=land");
  await page.getByLabel("Ir a la página").fill("900");
  await page.getByRole("button", { name: "Ir", exact: true }).click();
  await expect(page).toHaveURL(/area=land&page=900$/);
  await expect(rows(page).first().locator("td").first()).toHaveText("44951");
});

test("un filtro que no existe no se indexa", async ({ page }) => {
  await page.goto("/es/rankings?area=air");
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
});

test("las URLs de rankings de la web original redirigen con 301", async ({ request }) => {
  const response = await request.get("/en/rankings/global/sea/Sniper?page=3", { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  const location = new URL(response.headers()["location"]!, "http://localhost");
  expect(location.pathname).toBe("/en/rankings");
  expect(Object.fromEntries(location.searchParams)).toEqual({
    area: "sea",
    class: "sniper",
    page: "3",
  });
});

test("en móvil la tabla se desplaza dentro de su caja, no la página", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/es/rankings");
  const region = page.getByRole("region", { name: /Ranking de Total/ });
  const { scroll, client } = await region.evaluate((el) => ({
    scroll: el.scrollWidth,
    client: el.clientWidth,
  }));
  expect(scroll).toBeGreaterThan(client);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
