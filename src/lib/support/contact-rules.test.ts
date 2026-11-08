import { describe, expect, it } from "vitest";

import { CONTACT_LIMITS, oneLine, parseContact } from "./contact-rules";

const valid = {
  name: "Ana",
  email: "Ana@Example.com ",
  category: "payment",
  subject: "AP not received",
  message: "I bought 500 AP yesterday and they are not in my account.",
};

describe("parseContact", () => {
  it("acepta un mensaje correcto y normaliza el correo", () => {
    const result = parseContact(valid);
    expect(result).toEqual({
      ok: true,
      input: { ...valid, email: "ana@example.com" },
    });
  });

  it("deja el nombre y el asunto en una sola línea (sin cabeceras inyectadas)", () => {
    const result = parseContact({
      ...valid,
      name: "Ana\r\nBcc: victim@example.com",
      subject: "Hi\nX-Header: 1",
    });
    expect(result.ok && result.input.name).toBe("Ana Bcc: victim@example.com");
    expect(result.ok && result.input.subject).toBe("Hi X-Header: 1");
  });

  it("conserva los saltos de línea del mensaje", () => {
    const result = parseContact({ ...valid, message: "Line one is long enough\r\nLine two" });
    expect(result.ok && result.input.message).toBe("Line one is long enough\nLine two");
  });

  it("señala cada campo que falta o no vale", () => {
    expect(parseContact({})).toEqual({
      ok: false,
      problems: {
        name: "required",
        email: "required",
        category: "category",
        subject: "required",
        message: "required",
      },
    });
    expect(
      parseContact({ ...valid, email: "not-an-email", category: "refund", message: "Too short" }),
    ).toEqual({
      ok: false,
      problems: { email: "email", category: "category", message: "length" },
    });
  });

  it("aplica los límites de longitud", () => {
    const L = CONTACT_LIMITS;
    expect(parseContact({ ...valid, name: "a".repeat(L.nameMax + 1) })).toMatchObject({
      problems: { name: "length" },
    });
    expect(parseContact({ ...valid, subject: "ab" })).toMatchObject({
      problems: { subject: "length" },
    });
    expect(parseContact({ ...valid, message: "x".repeat(L.messageMax + 1) })).toMatchObject({
      problems: { message: "length" },
    });
    expect(parseContact({ ...valid, message: "x".repeat(L.messageMax) }).ok).toBe(true);
  });
});

describe("oneLine", () => {
  it("quita caracteres de control y junta espacios", () => {
    expect(oneLine("  a\t\u0000b \u007f c  ")).toBe("a b c");
  });
});
