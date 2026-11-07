import { describe, expect, it } from "vitest";

import { isPublic, parsePost, parseTranslation, parseUtcLocal, toUtcLocal } from "./post-rules";

const NOW = new Date("2026-11-07T12:00:00Z");
const base = {
  slug: "festival-invierno",
  category: "event",
  status: "draft",
  publishedAt: "",
  expiresAt: "",
};

describe("fechas del formulario en UTC", () => {
  it("lee y escribe datetime-local en UTC", () => {
    expect(parseUtcLocal("2026-12-01T18:30")).toEqual(new Date("2026-12-01T18:30:00Z"));
    expect(parseUtcLocal("")).toBeNull();
    expect(parseUtcLocal("2026-02-31T10:00")).toBeUndefined();
    expect(parseUtcLocal("mañana")).toBeUndefined();
    expect(toUtcLocal(new Date("2026-12-01T18:30:45Z"))).toBe("2026-12-01T18:30");
    expect(toUtcLocal(null)).toBe("");
  });
});

describe("parsePost", () => {
  it("un borrador no necesita fecha y el slug se normaliza", () => {
    expect(parsePost({ ...base, slug: " Festival-Invierno " }, NOW)).toEqual({
      ok: true,
      value: {
        slug: "festival-invierno",
        category: "event",
        status: "draft",
        publishedAt: null,
        expiresAt: null,
      },
    });
  });

  it("publicada sin fecha es ahora; con fecha futura, no (para eso está programada)", () => {
    const now = parsePost({ ...base, status: "published" }, NOW);
    expect(now.ok && now.value.publishedAt).toEqual(NOW);
    expect(
      parsePost({ ...base, status: "published", publishedAt: "2026-11-08T10:00" }, NOW),
    ).toEqual({
      ok: false,
      problems: { publishedAt: "publishedFuture" },
    });
  });

  it("programada exige una fecha futura", () => {
    expect(parsePost({ ...base, status: "scheduled" }, NOW)).toMatchObject({
      problems: { publishedAt: "scheduledPast" },
    });
    expect(
      parsePost({ ...base, status: "scheduled", publishedAt: "2026-11-01T10:00" }, NOW),
    ).toMatchObject({
      problems: { publishedAt: "scheduledPast" },
    });
    expect(
      parsePost({ ...base, status: "scheduled", publishedAt: "2026-11-20T10:00" }, NOW).ok,
    ).toBe(true);
  });

  it("el fin del evento va después de la publicación", () => {
    expect(
      parsePost(
        {
          ...base,
          status: "scheduled",
          publishedAt: "2026-11-20T10:00",
          expiresAt: "2026-11-20T09:00",
        },
        NOW,
      ),
    ).toMatchObject({ problems: { expiresAt: "expiresBeforePublish" } });
  });

  it("rechaza slug, categoría, estado y fechas no válidos", () => {
    expect(
      parsePost(
        { slug: "Hola mundo!", category: "news", status: "live", publishedAt: "x", expiresAt: "y" },
        NOW,
      ),
    ).toEqual({
      ok: false,
      problems: {
        slug: "slug",
        category: "category",
        status: "status",
        publishedAt: "date",
        expiresAt: "date",
      },
    });
    expect(parsePost({ ...base, slug: "a-" }, NOW).ok).toBe(false);
    expect(parsePost({ ...base, slug: "ab" }, NOW).ok).toBe(false);
  });
});

describe("parseTranslation", () => {
  const ok = {
    title: " Título ",
    excerpt: "Resumen",
    body: "Línea 1\r\n\r\nLínea 2 ",
    seoTitle: "",
    seoDescription: "",
  };
  it("recorta, conserva los saltos del cuerpo y deja el SEO opcional en null", () => {
    expect(parseTranslation(ok)).toEqual({
      ok: true,
      value: {
        title: "Título",
        excerpt: "Resumen",
        body: "Línea 1\n\nLínea 2",
        seoTitle: null,
        seoDescription: null,
      },
    });
  });
  it("exige título, entradilla y cuerpo, y limita la longitud", () => {
    expect(parseTranslation({ ...ok, title: " ", body: "", seoTitle: "x".repeat(71) })).toEqual({
      ok: false,
      problems: { title: "required", body: "required", seoTitle: "tooLong" },
    });
  });
});

it("isPublic sigue la regla de la web pública", () => {
  expect(isPublic({ status: "draft", publishedAt: new Date("2026-01-01") }, NOW)).toBe(false);
  expect(isPublic({ status: "scheduled", publishedAt: new Date("2026-12-01") }, NOW)).toBe(false);
  expect(isPublic({ status: "scheduled", publishedAt: new Date("2026-11-01") }, NOW)).toBe(true);
  expect(isPublic({ status: "published", publishedAt: NOW }, NOW)).toBe(true);
});
