/**
 * Comprueba que cada combinación de texto y fondo que usan los componentes
 * cumple el contraste mínimo de WCAG 2.2 AA (4.5:1 para texto normal).
 *
 * Lee los colores directamente de `globals.css`, así que si alguien cambia
 * un token por uno con poco contraste, este test falla.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const tokens = new Map(
  [...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]),
);
tokens.set("white", "#ffffff");

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

/** Pares [texto, fondo] usados en la interfaz. */
const PAIRS: [string, string][] = [
  // Texto general sobre los fondos de página y paneles
  ["ink-900", "parchment-100"],
  ["ink-900", "parchment-50"],
  ["ink-900", "parchment-300"],
  ["ink-900", "sky-100"],
  ["ink-900", "teal-100"],
  ["ink-900", "white"],
  ["ink-600", "parchment-100"],
  ["ink-600", "white"],
  // Enlaces y botón "ghost"
  ["navy-700", "parchment-100"],
  ["navy-700", "sky-100"],
  ["navy-700", "white"],
  // Botones
  ["navy-950", "gold-500"],
  ["navy-950", "gold-300"],
  ["white", "navy-700"],
  ["white", "navy-900"],
  ["white", "danger-700"],
  ["white", "navy-950"],
  // Cabeceras de panel, insignias, pie
  ["white", "teal-700"],
  ["white", "success-700"],
  ["gold-700", "parchment-50"],
];

describe("contraste de los tokens de color (WCAG 2.2 AA)", () => {
  it.each(PAIRS)("%s sobre %s ≥ 4.5:1", (text, background) => {
    const fg = tokens.get(text);
    const bg = tokens.get(background);
    expect(fg, `falta el token ${text}`).toBeDefined();
    expect(bg, `falta el token ${background}`).toBeDefined();
    expect(contrast(fg!, bg!)).toBeGreaterThanOrEqual(4.5);
  });
});
