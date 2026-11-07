/**
 * Firma de los avisos de pago (webhooks), como funciones puras.
 *
 * Xsolla firma cada aviso con `Authorization: Signature <sha1(cuerpo + clave)>`.
 * El proveedor simulado (ADR-09) sigue la misma idea con un algoritmo más
 * fuerte: HMAC-SHA256 del cuerpo exacto con una clave secreta, en la
 * cabecera `Authorization: Signature <hex>`.
 *
 * La comparación es en tiempo constante (`timingSafeEqual`), para que no se
 * pueda adivinar la firma midiendo cuánto tarda en fallar.
 *
 * @see RF-06 · ADR-09
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** Firma en hexadecimal del cuerpo exacto del aviso. */
export function signBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

/** Valor de la cabecera `Authorization` para un cuerpo. */
export const signatureHeader = (body: string, secret: string) =>
  `Signature ${signBody(body, secret)}`;

/** Comprueba la cabecera `Authorization` de un aviso. */
export function verifySignature(body: string, header: string | null, secret: string): boolean {
  const match = /^Signature ([0-9a-f]{64})$/.exec(header ?? "");
  if (!match) return false;
  const expected = Buffer.from(signBody(body, secret), "hex");
  const given = Buffer.from(match[1]!, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
