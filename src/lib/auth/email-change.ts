/**
 * Avisos al terminar un cambio de correo (RF-04).
 *
 * Al pedir el cambio ya se avisa al correo actual (`changeEmailAction`). Al
 * abrir el enlace de confirmación, el correo de la cuenta cambia y se avisa a
 * los dos: al anterior, por si no fue el dueño, y al nuevo, como confirmación.
 *
 * Los datos del cambio vienen del propio token (un JWT de Better Auth con
 * `email`, `updateTo` y `requestType`). Solo se lee **después** de que Better
 * Auth haya comprobado su firma al verificarlo.
 */
import "server-only";

import { eq } from "drizzle-orm";

import { isLocale, type Locale } from "@/config/locales";
import { SITE_URL } from "@/config/site";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { sendMail } from "@/lib/mail/send";
import { emailChangedMessage } from "@/lib/mail/templates";

interface TokenPayload {
  email?: unknown;
  updateTo?: unknown;
  requestType?: unknown;
}

function payload(token: string): TokenPayload | null {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString());
  } catch {
    return null;
  }
}

/** ¿Es el token del enlace que confirma un correo nuevo? Solo elige la plantilla. */
export function isEmailChangeToken(token: string): boolean {
  return payload(token)?.requestType === "change-email-verification";
}

/** Correo anterior y nuevo de un token de cambio de correo, o `null`. */
export function emailChangeOf(token: string): { previous: string; current: string } | null {
  const data = payload(token);
  if (data?.requestType !== "change-email-verification") return null;
  if (typeof data.email !== "string" || typeof data.updateTo !== "string") return null;
  return { previous: data.email, current: data.updateTo };
}

/**
 * Avisa a los dos correos de que el cambio se ha hecho. Un fallo del correo
 * no deshace el cambio: solo se anota.
 */
export async function notifyEmailChanged(token: string): Promise<void> {
  const change = emailChangeOf(token);
  if (!change) return;
  try {
    const [user] = await db
      .select({ name: users.displayUsername, username: users.username, locale: users.locale })
      .from(users)
      .where(eq(users.email, change.current));
    if (!user) return;
    const locale: Locale = user.locale && isLocale(user.locale) ? user.locale : "en";
    const to = { email: change.current, name: user.name ?? user.username ?? "", locale };
    await Promise.all([
      sendMail(
        await emailChangedMessage(to, "previous", change, `${SITE_URL}/${locale}/support/contact`),
      ),
      sendMail(
        await emailChangedMessage(to, "current", change, `${SITE_URL}/${locale}/account/security`),
      ),
    ]);
  } catch (error) {
    console.error("[auth] No se pudo avisar del cambio de correo:", error);
  }
}
