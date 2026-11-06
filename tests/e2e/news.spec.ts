/**
 * Noticias (RF-08) sobre los datos de demo (`pnpm db:seed:demo`).
 *
 * Comprueba los fallos que resuelve: listado paginado e indexable (F-14),
 * fechas siempre visibles y eventos terminados marcados (F-16, F-17) y el
 * respaldo en inglés con aviso cuando falta una traducción.
 */
import { expect, test } from "@playwright/test";

test("el listado está paginado, con fecha en cada noticia y sin borradores", async ({ page }) => {
  await page.goto("/es/news");
  await expect(page.getByRole("heading", { level: 1, name: "Noticias" })).toBeVisible();

  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(9);
  for (const card of await cards.all()) await expect(card.locator("time")).toHaveCount(1);

  await page.getByRole("link", { name: "Siguiente" }).click();
  await expect(page).toHaveURL(/\/es\/news\?page=2$/);
  await expect(page.getByText("Página 2 de 2")).toBeVisible();
  // 12 publicadas: la programada (13) y el borrador (14) no aparecen.
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.getByText(/Novedades de la tienda 13|Mantenimiento programado 14/)).toHaveCount(
    0,
  );
});

test("el filtro por categoría tiene su propia URL y marca el activo", async ({ page }) => {
  await page.goto("/es/news");
  await page
    .getByRole("navigation", { name: "Filtrar por categoría" })
    .getByRole("link", { name: "Evento" })
    .click();
  await expect(page).toHaveURL(/category=event/);
  await expect(page.getByRole("link", { name: "Evento" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("article")).toHaveCount(3);
  // Las fiestas 2 y 7 ya terminaron; la 12 sigue activa.
  await expect(page.getByText(/^Evento terminado el/)).toHaveCount(2);
});

test("una noticia sin traducir se muestra en inglés con aviso y lang=en", async ({ page }) => {
  await page.goto("/es/news/redeem-5");
  await expect(page.getByText("Disponible solo en inglés")).toBeVisible();
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toHaveText("Free code 5");
  await expect(title).toHaveAttribute("lang", "en");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/en\/news\/redeem-5$/,
  );
  // `hreflang` solo para los idiomas que tienen traducción, más x-default.
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(2);
});

test("el detalle muestra fecha, autor y el Markdown como HTML semántico", async ({ page }) => {
  await page.goto("/es/news/shop-8");
  await expect(page.getByText("Publicada el")).toBeVisible();
  await expect(page.getByText("Por el equipo de Florensia")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Nuevo en la tienda" })).toBeVisible();
  await expect(page.locator(".prose-news li")).toHaveCount(3);
  await expect(page.getByRole("link", { name: "Ir a la tienda" })).toHaveAttribute(
    "href",
    "/es/shop",
  );
});

test("las noticias no publicadas no existen", async ({ page }) => {
  for (const slug of ["shop-13", "maintenance-14", "no-existe"]) {
    await page.goto(`/es/news/${slug}`);
    await expect(page.getByRole("heading", { name: "Página no encontrada" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});

test("la portada enlaza las tres últimas noticias", async ({ page }) => {
  await page.goto("/es");
  const section = page.getByRole("region", { name: "Últimas noticias" });
  await expect(section.getByRole("article")).toHaveCount(3);
  await expect(section.getByRole("link", { name: "Fiesta del mar 12" })).toBeVisible();
});
