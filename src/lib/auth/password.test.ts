// @vitest-environment node
import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const env = vi.hoisted(() => ({ PWNED_CHECK: "on" as "on" | "off" }));
vi.mock("@/lib/env", () => ({ env }));

const { hashPassword, isPwnedPassword, verifyPassword } = await import("./password");

afterEach(() => {
  vi.unstubAllGlobals();
  env.PWNED_CHECK = "on";
});

describe("hash de contraseñas (Argon2id)", () => {
  it("genera un hash Argon2id con sal y lo verifica", async () => {
    const a = await hashPassword("una frase bastante larga");
    const b = await hashPassword("una frase bastante larga");
    expect(a).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(a).not.toBe(b);
    expect(await verifyPassword({ hash: a, password: "una frase bastante larga" })).toBe(true);
    expect(await verifyPassword({ hash: a, password: "otra frase cualquiera" })).toBe(false);
  });

  it("un hash con otro formato no valida (no lanza)", async () => {
    expect(await verifyPassword({ hash: "!disabled", password: "x" })).toBe(false);
  });
});

describe("isPwnedPassword (k-anonimato)", () => {
  const sha1 = createHash("sha1").update("password123").digest("hex").toUpperCase();

  it("envía solo los 5 primeros caracteres del SHA-1 y detecta la coincidencia", async () => {
    const fetchMock = vi.fn(
      async () => new Response(`0000000000000000000000000000000000A:0\r\n${sha1.slice(5)}:42\r\n`),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await isPwnedPassword("password123")).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.pwnedpasswords.com/range/${sha1.slice(0, 5)}`,
      expect.anything(),
    );
  });

  it("ignora las líneas de relleno con recuento 0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(`${sha1.slice(5)}:0\n`)),
    );
    expect(await isPwnedPassword("password123")).toBe(false);
  });

  it("sin red no bloquea el registro: devuelve null", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    );
    expect(await isPwnedPassword("password123")).toBeNull();
  });

  it("con PWNED_CHECK=off no consulta nada", async () => {
    env.PWNED_CHECK = "off";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await isPwnedPassword("password123")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
