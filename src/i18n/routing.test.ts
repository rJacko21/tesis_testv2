import { describe, expect, it } from "vitest";

import { resolveLocaleRoute } from "./routing";

describe("resolveLocaleRoute", () => {
  it("sirve las rutas que ya llevan idioma", () => {
    expect(resolveLocaleRoute("/es", "en")).toEqual({ action: "serve", locale: "es" });
    expect(resolveLocaleRoute("/pt-BR/shop", "en")).toEqual({ action: "serve", locale: "pt-BR" });
  });

  it("redirige /pt de la web original a /pt-BR con 301 (F-07)", () => {
    expect(resolveLocaleRoute("/pt/shop/detail", "en")).toEqual({
      action: "redirect",
      status: 301,
      pathname: "/pt-BR/shop/detail",
    });
  });

  it("normaliza mayúsculas con 301", () => {
    expect(resolveLocaleRoute("/DE", "en")).toEqual({
      action: "redirect",
      status: 301,
      pathname: "/de",
    });
  });

  it("añade el idioma preferido con 307 cuando no hay idioma", () => {
    expect(resolveLocaleRoute("/", "tr")).toEqual({
      action: "redirect",
      status: 307,
      pathname: "/tr",
    });
    expect(resolveLocaleRoute("/rankings", "fr")).toEqual({
      action: "redirect",
      status: 307,
      pathname: "/fr/rankings",
    });
  });
});
