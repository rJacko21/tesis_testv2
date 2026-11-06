/**
 * «Mi cuenta», versión inicial (RF-04 llega completo en T-18).
 *
 * Muestra el nombre de cuenta, el correo y si está confirmado, con la
 * opción de reenviar el enlace, y el botón de cerrar sesión. Sin sesión,
 * lleva al inicio de sesión y vuelve aquí después.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ResendVerification } from "@/components/account/ResendVerification";
import { buttonStyles, Container } from "@/components/ui";
import { getLocale, getTranslator } from "@/i18n/server";
import { signOutAction } from "@/lib/auth/actions";
import { getSession } from "@/lib/auth/session";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("auth.account.title"), robots: { index: false, follow: false } };
}

export default async function AccountPage() {
  const [locale, t, session] = await Promise.all([getLocale(), getTranslator(), getSession()]);
  if (!session) redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/account`)}`);

  const { user } = session;
  const name = (user as { displayUsername?: string | null }).displayUsername ?? user.name;

  return (
    <main className="flex-1 py-8 sm:py-12">
      <Container>
        <h1 className="font-display text-navy-900 text-4xl font-bold">{t("auth.account.title")}</h1>
        <p className="text-ink-600 mt-2 text-lg">{t("auth.account.greeting", { name })}</p>

        <dl className="border-parchment-300 mt-6 grid max-w-xl gap-4 rounded-lg border bg-white p-5">
          <div>
            <dt className="text-navy-900 font-bold">{t("auth.fields.username")}</dt>
            <dd>{name}</dd>
          </div>
          <div>
            <dt className="text-navy-900 font-bold">{t("auth.account.email")}</dt>
            <dd>
              {user.email} ·{" "}
              {user.emailVerified ? (
                <span className="text-success-700 font-bold">{t("auth.account.verified")}</span>
              ) : (
                <span className="text-danger-700 font-bold">{t("auth.account.unverified")}</span>
              )}
            </dd>
            {user.emailVerified ? null : (
              <ResendVerification locale={locale} label={t("auth.account.resend")} />
            )}
          </div>
        </dl>

        <p className="text-ink-600 mt-6">{t("auth.account.comingSoon")}</p>

        <form action={signOutAction} className="mt-6">
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className={buttonStyles({ variant: "secondary" })}>
            {t("auth.account.signOut")}
          </button>
        </form>
      </Container>
    </main>
  );
}
