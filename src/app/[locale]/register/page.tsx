/**
 * Registro (RF-03).
 *
 * En la web original el registro estaba en otro dominio, con otro diseño y
 * solo en inglés (F-21, F-24). Aquí es parte del sitio, en los 7 idiomas.
 * Reglas: nombre de cuenta de 4 a 16 caracteres, contraseña de 10 a 128 no
 * filtrada, aceptación explícita de términos y privacidad, y una trampa
 * para bots sin fricción para las personas (sin CAPTCHA).
 */
import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPage, marker, withElements } from "@/components/auth/AuthPage";
import { languageAlternates } from "@/config/site";
import { getLocale, getTranslator } from "@/i18n/server";
import { signUpAction } from "@/lib/auth/actions";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth/password";
import { USERNAME_MAX, USERNAME_MIN, USERNAME_PATTERN } from "@/lib/auth/username";

const LINK = "text-navy-700 font-bold underline";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  return {
    title: t("auth.register.title"),
    description: t("auth.register.description"),
    alternates: { canonical: `/${locale}/register`, languages: languageAlternates("/register") },
  };
}

export default async function RegisterPage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
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
    <AuthPage
      title={t("auth.register.title")}
      intro={t("auth.register.intro")}
      footer={
        <p>
          {t("auth.register.haveAccount")}{" "}
          <Link href={`/${locale}/sign-in`} className={LINK}>
            {t("auth.register.signInLink")}
          </Link>
        </p>
      }
    >
      <AuthForm
        action={signUpAction}
        hidden={{ locale }}
        honeypot
        submitLabel={t("auth.register.submit")}
        successExtra={
          <Link href={`/${locale}/sign-in`} className={LINK}>
            {t("auth.register.signInLink")}
          </Link>
        }
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
          { name: "terms", label: accept, type: "checkbox", required: true },
        ]}
      />
    </AuthPage>
  );
}
