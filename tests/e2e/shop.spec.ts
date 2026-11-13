/**
 * Catálogo de la tienda (RF-05) sobre los datos de demo (`pnpm db:seed:demo`):
 * los 28 artículos reales de la tienda oficial (M-45), en 2 categorías
 * (Atuendos con 3 subcategorías y Consumibles con 1), la mayoría rebajados
 * por las campañas oficiales (Headgear Havoc, Angels & Devils…).
 *
 * Cubren los criterios de aceptación de RF-05 y los fallos F-19 (sin
 * búsqueda, filtros ni orden, nombres recortados) y F-44 (sin URL por
 * artículo) de la web original.
 */
import { expect, type Page, test } from "@playwright/test";

import { isolateEachTest } from "./helpers";

isolateEachTest();

const cards = (page: Page) => page.getByRole("article");
const cardLinks = (page: Page) => cards(page).getByRole("heading", { level: 2 }).getByRole("link");

/** Precio final de cada tarjeta, en AP (`2700 AP` o `2.700 AP`). */
async function finalPrices(page: Page): Promise<number[]> {
  const texts = await cards(page).locator("strong").allTextContents();
  return texts.map((text) => Number(text.replace(/\D/g, "")));
}

test("lista 24 artículos con nombre completo, duración y precio, y pagina", async ({ page }) => {
  await page.goto("/es/shop");
  await expect(page.getByRole("heading", { level: 1, name: "Tienda de objetos" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("28 artículos");
  await expect(cards(page)).toHaveCount(24);

  // El nombre completo está en el texto y en `title` (F-19).
  const first = cardLinks(page).first();
  await expect(first).toHaveAttribute("title", (await first.textContent())!);
  await expect(first).toHaveAttribute("href", /^\/es\/shop\/item\/\d+$/);
  await expect(cards(page).first()).toContainText(/Permanente|\d+ días?/);

  const nav = page.getByRole("navigation", { name: "Páginas" });
  await expect(nav).toContainText("Página 1 de 2");
  await nav.getByRole("link", { name: "Siguiente" }).click();
  await expect(page).toHaveURL(/\/es\/shop\?page=2$/);
  await expect(cards(page)).toHaveCount(4);
});

test("las categorías y subcategorías filtran y se marcan como actuales", async ({ page }) => {
  await page.goto("/es/shop");
  const menu = page.getByRole("navigation", { name: "Categorías de la tienda" });
  await expect(menu.getByRole("link", { name: "Todo" })).toHaveAttribute("aria-current", "page");

  await menu.getByRole("link", { name: "Atuendos" }).click();
  await expect(page).toHaveURL(/\?cat=outfits$/);
  await expect(menu.getByRole("link", { name: "Atuendos" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("status")).toHaveText("22 artículos");

  await menu.getByRole("link", { name: "Trajes" }).click();
  await expect(page).toHaveURL(/\?cat=outfits&sub=dresses$/);
  await expect(page.getByRole("status")).toHaveText("8 artículos");
  await expect(menu.getByRole("link", { name: "Trajes" })).toHaveAttribute("aria-current", "page");
});

test("busca por palabras sin distinguir mayúsculas y avisa si no hay nada", async ({ page }) => {
  await page.goto("/es/shop");
  const search = page.getByRole("searchbox", { name: "Buscar por nombre" });
  await search.fill("CROWN ice");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page).toHaveURL(/q=CROWN\+ice/);
  await expect(page.getByRole("status")).toHaveText("1 artículo · con «CROWN ice»");
  await expect(cardLinks(page)).toHaveText(["Ice Crown"]);

  await page.goto("/es/shop?q=dragón");
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByText("Ningún artículo contiene «dragón» en el nombre.")).toBeVisible();
  // Las búsquedas no se indexan.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("solo rebajas, ordenadas por precio: con descuento y precio tachado", async ({ page }) => {
  await page.goto("/es/shop");
  await page.getByRole("checkbox", { name: "Solo rebajas" }).check();
  await page.getByRole("combobox", { name: "Ordenar por" }).selectOption("price-asc");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(page).toHaveURL(/sale=1/);

  const count = await cards(page).count();
  expect(count).toBeGreaterThan(0);
  for (const card of await cards(page).all()) {
    await expect(card.getByText(/^-\d+ %$/)).toBeVisible();
    await expect(card.locator("del")).toContainText("Antes");
  }
  const prices = await finalPrices(page);
  expect(prices).toEqual([...prices].sort((a, b) => a - b));

  await page.getByRole("combobox", { name: "Precio" }).selectOption("1000");
  await page.getByRole("button", { name: "Aplicar" }).click();
  for (const price of await finalPrices(page)) expect(price).toBeLessThanOrEqual(1000);
});

test("cada artículo tiene su ficha con URL propia y migas de pan (F-44)", async ({ page }) => {
  await page.goto("/es/shop?sale=1");
  const link = cardLinks(page).first();
  const name = (await link.textContent())!;
  await link.click();

  await expect(page).toHaveURL(/\/es\/shop\/item\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page).toHaveTitle(new RegExp(name));
  // Next conserva oculta la página anterior: solo cuenta lo visible.
  const main = page.locator("main").filter({ visible: true });
  await expect(main.getByText(/^Rebaja del .+ hasta el .+/)).toBeVisible();
  await expect(main.getByText(/^-\d+ %$/)).toBeVisible();

  const crumbs = page.getByRole("navigation", { name: "Ruta de navegación" });
  await expect(crumbs.getByRole("link")).toHaveText(["Tienda de objetos", /.+/, /.+/]);
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText(name);

  // La URL de la web original lleva a la nueva.
  const id = page.url().split("/").pop();
  await page.goto(`/shop/detail/index/${id}`);
  await expect(page).toHaveURL(new RegExp(`/shop/item/${id}$`));
});

test("un cosmético enseña capturas del juego y un consumible su icono (M-45)", async ({ page }) => {
  await page.goto("/es/shop?q=Pirate+Hat");
  await cardLinks(page).first().click();
  const main = page.locator("main").filter({ visible: true });
  await expect(
    main.getByRole("img", { name: /^Pirate Hat puesto en el juego, vista \d$/ }),
  ).toHaveCount(2);

  await page.goto("/es/shop?q=HP+25%25+Potion");
  await cardLinks(page).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "HP 25% Potion" })).toBeVisible();
  await expect(
    page
      .locator("main")
      .filter({ visible: true })
      .getByRole("img", { name: /puesto en el juego/ }),
  ).toHaveCount(0);
});

test("un filtro, una página o un artículo que no existen dan la página de error", async ({
  page,
}) => {
  for (const path of ["/es/shop?cat=nope", "/es/shop?page=99", "/es/shop/item/999999"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Página no encontrada");
  }
});
