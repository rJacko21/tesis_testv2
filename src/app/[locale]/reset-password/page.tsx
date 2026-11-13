/**
 * Elegir una contraseña nueva con el enlace del correo (RF-03).
 *
 * El token llega en la URL y se envía oculto con el formulario. No se
 * comprueba al abrir la página, sino al guardar: así abrir el enlace (o que
 * lo abra el antivirus del correo) no lo gasta. Al cambiarla se cierran
 * todas las sesiones abiertas.
 */
import type { Metadata } from "next";
import Link from "next/link";

import priest from "@/assets/characters/priest.webp";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPage } from "@/components/auth/AuthPage";
import { getLocale, getTranslator } from "@/i18n/server";
import { resetPasswordAction } from "@/lib/auth/actions";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth/password";

// Lee `searchParams` (el token o el destino): se renderiza al pedirla.
export const instant = false;

const LINK = "text-link font-bold underline";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  // `no-referrer`: el token de la URL no viaja a otros sitios al seguir un enlace.
  return {
    title: t("auth.reset.title"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/[locale]/reset-password">) {
  const [locale, t, query] = await Promise.all([getLocale(), getTranslator(), searchParams]);
  const token = typeof query.token === "string" ? query.token : "";

  return (
    <AuthPage
      art={priest}
      title={t("auth.reset.title")}
      footer={
        <p>
          <Link href={`/${locale}/forgot-password`} className={LINK}>
            {t("auth.reset.requestNew")}
          </Link>
        </p>
      }
    >
      {token ? (
        <AuthForm
          action={resetPasswordAction}
          hidden={{ locale, token }}
          submitLabel={t("auth.reset.submit")}
          successExtra={
            <Link href={`/${locale}/sign-in`} className={LINK}>
              {t("auth.reset.signIn")}
            </Link>
          }
          fields={[
            {
              name: "password",
              label: t("auth.fields.newPassword"),
              type: "password",
              autoComplete: "new-password",
              hint: t("auth.fields.passwordHint", { min: PASSWORD_MIN }),
              required: true,
              minLength: PASSWORD_MIN,
              maxLength: PASSWORD_MAX,
            },
            {
              name: "passwordConfirm",
              label: t("auth.fields.newPasswordConfirm"),
              type: "password",
              autoComplete: "new-password",
              required: true,
              minLength: PASSWORD_MIN,
              maxLength: PASSWORD_MAX,
            },
          ]}
        />
      ) : (
        <p role="alert">{t("auth.reset.invalid")}</p>
      )}
    </AuthPage>
  );
}
