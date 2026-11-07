/**
 * Sesión del usuario en Server Components.
 *
 * Leer la sesión hace la página dinámica (depende de la cookie), así que
 * solo se usa en páginas de cuenta, marcadas como `instant = false`.
 *
 * La cookie se toma de `cookies()` y no de la cabecera `Cookie` de la
 * petición: cuando una Server Action cambia la sesión (cambiar la
 * contraseña crea una sesión nueva y cierra las demás), la página se vuelve
 * a pintar en la misma petición, y solo `cookies()` tiene ya la cookie nueva.
 */
import "server-only";

import { cookies, headers } from "next/headers";

import { auth } from "./auth";

/** Sesión actual o `null` si no hay ninguna válida. */
export async function getSession() {
  const [requestHeaders, jar] = await Promise.all([headers(), cookies()]);
  const current = new Headers(requestHeaders);
  current.set("cookie", jar.toString());
  return auth.api.getSession({ headers: current });
}
