/**
 * Sesión obligatoria en las páginas de «Mi cuenta».
 *
 * Sin sesión, lleva a iniciar sesión y vuelve a la misma página después
 * (`?next=`, que `safeNext` limita a rutas internas).
 */
import "server-only";

import { redirect } from "next/navigation";

import type { Locale } from "@/config/locales";
import { getSession } from "@/lib/auth/session";

export type AccountSection =
  "" | "purchases" | "topups" | "characters" | "redeem" | "security" | "privacy";

/** Ruta de una sección de la cuenta: `/es/account`, `/es/account/purchases`… */
export const accountPath = (locale: Locale, section: AccountSection) =>
  `/${locale}/account${section ? `/${section}` : ""}`;

/** Sesión actual con el id de usuario como número; si no hay, redirige. */
export async function requireSession(locale: Locale, section: AccountSection) {
  const session = await getSession();
  if (!session) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(accountPath(locale, section))}`);
  }
  return { ...session, userId: Number(session.user.id) };
}

/** Número de página de `?page=`: entero de 1 en adelante; si no, 1. */
export function parsePage(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^[1-9]\d{0,5}$/.test(value)) return 1;
  return Number(value);
}
