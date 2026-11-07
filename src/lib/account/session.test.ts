import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn() }));

const { accountPath, parsePage } = await import("./session");

describe("parsePage", () => {
  it("acepta enteros positivos", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("42")).toBe(42);
  });

  it("devuelve 1 con valores que no son una página", () => {
    for (const value of [undefined, "", "0", "-3", "2.5", "abc", "1e3", ["2"], "9999999"]) {
      expect(parsePage(value)).toBe(1);
    }
  });
});

describe("accountPath", () => {
  it("construye la ruta de cada sección", () => {
    expect(accountPath("es", "")).toBe("/es/account");
    expect(accountPath("pt-BR", "purchases")).toBe("/pt-BR/account/purchases");
  });
});
