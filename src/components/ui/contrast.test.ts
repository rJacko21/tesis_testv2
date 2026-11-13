/**
 * Comprueba que cada combinación de texto y fondo que usan los componentes
 * cumple el contraste mínimo de WCAG 2.2 AA (4.5:1 para texto normal).
 *
 * Lee los colores directamente de `globals.css`, en el tema claro y en el
 * oscuro, así que si alguien cambia un token por uno con poco contraste en
 * cualquiera de los dos, este test falla.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** Tokens `--color-*` con valor hexadecimal declarados en un bloque de CSS. */
function readTokens(block: string): Map<string, string> {
  return new Map(
    [...block.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]),
  );
}

/** Contenido del primer bloque `{ … }` que sigue a `selector`. */
function blockOf(selector: string): string {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`no se encontró ${selector} en globals.css`);
  return css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
}

// El tema claro son los valores de `@theme`; el oscuro (M-44) cambia algunos.
const light = readTokens(blockOf("@theme"));
light.set("white", "#ffffff");
const dark = new Map([...light, ...readTokens(blockOf(':root[data-theme="dark"]'))]);
const THEMES = { claro: light, oscuro: dark };

/** Luminancia relativa según WCAG 2.2. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** Relación de contraste entre dos colores (de 1 a 21). */
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

/** Pares [texto, fondo] usados en la interfaz; se comprueban en los dos temas. */
const PAIRS: [string, string][] = [
  // Texto general sobre los fondos de página, tarjetas y paneles
  ["ink-900", "parchment-100"],
  ["ink-900", "parchment-50"],
  ["ink-900", "parchment-300"],
  ["ink-900", "sky-100"],
  ["ink-900", "teal-100"],
  ["ink-900", "surface"],
  ["ink-600", "parchment-100"],
  ["ink-600", "parchment-50"],
  ["ink-600", "surface"],
  // Títulos
  ["heading", "parchment-100"],
  ["heading", "parchment-50"],
  ["heading", "surface"],
  // Enlaces y botón "ghost"
  ["link", "parchment-100"],
  ["link", "sky-100"],
  ["link", "surface"],
  // Mensajes de error y de confirmación
  ["danger", "parchment-100"],
  ["danger", "surface"],
  ["success", "parchment-100"],
  ["success", "surface"],
  // Botones (el principal es un degradado: se comprueban sus dos extremos)
  ["navy-950", "azure-300"],
  ["navy-950", "azure-500"],
  ["navy-950", "gold-500"],
  ["navy-950", "gold-300"],
  ["white", "navy-700"],
  ["white", "navy-900"],
  ["white", "danger-700"],
  ["white", "navy-950"],
  // Cabecera, portada y pie (marinos en los dos temas)
  ["on-dark", "navy-950"],
  ["on-dark", "navy-900"],
  ["gold-300", "navy-950"],
  // Cabeceras de panel, insignias
  ["white", "teal-700"],
  ["white", "success-700"],
  ["teal-900", "teal-100"],
  ["gold-700", "parchment-50"],
  ["gold-700", "surface"],
];

describe.each(Object.entries(THEMES))(
  "contraste de los tokens de color en el tema %s (WCAG 2.2 AA)",
  (_name, tokens) => {
    it.each(PAIRS)("%s sobre %s ≥ 4.5:1", (text, background) => {
      const fg = tokens.get(text);
      const bg = tokens.get(background);
      expect(fg, `falta el token ${text}`).toBeDefined();
      expect(bg, `falta el token ${background}`).toBeDefined();
      expect(contrast(fg!, bg!)).toBeGreaterThanOrEqual(4.5);
    });
  },
);
