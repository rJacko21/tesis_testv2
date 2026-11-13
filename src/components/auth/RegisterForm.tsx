/**
 * Formulario de registro (RF-03): el mismo en `/register` y en la landing
 * «Jugar ahora», con las mismas reglas.
 *
 * - Nombre de cuenta de 4 a 16 caracteres y contraseña de 10 a 128 no
 *   filtrada.
 * - Aceptación explícita de términos y privacidad, que se abren en otra
 *   pestaña para no perder lo escrito.
 * - Trampa para bots sin fricción para las personas (sin CAPTCHA).
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { AuthForm } from "@/components/auth/AuthForm";
import { marker, withElements } from "@/components/auth/AuthPage";
import type { Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";
import { signUpAction } from "@/lib/auth/actions";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth/password";
import { USERNAME_MAX, USERNAME_MIN, USERNAME_PATTERN } from "@/lib/auth/username";

const LINK = "text-link font-bold underline";

export interface RegisterFormProps {
  locale: Locale;
  t: Translate;
  /** Qué ofrecer tras registrarse: iniciar sesión, descargar el juego… */
  successExtra: ReactNode;
  /** Prefijo de los ids, si hay más de un formulario de cuenta en la página. */
  idPrefix?: string;
}

export function RegisterForm({ locale, t, successExtra, idPrefix }: RegisterFormProps) {
  const accept = withElements(t("auth.register.accept", { terms: marker(0), privacy: marker(1) }), {
    terms: (
      <Link href={`/${locale}/terms`} className={LINK} target="_blank">
        {t("auth.register.termsLink")}
      </Link>
    ),
    privacy: (
      <Link href={`/${locale}/privacy`} className={LINK} target="_blank">
        {t("auth.register.privacyLink")}
      </Link>
    ),
  });

  return (
    <AuthForm
      action={signUpAction}
      hidden={{ locale }}
      honeypot
      submitLabel={t("auth.register.submit")}
      successExtra={successExtra}
      idPrefix={idPrefix}
      fields={[
        {
          name: "username",
          label: t("auth.fields.username"),
          type: "text",
          autoComplete: "username",
          hint: t("auth.fields.usernameHint", { min: USERNAME_MIN, max: USERNAME_MAX }),
          required: true,
          minLength: USERNAME_MIN,
          maxLength: USERNAME_MAX,
          pattern: USERNAME_PATTERN,
        },
        {
          name: "email",
          label: t("auth.fields.email"),
          type: "email",
          autoComplete: "email",
          required: true,
          maxLength: 254,
        },
        {
          name: "password",
          label: t("auth.fields.password"),
          type: "password",
          autoComplete: "new-password",
          hint: t("auth.fields.passwordHint", { min: PASSWORD_MIN }),
          required: true,
          minLength: PASSWORD_MIN,
          maxLength: PASSWORD_MAX,
        },
        {
          name: "passwordConfirm",
          label: t("auth.fields.passwordConfirm"),
          type: "password",
          autoComplete: "new-password",
          required: true,
          minLength: PASSWORD_MIN,
          maxLength: PASSWORD_MAX,
        },
        { name: "terms", label: accept, type: "checkbox", required: true },
      ]}
    />
  );
}
