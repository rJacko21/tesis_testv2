/**
 * Confirmación del correo con el enlace recibido (RF-03).
 *
 * El enlace es un token firmado con caducidad de 24 horas. Si es válido,
 * la cuenta queda verificada y ya puede comprar en la tienda.
 */
import type { Metadata } from "next";
import Link from "next/link";

import noble from "@/assets/characters/noble.webp";
import { AuthPage } from "@/components/auth/AuthPage";
import { getLocale, getTranslator } from "@/i18n/server";
import { auth } from "@/lib/auth/auth";
import { notifyEmailChanged } from "@/lib/auth/email-change";

export const instant = false;

const LINK = "text-navy-700 font-bold underline";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return {
    title: t("auth.verify.title"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

/** Verifica el token. Cualquier fallo (caducado, manipulado, ya usado) es «no válido». */
async function verify(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    await auth.api.verifyEmail({ query: { token } });
  } catch {
    return false;
  }
  // Si era un cambio de correo, avisa al anterior y al nuevo.
  await notifyEmailChanged(token);
  return true;
}

export default async function VerifyEmailPage({
  searchParams,
}: PageProps<"/[locale]/verify-email">) {
  const [locale, t, query] = await Promise.all([getLocale(), getTranslator(), searchParams]);
  const ok = await verify(typeof query.token === "string" ? query.token : "");

  return (
    <AuthPage art={noble} title={t("auth.verify.title")}>
      <p role={ok ? "status" : "alert"}>{ok ? t("auth.verify.ok") : t("auth.verify.invalid")}</p>
      <p className="mt-4">
        <Link href={`/${locale}/account`} className={LINK}>
          {t("auth.verify.account")}
        </Link>
      </p>
    </AuthPage>
  );
}
