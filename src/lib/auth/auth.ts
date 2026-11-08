/**
 * Configuración de Better Auth (ADR-05, RF-03).
 *
 * Better Auth gestiona lo delicado: crear usuarios y credenciales, firmar
 * las cookies de sesión, generar y caducar los tokens de verificación y de
 * recuperación. Esta web añade encima sus propias reglas:
 * - Argon2id en lugar de scrypt (`password.ts`).
 * - Límite de fallos por cuenta e IP (`login-guard.ts`) y de peticiones
 *   (`rate-limit.ts`), que se aplican en las Server Actions.
 * - Correos en el idioma del jugador (`mail/templates.ts`).
 *
 * **No se publica la API HTTP de Better Auth** (`/api/auth/*`): todas las
 * operaciones pasan por Server Actions de la propia web, que validan con
 * Zod, aplican los límites y responden con los textos traducidos. Así hay
 * una sola puerta de entrada que vigilar, y Next.js comprueba el origen de
 * cada Server Action (protección CSRF).
 *
 * @see ADR-05 · RF-03 · OWASP ASVS V2 (autenticación) y V3 (sesiones)
 */
import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";

import { isLocale, type Locale } from "@/config/locales";
import { SITE_URL } from "@/config/site";
import { db } from "@/db/client";
import { accounts, sessions, users, verifications } from "@/db/schema";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mail/send";
import {
  confirmNewEmailMessage,
  existingAccountMessage,
  resetPasswordMessage,
  securityNoticeMessage,
  verifyEmailMessage,
} from "@/lib/mail/templates";

import { COOKIE_PREFIX } from "./constants";
import { isEmailChangeToken } from "./email-change";
import { hashPassword, PASSWORD_MAX, PASSWORD_MIN, verifyPassword } from "./password";
import { USERNAME_MAX, USERNAME_MIN, isValidUsername } from "./username";

/** Caducidad del enlace de recuperación: 30 minutos (RF-03). */
export const RESET_TOKEN_MINUTES = 30;
/** Caducidad del enlace de verificación de correo: 24 horas. */
export const VERIFY_TOKEN_HOURS = 24;

/** Destinatario de un correo a partir del usuario que da Better Auth. */
function recipient(user: { email: string; name: string } & Record<string, unknown>) {
  const locale: Locale =
    typeof user.locale === "string" && isLocale(user.locale) ? user.locale : "en";
  const display = typeof user.displayUsername === "string" ? user.displayUsername : user.name;
  return { email: user.email, name: display, locale };
}

export const auth = betterAuth({
  appName: "Florensia",
  baseURL: SITE_URL,
  secret: env.BETTER_AUTH_SECRET,
  telemetry: { enabled: false },

  database: drizzleAdapter(db, {
    provider: "mysql",
    schema: { users, sessions, accounts, verifications },
  }),
  user: {
    modelName: "users",
    additionalFields: {
      // Idioma de los correos. Lo fija la Server Action con el de la página.
      locale: { type: "string", required: false, defaultValue: "en", input: true },
      // Estado de la cuenta (RF-12): lo cambia el panel, nunca el usuario.
      status: { type: "string", required: false, defaultValue: "active", input: false },
    },
    // Cambiar el correo (RF-04): el enlace va al correo nuevo y la cuenta no
    // cambia hasta abrirlo. La Server Action pide antes la contraseña actual.
    changeEmail: { enabled: true },
  },
  session: {
    modelName: "sessions",
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24, // se renueva como mucho una vez al día
  },
  account: { modelName: "accounts" },
  verification: {
    modelName: "verifications",
    // Solo el hash del token en la base: quien lea la tabla no puede usar los enlaces.
    storeIdentifier: "hashed",
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN,
    maxPasswordLength: PASSWORD_MAX,
    password: { hash: hashPassword, verify: verifyPassword },
    // Se puede entrar sin verificar el correo, pero no comprar (RF-03, RF-05).
    requireEmailVerification: false,
    // Sin inicio de sesión automático: así un registro con un correo ya usado
    // responde igual que uno nuevo y no revela que el correo existe.
    autoSignIn: false,
    async onExistingUserSignUp({ user }) {
      const to = recipient(user);
      await sendMail(await existingAccountMessage(to, `${SITE_URL}/${to.locale}/sign-in`));
    },
    resetPasswordTokenExpiresIn: RESET_TOKEN_MINUTES * 60,
    // Al cambiar la contraseña se cierran todas las sesiones abiertas.
    revokeSessionsOnPasswordReset: true,
    // Aviso al correo de la cuenta, como al cambiarla desde «Mi cuenta».
    async onPasswordReset({ user }) {
      const to = recipient(user);
      const url = `${SITE_URL}/${to.locale}/forgot-password`;
      try {
        await sendMail(await securityNoticeMessage(to, "passwordChanged", url));
      } catch (error) {
        console.error("[auth] No se pudo avisar del cambio de contraseña:", error);
      }
    },
    async sendResetPassword({ user, token }) {
      const to = recipient(user);
      const url = `${SITE_URL}/${to.locale}/reset-password?token=${encodeURIComponent(token)}`;
      await sendMail(await resetPasswordMessage(to, url));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: VERIFY_TOKEN_HOURS * 60 * 60,
    // Al cambiar el correo, `user.email` ya es el correo nuevo.
    async sendVerificationEmail({ user, token }) {
      const to = recipient(user);
      const url = `${SITE_URL}/${to.locale}/verify-email?token=${encodeURIComponent(token)}`;
      const message = isEmailChangeToken(token) ? confirmNewEmailMessage : verifyEmailMessage;
      await sendMail(await message(to, url));
    },
  },

  databaseHooks: {
    session: {
      create: {
        // Una cuenta suspendida o borrada no puede abrir sesión (RF-12).
        async before(session) {
          const { eq } = await import("drizzle-orm");
          const [row] = await db
            .select({ status: users.status })
            .from(users)
            .where(eq(users.id, Number(session.userId)));
          if (row?.status !== "active") return false;
        },
      },
    },
  },

  // Sin API HTTP pública, el limitador interno no interviene: los límites se
  // aplican en las Server Actions con `rate-limit.ts` y `login-guard.ts`.
  rateLimit: { enabled: false },
  advanced: {
    cookiePrefix: COOKIE_PREFIX,
    database: { generateId: "serial" },
  },

  plugins: [
    username({
      minUsernameLength: USERNAME_MIN,
      maxUsernameLength: USERNAME_MAX,
      usernameValidator: isValidUsername,
    }),
    // Debe ir el último: aplica las cookies que fijan las llamadas a `auth.api`
    // dentro de una Server Action.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
