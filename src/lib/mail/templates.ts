/**
 * Plantillas de los correos de cuenta, en el idioma del jugador (RNF-04).
 *
 * Cada correo va en texto y en HTML sencillo, con un solo enlace y el
 * aviso de caducidad. El HTML se construye escapando todo lo que viene del
 * usuario (el nombre de cuenta): un nombre como `<img onerror>` se ve como
 * texto.
 */
import "server-only";

import type { Locale } from "@/config/locales";
import { catalogLoaders } from "@/i18n/catalog";
import { createTranslator, type Translate } from "@/i18n/translator";

import type { MailMessage } from "./send";

/** Escapa los caracteres con significado en HTML. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

async function translatorFor(locale: Locale): Promise<Translate> {
  return createTranslator(locale, await catalogLoaders[locale]());
}

/** Correo de un párrafo de saludo, un texto, un botón y una nota final. */
function layout(parts: {
  to: string;
  subject: string;
  greeting: string;
  body: string;
  action: string;
  url: string;
  note: string;
}): MailMessage {
  const text = `${parts.greeting}\n\n${parts.body}\n\n${parts.url}\n\n${parts.note}\n\n— Florensia`;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1b1b1f;line-height:1.5">
<p>${escapeHtml(parts.greeting)}</p>
<p>${escapeHtml(parts.body)}</p>
<p><a href="${escapeHtml(parts.url)}" style="display:inline-block;background:#164a7a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(parts.action)}</a></p>
<p style="font-size:13px;color:#4a4a55">${escapeHtml(parts.note)}</p>
<p>— Florensia</p>
</body></html>`;
  return { to: parts.to, subject: parts.subject, text, html };
}

interface Recipient {
  email: string;
  name: string;
  locale: Locale;
}

/** «Confirma tu correo» (al registrarse o al pedirlo de nuevo). */
export async function verifyEmailMessage(user: Recipient, url: string): Promise<MailMessage> {
  const t = await translatorFor(user.locale);
  return layout({
    to: user.email,
    subject: t("email.verify.subject"),
    greeting: t("email.greeting", { name: user.name }),
    body: t("email.verify.body"),
    action: t("email.verify.action"),
    url,
    note: t("email.verify.note"),
  });
}

/** «Restablece tu contraseña». */
export async function resetPasswordMessage(user: Recipient, url: string): Promise<MailMessage> {
  const t = await translatorFor(user.locale);
  return layout({
    to: user.email,
    subject: t("email.reset.subject"),
    greeting: t("email.greeting", { name: user.name }),
    body: t("email.reset.body"),
    action: t("email.reset.action"),
    url,
    note: t("email.reset.note"),
  });
}

/**
 * Aviso a quien ya tiene cuenta cuando alguien intenta registrarse con su
 * correo. La web responde igual que a un registro nuevo (no revela que el
 * correo existe) y el dueño del correo se entera por aquí.
 */
export async function existingAccountMessage(user: Recipient, url: string): Promise<MailMessage> {
  const t = await translatorFor(user.locale);
  return layout({
    to: user.email,
    subject: t("email.existing.subject"),
    greeting: t("email.greeting", { name: user.name }),
    body: t("email.existing.body"),
    action: t("email.existing.action"),
    url,
    note: t("email.existing.note"),
  });
}
