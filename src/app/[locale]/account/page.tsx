/**
 * «Mi cuenta»: resumen (RF-04).
 *
 * Nombre de cuenta, correo y si está confirmado (con la opción de reenviar
 * el enlace), saldo de AP y cerrar sesión. Las demás secciones están en la
 * navegación de `AccountShell`.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { AccountShell } from "@/components/account/AccountShell";
import { ResendVerification } from "@/components/account/ResendVerification";
import { buttonStyles } from "@/components/ui";
import { getLocale, getTranslator } from "@/i18n/server";
import { getApBalance } from "@/lib/account/queries";
import { requireSession } from "@/lib/account/session";
import { signOutAction } from "@/lib/auth/actions";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("auth.account.title"), robots: { index: false, follow: false } };
}

export default async function AccountPage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  const session = await requireSession(locale, "");
  const { user } = session;
  const name = (user as { displayUsername?: string | null }).displayUsername ?? user.name;
  const balance = await getApBalance(session.userId);

  return (
    <AccountShell
      locale={locale}
      t={t}
      current=""
      title={t("auth.account.title")}
      intro={t("auth.account.greeting", { name })}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <dl className="border-parchment-300 grid gap-4 rounded-lg border bg-white p-5">
          <div>
            <dt className="text-navy-900 font-bold">{t("auth.fields.username")}</dt>
            <dd>{name}</dd>
          </div>
          <div>
            <dt className="text-navy-900 font-bold">{t("auth.account.email")}</dt>
            <dd className="break-words">
              {user.email} ·{" "}
              {user.emailVerified ? (
                <span className="text-success-700 font-bold">{t("auth.account.verified")}</span>
              ) : (
                <span className="text-danger-700 font-bold">{t("auth.account.unverified")}</span>
              )}
            </dd>
            {user.emailVerified ? null : (
              // Dentro de un <dd>: un <dl> solo admite grupos de <dt> y <dd>.
              <dd>
                <ResendVerification locale={locale} label={t("auth.account.resend")} />
              </dd>
            )}
          </div>
        </dl>

        <section
          aria-labelledby="balance-title"
          className="bg-navy-900 grid content-start gap-2 rounded-lg p-5 text-white"
        >
          <h2 id="balance-title" className="font-bold text-sky-300">
            {t("account.summary.balance")}
          </h2>
          <p className="font-display text-gold-300 text-4xl font-bold">
            {t("account.summary.ap", { amount: balance })}
          </p>
          <Link
            href={`/${locale}/topup`}
            className={buttonStyles({ variant: "primary", className: "mt-2 w-fit" })}
          >
            {t("account.summary.topUp")}
          </Link>
        </section>
      </div>

      <form action={signOutAction} className="mt-8">
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className={buttonStyles({ variant: "secondary" })}>
          {t("auth.account.signOut")}
        </button>
      </form>
    </AccountShell>
  );
}
