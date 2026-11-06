import { describe, expect, it } from "vitest";

import { LOCALES } from "../../config/locales";
import { POST_CATEGORIES } from "../schema/content";

import { buildDemoPosts, buildPostText, DEMO_POST_COUNT } from "./news";

describe("noticias de demo", () => {
  const posts = buildDemoPosts();

  it("es determinista", () => {
    expect(buildDemoPosts()).toEqual(posts);
  });

  it("cubre las cinco categorías y tiene slugs únicos", () => {
    expect(posts).toHaveLength(DEMO_POST_COUNT);
    expect(new Set(posts.map((p) => p.category))).toEqual(new Set(POST_CATEGORIES));
    expect(new Set(posts.map((p) => p.slug)).size).toBe(posts.length);
  });

  it("siempre tiene versión inglesa, la de respaldo", () => {
    for (const post of posts) expect(post.translations.en).toBeDefined();
  });

  it("incluye noticias sin traducir para probar el aviso", () => {
    const partial = posts.filter((p) => Object.keys(p.translations).length < LOCALES.length);
    expect(partial.length).toBeGreaterThan(0);
  });

  it("incluye un evento terminado, una programada y un borrador", () => {
    expect(posts.some((p) => p.expiresInDays !== null && p.expiresInDays < 0)).toBe(true);
    expect(posts.filter((p) => p.status === "scheduled")).toHaveLength(1);
    expect(posts.filter((p) => p.status === "draft")).toHaveLength(1);
  });

  it("los enlaces internos del cuerpo llevan el idioma", () => {
    expect(buildPostText("shop", "es", 1).body).toContain("](/es/shop)");
    expect(buildPostText("announcement", "de", 1).body).toContain("](https://discord.gg/");
  });
});
