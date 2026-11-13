/**
 * Inicio de sesión (RF-03): con nombre de cuenta o correo, en la propia web
 * y en el idioma de la página (en la original se saltaba a otro dominio,
 * F-24). Un fallo nunca dice si la cuenta existe.
 *
 * `?next=/es/…` vuelve a esa página tras entrar (solo rutas internas).
 */
import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPage } from "@/components/auth/AuthPage";
import { languageAlternates } from "@/config/site";
import { getLocale, getTranslator } from "@/i18n/server";
import { signInAction } from "@/lib/auth/actions";

// Lee `searchParams` (el token o el destino): se renderiza al pedirla.
export const instant = false;

const LINK = "text-link font-bold underline";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  return {
    title: t("auth.signIn.title"),
    description: t("auth.signIn.description"),
    alternates: { canonical: `/${locale}/sign-in`, languages: languageAlternates("/sign-in") },
  };
}

export default async function SignInPage({ searchParams }: PageProps<"/[locale]/sign-in">) {
  const [locale, t, query] = await Promise.all([getLocale(), getTranslator(), searchParams]);
  const next = typeof query.next === "string" ? query.next : "";

  return (
    <AuthPage
      title={t("auth.signIn.title")}
      aside={{
        title: t("auth.signIn.asideTitle"),
        points: [
          t("auth.signIn.asideCharacters"),
          t("auth.signIn.asideShop"),
          t("auth.signIn.asideSecurity"),
        ],
      }}
      footer={
        <>
          <p>
            <Link href={`/${locale}/forgot-password`} className={LINK}>
              {t("auth.signIn.forgot")}
            </Link>
          </p>
          <p>
            {t("auth.signIn.noAccount")}{" "}
            <Link href={`/${locale}/play-now`} className={LINK}>
              {t("auth.signIn.registerLink")}
            </Link>
          </p>
        </>
      }
    >
      {query.deleted === "1" ? (
        // Tras borrar la cuenta (RGPD) se llega aquí, ya sin sesión.
        <p role="status" className="mt-6 rounded-lg bg-teal-100 p-4 text-teal-900">
          {t("account.privacy.deleted")}
        </p>
      ) : null}
      <AuthForm
        action={signInAction}
        hidden={{ locale, next }}
        submitLabel={t("auth.signIn.submit")}
        fields={[
          {
            name: "identifier",
            label: t("auth.fields.identifier"),
            type: "text",
            autoComplete: "username",
            required: true,
            maxLength: 254,
          },
          {
            name: "password",
            label: t("auth.fields.password"),
            type: "password",
            autoComplete: "current-password",
            required: true,
          },
        ]}
      />
    </AuthPage>
  );
}
