import { describe, expect, it } from "vitest";

import { signatureHeader, signBody, verifySignature } from "./signature";

const secret = "x".repeat(32);
const body = JSON.stringify({ transaction: { id: "abc" }, status: "paid" });

describe("firma de los avisos de pago", () => {
  it("acepta la firma correcta del cuerpo exacto", () => {
    expect(verifySignature(body, signatureHeader(body, secret), secret)).toBe(true);
  });

  it("rechaza otro cuerpo, otra clave, otro formato o ninguna firma", () => {
    const header = signatureHeader(body, secret);
    expect(verifySignature(`${body} `, header, secret)).toBe(false);
    expect(verifySignature(body, header, "y".repeat(32))).toBe(false);
    expect(verifySignature(body, signBody(body, secret), secret)).toBe(false);
    expect(verifySignature(body, "Signature abc", secret)).toBe(false);
    expect(verifySignature(body, null, secret)).toBe(false);
  });
});
