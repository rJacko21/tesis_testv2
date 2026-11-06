/**
 * Layout raíz de la aplicación.
 *
 * Carga las tipografías de la web original (Alegreya para títulos, Nunito
 * para texto) con `next/font`, que las autoaloja: no hay petición a Google
 * Fonts en el navegador y se evita el salto de diseño (CLS) al cargarlas.
 *
 * El atributo `lang` será dinámico cuando llegue el enrutado por idioma
 * (T-08); de momento la portada provisional está en inglés.
 *
 * @see RNF-01 Rendimiento · P6 Fidelidad a la identidad
 */
import type { Metadata, Viewport } from "next";
import { Alegreya, Nunito } from "next/font/google";

import "./globals.css";

const display = Alegreya({
  variable: "--font-alegreya",
  // latin-ext cubre los caracteres del turco (ğ, ş, ı, İ) y del resto de idiomas.
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const body = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Florensia",
  description: "Florensia Online: free-to-play anime MMORPG on land and sea.",
};

/**
 * Viewport sin `maximum-scale` ni `user-scalable=no`: la web original
 * impedía hacer zoom en móvil (fallo F-26, WCAG 1.4.4).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b2a4a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
