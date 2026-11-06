/**
 * Política y hash de contraseñas (RF-03, OWASP ASVS V2).
 *
 * - **Longitud:** de 10 a 128 caracteres, sin reglas de composición
 *   («una mayúscula y un número»), que según NIST SP 800-63B empujan a
 *   contraseñas previsibles. Se admite cualquier carácter, incluidos espacios.
 * - **Filtradas:** se rechazan las que aparecen en Have I Been Pwned. La
 *   consulta usa k-anonimato: solo se envían los 5 primeros caracteres del
 *   SHA-1, nunca la contraseña ni su hash completo.
 * - **Hash Argon2id** con los parámetros mínimos de OWASP (19 MiB, 2
 *   iteraciones, 1 hilo). Es el algoritmo que pide ADR-05; Better Auth usa
 *   scrypt por defecto y se le pasa este.
 */
import "server-only";

import { createHash } from "node:crypto";

import { hash, verify } from "@node-rs/argon2";

import { env } from "@/lib/env";

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

// `Algorithm.Argon2id` es un enum constante; su valor es 2.
const ARGON2ID = 2;
const ARGON2_OPTIONS = { algorithm: ARGON2ID, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

/** Hash Argon2id con sal aleatoria, en formato PHC (`$argon2id$v=19$…`). */
export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/** Comprueba una contraseña contra su hash. Un hash con otro formato da `false`. */
export async function verifyPassword(data: { hash: string; password: string }): Promise<boolean> {
  try {
    return await verify(data.hash, data.password);
  } catch {
    return false;
  }
}

/**
 * Indica si la contraseña aparece en filtraciones conocidas.
 *
 * @returns `true` si está filtrada, `false` si no, y `null` si no se pudo
 *   comprobar (sin red o servicio caído). En ese caso se deja pasar: no se
 *   impide registrarse por un servicio externo, y el resto de defensas
 *   (longitud, límite de intentos) siguen activas.
 */
export async function isPwnedPassword(password: string): Promise<boolean | null> {
  if (env.PWNED_CHECK === "off") return null;
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      // Relleno: todas las respuestas pesan parecido y no delatan el prefijo.
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return null;
    const body = await response.text();
    return body.split("\n").some((line) => {
      const [hashSuffix, count] = line.trim().split(":");
      return hashSuffix === suffix && Number(count) > 0;
    });
  } catch (error) {
    console.warn("[auth] No se pudo consultar Have I Been Pwned:", error);
    return null;
  }
}
