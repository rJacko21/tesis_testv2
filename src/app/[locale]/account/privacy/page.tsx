/**
 * «Mi cuenta» › Privacidad (RF-04, RGPD): descargar una copia de los datos
 * (art. 15 y 20) y borrar la cuenta (art. 17).
 *
 * Borrar pide la contraseña y una casilla de confirmación, y explica antes
 * qué se borra y qué se conserva por obligación legal (`privacy.ts`).
 */
import type { Metadata } from "next";

import { AccountShell } from "@/components/account/AccountShell";
import { AuthForm } from "@/components/auth/AuthForm";
import { buttonStyles } from "@/components/ui";
import { getLocale, getTranslator } from "@/i18n/server";
import { deleteAccountAction } from "@/lib/account/actions";
import { requireSession } from "@/lib/account/session";
import { PASSWORD_MAX } from "@/lib/auth/password";

export const instant = false;

const SECTION = "border-parchment-300 rounded-lg border bg-white p-4 sm:p-6";
const H2 = "font-display text-navy-900 text-2xl font-bold";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("account.privacy.title"), robots: { index: false, follow: false } };
}

export default async function PrivacyPage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  await requireSession(locale, "privacy");

  return (
    <AccountShell locale={locale} t={t} current="privacy" title={t("account.privacy.title")}>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="export-title" className={SECTION}>
          <h2 id="export-title" className={H2}>
            {t("account.privacy.exportTitle")}
          </h2>
          <p className="mt-2">{t("account.privacy.exportBody")}</p>
          {/* Descarga directa: un enlace funciona sin JavaScript. */}
          <a
            href="/api/account/export"
            download
            className={`${buttonStyles({ variant: "secondary" })} mt-4`}
          >
            {t("account.privacy.exportAction")}
          </a>
        </section>

        <section aria-labelledby="delete-title" className={SECTION}>
          <h2 id="delete-title" className={H2}>
            {t("account.privacy.deleteTitle")}
          </h2>
          <p className="mt-2">{t("account.privacy.deleteBody")}</p>
          <p className="text-ink-600 mt-2 text-sm">{t("account.privacy.deleteKept")}</p>
          <AuthForm
            action={deleteAccountAction}
            idPrefix="delete"
            hidden={{ locale }}
            submitLabel={t("account.privacy.deleteSubmit")}
            fields={[
              {
                name: "password",
                label: t("account.security.currentPassword"),
                type: "password",
                autoComplete: "current-password",
                required: true,
                maxLength: PASSWORD_MAX,
              },
              {
                name: "confirm",
                label: t("account.privacy.deleteConfirm"),
                type: "checkbox",
                required: true,
              },
            ]}
          />
        </section>
      </div>
    </AccountShell>
  );
}
