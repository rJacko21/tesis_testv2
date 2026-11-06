import { describe, expect, it } from "vitest";

import { languageAlternates } from "./site";

describe("languageAlternates", () => {
  it("genera una URL por idioma más x-default (F-09)", () => {
    const alternates = languageAlternates("/rankings");
    expect(Object.keys(alternates)).toHaveLength(8);
    expect(alternates["pt-BR"]).toBe("/pt-BR/rankings");
    expect(alternates["x-default"]).toBe("/en/rankings");
  });
});
