/**
 * Recuperar la contraseña (RF-03): pide el correo y responde siempre lo
 * mismo, exista o no la cuenta (criterio de aceptación).
 */
import type { Metadata } from "next";
import Link from "next/link";

import priest from "@/assets/characters/priest.webp";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPage } from "@/components/auth/AuthPage";
import { getLocale, getTranslator } from "@/i18n/server";
import { requestPasswordResetAction } from "@/lib/auth/actions";

const LINK = "text-link font-bold underline";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return {
    title: t("auth.forgot.title"),
    description: t("auth.forgot.description"),
    robots: { index: false, follow: true },
  };
}

export default async function ForgotPasswordPage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  return (
    <AuthPage
      art={priest}
      title={t("auth.forgot.title")}
      intro={t("auth.forgot.intro")}
      footer={
        <p>
          <Link href={`/${locale}/sign-in`} className={LINK}>
            {t("auth.forgot.back")}
          </Link>
        </p>
      }
    >
      <AuthForm
        action={requestPasswordResetAction}
        hidden={{ locale }}
        submitLabel={t("auth.forgot.submit")}
        fields={[
          {
            name: "email",
            label: t("auth.fields.email"),
            type: "email",
            autoComplete: "email",
            required: true,
            maxLength: 254,
          },
        ]}
      />
    </AuthPage>
  );
}
