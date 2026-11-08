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

describe("URLs de la web original (RNF-05)", () => {
  it.each([
    ["/en/post", "/en/news"],
    ["/es/post/halloween-2026", "/es/news/halloween-2026"],
    ["/pt/post/halloween-2026", "/pt-BR/news/halloween-2026"],
    ["/de/lp/style1/PlayNow", "/de/play-now"],
    ["/es/register", "/es/play-now"],
    ["/en/shop/detail/index/412", "/en/shop/item/412"],
    ["/en/rankings/global/all", "/en/rankings"],
    ["/en/rankings/global/sea/Sniper", "/en/rankings?area=sea&class=sniper"],
    ["/pt/rankings/global/land/court%20magician", "/pt-BR/rankings?area=land&class=court-magician"],
    ["/de/rankings/global/all/unknown", "/de/rankings"],
  ])("%s → 301 a %s, en un solo salto", (from, to) => {
    expect(resolveLocaleRoute(from, "en")).toEqual({
      action: "redirect",
      status: 301,
      pathname: to,
    });
  });

  it("no confunde rutas nuevas que empiezan igual", () => {
    expect(resolveLocaleRoute("/es/postal", "en")).toEqual({ action: "serve", locale: "es" });
    expect(resolveLocaleRoute("/es/news/post", "en")).toEqual({ action: "serve", locale: "es" });
    expect(resolveLocaleRoute("/es/rankings", "en")).toEqual({ action: "serve", locale: "es" });
  });
});
