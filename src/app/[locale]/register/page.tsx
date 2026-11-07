/**
 * Registro (RF-03).
 *
 * En la web original el registro estaba en otro dominio, con otro diseño y
 * solo en inglés (F-21, F-24). Aquí es parte del sitio, en los 7 idiomas.
 * El formulario y sus reglas están en `RegisterForm`, que comparte con la
 * landing «Jugar ahora».
 */
import type { Metadata } from "next";
import Link from "next/link";

import { AuthPage } from "@/components/auth/AuthPage";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { languageAlternates } from "@/config/site";
import { getLocale, getTranslator } from "@/i18n/server";

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
      <RegisterForm
        locale={locale}
        t={t}
        successExtra={
          <Link href={`/${locale}/sign-in`} className={LINK}>
            {t("auth.register.signInLink")}
          </Link>
        }
      />
    </AuthPage>
  );
}
