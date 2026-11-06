/**
 * Variables de entorno validadas.
 *
 * Se validan con Zod al arrancar para que un error de configuración falle
 * pronto y con un mensaje claro, en lugar de aparecer como un error raro en
 * mitad de una petición. Nunca se exponen al navegador.
 *
 * @see RNF-06 Seguridad (secretos fuera del repositorio)
 */
import "server-only";

import { z } from "zod";

const envSchema = z.object({
  /** Cadena de conexión MySQL, p. ej. `mysql://user:pass@localhost:3306/florensia`. */
  DATABASE_URL: z.url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /**
   * Secreto con el que Better Auth firma las cookies de sesión (HMAC).
   * Al menos 32 caracteres aleatorios: `openssl rand -base64 32`.
   */
  BETTER_AUTH_SECRET: z.string().min(32),
  /**
   * Servidor SMTP para los correos de verificación y recuperación, p. ej.
   * `smtp://localhost:1025` (Mailpit en local). Sin él, los correos se
   * escriben en el registro del servidor: solo sirve en desarrollo.
   */
  SMTP_URL: z.url().optional(),
  /** Remitente de los correos. */
  MAIL_FROM: z.string().default("Florensia <no-reply@florensia.local>"),
  /**
   * Comprobar las contraseñas contra las filtradas (Have I Been Pwned).
   * `off` solo para entornos sin salida a Internet.
   */
  PWNED_CHECK: z.enum(["on", "off"]).default("on"),
});

/** Configuración validada del servidor. */
export const env = envSchema.parse(process.env);
