/**
 * Envío de correos (verificación y recuperación de contraseña, RF-03).
 *
 * Con `SMTP_URL` se envía por SMTP: en local, a Mailpit (docker-compose), que
 * los recoge sin enviarlos a nadie. Sin `SMTP_URL`, el correo se escribe en
 * el registro del servidor, para poder desarrollar sin configurar nada.
 */
import "server-only";

import { createTransport, type Transporter } from "nodemailer";

import { env } from "@/lib/env";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let transporter: Transporter | undefined;

/** Envía un correo. Lanza un error si el servidor SMTP lo rechaza. */
export async function sendMail(message: MailMessage): Promise<void> {
  if (!env.SMTP_URL) {
    console.warn(
      `[correo] Sin SMTP_URL, no se envía. Para ${message.to}: ${message.subject}\n${message.text}`,
    );
    return;
  }
  transporter ??= createTransport(env.SMTP_URL);
  await transporter.sendMail({ from: env.MAIL_FROM, ...message });
}
