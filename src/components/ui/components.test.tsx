/**
 * Tests de los componentes base: comportamiento y accesibilidad automática
 * con axe-core (el mismo motor que usan Lighthouse y las DevTools).
 */
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import { Badge, Button, ButtonLink, buttonStyles, Panel } from ".";

/** Ejecuta axe sobre un contenedor y devuelve los identificadores de las reglas que fallan. */
async function axeViolations(container: HTMLElement): Promise<string[]> {
  const results = await axe.run(container, {
    // jsdom no calcula estilos reales; el contraste se valida en contrast.test.ts.
    rules: { "color-contrast": { enabled: false } },
  });
  return results.violations.map((v) => v.id);
}

describe("Button", () => {
  it("es type=button por defecto para no enviar formularios por accidente", () => {
    render(<Button>Añadir a la cesta</Button>);
    expect(screen.getByRole("button", { name: "Añadir a la cesta" })).toHaveProperty(
      "type",
      "button",
    );
  });

  it("deshabilitado de verdad, no solo visualmente", () => {
    render(<Button disabled>Comprar</Button>);
    expect(screen.getByRole("button")).toHaveProperty("disabled", true);
  });

  it("permite ajustar clases sin duplicar las que entran en conflicto", () => {
    expect(buttonStyles({ className: "px-2" })).not.toMatch(/\bpx-5\b/);
  });
});

describe("ButtonLink", () => {
  it("es un enlace, no un botón", () => {
    render(<ButtonLink href="/es/shop">Ir a la tienda</ButtonLink>);
    expect(screen.getByRole("link", { name: "Ir a la tienda" }).getAttribute("href")).toBe(
      "/es/shop",
    );
  });
});

describe("Panel", () => {
  it("expone su título como encabezado del nivel indicado", () => {
    render(
      <Panel title="Cesta" headingLevel={3} tone="teal">
        Vacía
      </Panel>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Cesta" })).toBeTruthy();
  });
});

describe("accesibilidad (axe)", () => {
  it("los componentes juntos no tienen infracciones", async () => {
    const { container } = render(
      <main>
        <Panel title="Mi cuenta" tone="sky">
          <p>
            Saldo: 0 AP <Badge tone="info">Nuevo</Badge>
          </p>
          <Button variant="secondary">Recargar AP</Button>
          <ButtonLink href="/es/shop" variant="ghost">
            Tienda
          </ButtonLink>
        </Panel>
      </main>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
