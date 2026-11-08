"use server";
/**
 * Envío del formulario de contacto con soporte (RF-10).
 *
 * El mensaje se manda por correo al buzón de soporte (`SUPPORT_EMAIL`) con
 * `Reply-To` del jugador. No se guarda en la base de datos: los tickets con
 * historial son una ampliación (tabla `support_tickets`, que pide cuenta).
 *
 * Contra el abuso:
 * - Trampa para bots (campo `website` oculto): si viene relleno se responde
 *   «enviado» sin enviar nada, para que el bot no aprenda.
 * - Límite por IP: 5 mensajes por hora.
 * - No se manda copia al jugador: un formulario que envía correos a la
 *   dirección que escriba cualquiera serviría para mandar spam.
 *
 * @see RF-10 · M-39
 */
import { headers } from "next/headers";

import { formLocale, limited, text } from "@/lib/auth/action-helpers";
import { auth } from "@/lib/auth/auth";
import type { FormState } from "@/lib/auth/form-state";
import { clientIp } from "@/lib/auth/request";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mail/send";

import { contactMessage } from "./contact-mail";
import { CONTACT_LIMITS, parseContact } from "./contact-rules";

const FIELDS = ["name", "email", "category", "subject", "message"] as const;

export async function contactSupportAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { locale, t } = await formLocale(form);
  const values = Object.fromEntries(FIELDS.map((name) => [name, text(form, name)]));
  const sent = (email: string): FormState => ({
    status: "success",
    message: t("support.contact.sent", { email }),
  });

  if (text(form, "website") !== "") return sent(values.email ?? "");

  const result = parseContact(values);
  if (!result.ok) {
    const L = CONTACT_LIMITS;
    const messages = {
      required: t("support.contact.errors.required"),
      email: t("auth.errors.email"),
      category: t("support.contact.errors.category"),
    };
    const lengths = {
      name: t("support.contact.errors.nameLength", { max: L.nameMax }),
      email: t("auth.errors.email"),
      category: messages.category,
      subject: t("support.contact.errors.subjectLength", { min: L.subjectMin, max: L.subjectMax }),
      message: t("support.contact.errors.messageLength", { min: L.messageMin, max: L.messageMax }),
    };
    const fields = Object.fromEntries(
      Object.entries(result.problems).map(([name, problem]) => [
        name,
        problem === "length" ? lengths[name as keyof typeof lengths] : messages[problem],
      ]),
    );
    return { status: "error", message: t("auth.errorSummary"), fields, values };
  }

  const blocked = await limited(`contact:ip:${await clientIp()}`, 60 * 60, 5, t);
  if (blocked) return { ...blocked, values };

  // Si hay sesión, el equipo ve la cuenta sin tener que preguntarla.
  const session = await auth.api.getSession({ headers: await headers() });
  const account = session
    ? { id: session.user.id, username: session.user.username ?? session.user.name }
    : null;

  try {
    await sendMail(
      contactMessage(result.input, { to: env.SUPPORT_EMAIL, locale, account, sentAt: new Date() }),
    );
  } catch (error) {
    console.error("[soporte] No se pudo enviar el mensaje de contacto:", error);
    return { status: "error", message: t("support.contact.errors.send"), values };
  }
  return sent(result.input.email);
}
