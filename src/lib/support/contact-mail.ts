/**
 * Correo que recibe el equipo de soporte desde el formulario de contacto
 * (RF-10).
 *
 * Va en inglés, el idioma de respaldo del sitio, sea cual sea el idioma del
 * jugador: lo lee el equipo, no el jugador. El idioma de la página se
 * indica para que el equipo sepa en cuál responder.
 *
 * `Reply-To` es el correo del jugador: el equipo responde desde su buzón
 * con «Responder», sin copiar direcciones. El remitente sigue siendo el de
 * la web (`MAIL_FROM`), porque enviar «en nombre» del jugador lo marcarían
 * como suplantación (SPF/DMARC).
 *
 * Todo lo escrito por el jugador se escapa en el HTML.
 */
import "server-only";

import { LOCALE_NAMES, type Locale } from "@/config/locales";
import { escapeHtml } from "@/lib/mail/templates";
import type { MailMessage } from "@/lib/mail/send";

import type { ContactCategory, ContactInput } from "./contact-rules";

const CATEGORY_LABELS: Record<ContactCategory, string> = {
  account: "Account",
  payment: "Payments and AP",
  migration: "Character migration",
  bug: "Bug",
  report: "Player report",
  other: "Other",
};

export interface ContactMeta {
  to: string;
  locale: Locale;
  /** Cuenta con la sesión iniciada al enviar, si la hay. */
  account?: { username: string; id: string } | null;
  sentAt: Date;
}

/** Arma el correo para el buzón de soporte. */
export function contactMessage(input: ContactInput, meta: ContactMeta): MailMessage {
  const category = CATEGORY_LABELS[input.category];
  const rows: [string, string][] = [
    ["From", `${input.name} <${input.email}>`],
    ["Category", category],
    ["Page language", `${LOCALE_NAMES[meta.locale]} (${meta.locale})`],
    [
      "Account",
      meta.account ? `${meta.account.username} (id ${meta.account.id})` : "Not signed in",
    ],
    ["Sent", `${meta.sentAt.toISOString().slice(0, 16).replace("T", " ")} UTC`],
  ];

  const text = `${rows.map(([key, value]) => `${key}: ${value}`).join("\n")}

${input.subject}

${input.message}
`;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1b1b1f;line-height:1.5">
<table style="border-collapse:collapse">${rows
    .map(
      ([key, value]) =>
        `<tr><th style="text-align:left;padding:2px 12px 2px 0">${key}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("")}</table>
<h1 style="font-size:18px">${escapeHtml(input.subject)}</h1>
<p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>
</body></html>`;

  return {
    to: meta.to,
    replyTo: input.email,
    subject: `[Support · ${category}] ${input.subject}`,
    text,
    html,
  };
}
