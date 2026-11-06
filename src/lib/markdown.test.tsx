import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { isSafeHref, Markdown, parseMarkdown } from "./markdown";

const html = (source: string) =>
  renderToStaticMarkup(<Markdown source={source} externalLabel="(external)" />);

describe("parseMarkdown", () => {
  it("separa párrafos, títulos, listas y citas", () => {
    expect(parseMarkdown("Uno\ndos\n\n## Título\n- a\n- b\n\n1. x\n> cita")).toEqual([
      { type: "paragraph", text: "Uno dos" },
      { type: "heading", level: 2, text: "Título" },
      { type: "list", ordered: false, items: ["a", "b"] },
      { type: "list", ordered: true, items: ["x"] },
      { type: "quote", text: "cita" },
    ]);
  });

  it("baja `#` a h2 y `####` a h3: el h1 es el título de la noticia", () => {
    expect(parseMarkdown("# A\n#### B")).toEqual([
      { type: "heading", level: 2, text: "A" },
      { type: "heading", level: 3, text: "B" },
    ]);
  });
});

describe("Markdown", () => {
  it("aplica negrita, cursiva, código y enlaces", () => {
    expect(html("**n** *c* `x` [ir](/es/shop)")).toBe(
      '<p><strong>n</strong> <em>c</em> <code>x</code> <a href="/es/shop">ir</a></p>',
    );
  });

  it("marca los enlaces externos para lectores de pantalla", () => {
    expect(html("[Discord](https://discord.gg/x)")).toBe(
      '<p><a href="https://discord.gg/x" rel="noopener noreferrer">Discord<span class="sr-only"> (external)</span></a></p>',
    );
  });

  it("nunca interpreta HTML: se muestra como texto", () => {
    const out = html('<script>alert(1)</script> <img src=x onerror="alert(1)">');
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script&gt;");
  });

  it("descarta destinos peligrosos y deja solo el texto", () => {
    expect(html("[clic](javascript:alert(1))")).not.toContain("href");
    expect(html("[clic](//evil.example)")).not.toContain("href");
  });
});

describe("isSafeHref", () => {
  it.each([
    ["/es/news", true],
    ["#top", true],
    ["https://flandria.wiki", true],
    ["mailto:support@example.com", true],
    ["javascript:alert(1)", false],
    ["data:text/html,x", false],
    ["//evil.example", false],
  ])("%s → %s", (href, expected) => {
    expect(isSafeHref(href)).toBe(expected);
  });
});
