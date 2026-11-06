/**
 * Sesión del usuario en Server Components.
 *
 * Leer la sesión hace la página dinámica (depende de la cookie), así que
 * solo se usa en páginas de cuenta, marcadas como `instant = false`.
 */
import "server-only";

import { headers } from "next/headers";

import { auth } from "./auth";

/** Sesión actual o `null` si no hay ninguna válida. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
