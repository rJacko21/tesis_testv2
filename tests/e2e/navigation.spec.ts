/**
 * Navegación global (RF-02): menú móvil y submenú Comunidad con teclado.
 */
import { expect, test } from "@playwright/test";

test.describe("menú móvil", () => {
  test.skip(({ isMobile }) => !isMobile, "solo en móvil");

  test("se abre, atrapa el foco, se cierra con Escape y devuelve el foco", async ({ page }) => {
    await page.goto("/es");
    const button = page.getByRole("button", { name: "Abrir menú" });
    await expect(button).toHaveAttribute("aria-expanded", "false");

    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const menu = page.getByRole("dialog", { name: "Navegación principal" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: "Tienda" })).toBeVisible();
    await expect(menu.getByRole("link", { name: /Flandria.*sitio externo/ })).toBeVisible();

    // El foco nunca llega a la página de detrás (es inerte). Tras el último
    // enlace puede pasar a la interfaz del navegador (`body`), como exige la
    // especificación de <dialog>, y vuelve al diálogo.
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      const where = await menu.evaluate((el) =>
        el.contains(document.activeElement) ? "dialog" : document.activeElement?.tagName,
      );
      expect(["dialog", "BODY"]).toContain(where);
    }

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });

  test("se cierra al navegar a otra página", async ({ page }) => {
    await page.goto("/es");
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Rankings" }).click();
    await expect(page).toHaveURL(/\/es\/rankings$/);
    await expect(page.getByRole("dialog")).toBeHidden();
    // La cabecera no se vuelve a pintar al navegar, pero marca la página actual.
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await expect(page.getByRole("dialog").getByRole("link", { name: "Rankings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("se cierra al pulsar fuera del panel", async ({ page }) => {
    await page.goto("/es");
    await page.getByRole("button", { name: "Abrir menú" }).click();
    const menu = page.getByRole("dialog", { name: "Navegación principal" });
    await expect(menu).toBeVisible();
    // El fondo queda a la izquierda del panel, que ocupa el lado derecho.
    await page.mouse.click(5, 300);
    await expect(menu).toBeHidden();
  });

  test("funciona sin Invoker Commands (Safari < 26.2)", async ({ page }) => {
    await page.addInitScript(() => {
      delete (HTMLButtonElement.prototype as { command?: string }).command;
      // Sin la API el navegador ignora `commandfor`: se anula el comando nativo.
      document.addEventListener(
        "click",
        (event) => {
          if ((event.target as Element).closest("button[commandfor]")) event.preventDefault();
        },
        true,
      );
    });
    await page.goto("/es");
    const button = page.getByRole("button", { name: "Abrir menú" });
    await button.click();
    await expect(page.getByRole("dialog", { name: "Navegación principal" })).toBeVisible();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("button", { name: "Cerrar menú" }).click();
    await expect(page.getByRole("dialog", { name: "Navegación principal" })).toBeHidden();
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("navegación de escritorio", () => {
  test.skip(({ isMobile }) => isMobile, "solo en escritorio");

  test("Comunidad se abre, recorre y cierra con teclado (CA de RF-02)", async ({ page }) => {
    await page.goto("/de");
    const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
    const summary = nav.locator("summary", { hasText: "Community" });
    await summary.focus();
    await page.keyboard.press("Enter");
    const rules = nav.getByRole("link", { name: "Regeln" });
    await expect(rules).toBeVisible();

    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(rules).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(rules).toBeHidden();
    await expect(summary).toBeFocused();
  });

  test("el selector de idioma conserva la página tras navegar y se cierra al salir", async ({
    page,
  }) => {
    await page.goto("/es");
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await nav.getByRole("link", { name: "Noticias" }).click();
    await expect(page).toHaveURL(/\/es\/news$/);
    await expect(nav.getByRole("link", { name: "Noticias" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    const switcher = page
      .getByRole("banner")
      .locator("details", { has: page.locator("[hreflang]") });
    await switcher.locator("summary").click();
    await expect(switcher.getByRole("link", { name: "Deutsch" })).toHaveAttribute(
      "href",
      "/de/news",
    );
    await page.getByRole("main").click({ position: { x: 5, y: 5 } });
    await expect(switcher).not.toHaveAttribute("open");
  });

  test("todos los enlaces internos mantienen el idioma (F-06)", async ({ page }) => {
    await page.goto("/fr");
    const hrefs = await page
      .getByRole("banner")
      // Los enlaces del selector de idioma (`hreflang`) llevan a otro idioma a propósito.
      .locator("a[href^='/']:not([hreflang])")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThan(5);
    for (const href of hrefs) expect(href).toMatch(/^\/fr(\/|$)/);
  });
});
