/**
 * Reglas del formulario de contacto con soporte (RF-10).
 *
 * Funciones puras, sin base de datos ni red, para probarlas sin servidor.
 * El servidor vuelve a comprobarlo todo aunque el navegador ya valide
 * (`required`, `maxLength`, `type="email"`).
 *
 * El nombre y el asunto van en las cabeceras del correo, así que se quedan
 * en una sola línea: un salto de línea ahí podría colar cabeceras nuevas.
 *
 * @see RF-10 · M-39
 */
import { z } from "zod";

/** Motivos de contacto, en el orden del desplegable (los de RF-10 y «otro»). */
export const CONTACT_CATEGORIES = [
  "account",
  "payment",
  "migration",
  "bug",
  "report",
  "other",
] as const;
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export const CONTACT_LIMITS = {
  nameMax: 60,
  emailMax: 254,
  subjectMin: 3,
  subjectMax: 120,
  messageMin: 20,
  messageMax: 5000,
} as const;

export interface ContactInput {
  name: string;
  email: string;
  category: ContactCategory;
  subject: string;
  message: string;
}

/** Qué falla en cada campo; el texto lo pone quien llama, en su idioma. */
export type ContactProblem = "required" | "length" | "email" | "category";

export type ContactResult =
  | { ok: true; input: ContactInput }
  | { ok: false; problems: Partial<Record<keyof ContactInput, ContactProblem>> };

/** Una línea: sin saltos ni caracteres de control, espacios seguidos en uno. */
export const oneLine = (value: string) =>
  value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isCategory = (value: string): value is ContactCategory =>
  (CONTACT_CATEGORIES as readonly string[]).includes(value);

/** Limpia y comprueba lo enviado en el formulario. */
export function parseContact(fields: Record<string, string>): ContactResult {
  const name = oneLine(fields.name ?? "");
  const email = (fields.email ?? "").trim().toLowerCase();
  const category = fields.category ?? "";
  const subject = oneLine(fields.subject ?? "");
  // El mensaje conserva sus saltos de línea; se normalizan los de Windows.
  const message = (fields.message ?? "").replace(/\r\n?/g, "\n").trim();
  const L = CONTACT_LIMITS;

  const problems: Partial<Record<keyof ContactInput, ContactProblem>> = {};
  if (!name) problems.name = "required";
  else if (name.length > L.nameMax) problems.name = "length";
  if (!email) problems.email = "required";
  else if (email.length > L.emailMax || !z.email().safeParse(email).success) {
    problems.email = "email";
  }
  if (!isCategory(category)) problems.category = "category";
  if (!subject) problems.subject = "required";
  else if (subject.length < L.subjectMin || subject.length > L.subjectMax) {
    problems.subject = "length";
  }
  if (!message) problems.message = "required";
  else if (message.length < L.messageMin || message.length > L.messageMax) {
    problems.message = "length";
  }

  if (Object.keys(problems).length > 0 || !isCategory(category)) return { ok: false, problems };
  return { ok: true, input: { name, email, category, subject, message } };
}
