/**
 * «Mi cuenta» › Seguridad (RF-04): cambiar la contraseña y el correo, y ver
 * y cerrar las sesiones abiertas.
 *
 * Todo dentro de la web y en el idioma de la página: en la web original
 * estas opciones estaban en otro dominio, en inglés y con avisos en otro
 * idioma (F-47). Los formularios funcionan sin JavaScript.
 *
 * @see RF-04 · OWASP ASVS V2.1.6, V3.3.4
 */
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/AuthForm";
import { AccountShell } from "@/components/account/AccountShell";
import { DateTime } from "@/components/account/DateTime";
import { buttonStyles } from "@/components/ui";
import { getLocale, getTranslator } from "@/i18n/server";
import {
  changeEmailAction,
  changePasswordAction,
  revokeSessionAction,
} from "@/lib/account/actions";
import { describeDevice } from "@/lib/account/device";
import { listOpenSessions } from "@/lib/account/queries";
import { requireSession } from "@/lib/account/session";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth/password";

export const instant = false;

const SECTION = "border-parchment-300 rounded-lg border bg-white p-4 sm:p-6";
const H2 = "font-display text-navy-900 text-2xl font-bold";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("account.security.title"), robots: { index: false, follow: false } };
}

export default async function SecurityPage({
  searchParams,
}: PageProps<"/[locale]/account/security">) {
  const [locale, t, query] = await Promise.all([getLocale(), getTranslator(), searchParams]);
  const session = await requireSession(locale, "security");
  const open = await listOpenSessions(session.userId);
  const currentId = Number(session.session.id);
  const others = open.filter((s) => s.id !== currentId);
  const device = (userAgent: string | null) => {
    const { browser, os } = describeDevice(userAgent);
    return [browser, os].filter(Boolean).join(" · ") || t("account.security.unknownDevice");
  };

  return (
    <AccountShell locale={locale} t={t} current="security" title={t("account.security.title")}>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="password-title" className={SECTION}>
          <h2 id="password-title" className={H2}>
            {t("account.security.passwordTitle")}
          </h2>
          <p className="text-ink-600 mt-1">{t("account.security.passwordNote")}</p>
          <AuthForm
            action={changePasswordAction}
            idPrefix="password"
            hidden={{ locale }}
            submitLabel={t("account.security.passwordSubmit")}
            fields={[
              {
                name: "currentPassword",
                label: t("account.security.currentPassword"),
                type: "password",
                autoComplete: "current-password",
                required: true,
                maxLength: PASSWORD_MAX,
              },
              {
                name: "newPassword",
                label: t("auth.fields.newPassword"),
                type: "password",
                autoComplete: "new-password",
                hint: t("auth.fields.passwordHint", { min: PASSWORD_MIN }),
                required: true,
                minLength: PASSWORD_MIN,
                maxLength: PASSWORD_MAX,
              },
            ]}
          />
        </section>

        <section aria-labelledby="email-title" className={SECTION}>
          <h2 id="email-title" className={H2}>
            {t("account.security.emailTitle")}
          </h2>
          <p className="text-ink-600 mt-1 break-words">
            {t("account.security.currentEmail", { email: session.user.email })}
          </p>
          <AuthForm
            action={changeEmailAction}
            idPrefix="email"
            hidden={{ locale }}
            submitLabel={t("account.security.emailSubmit")}
            fields={[
              {
                name: "newEmail",
                label: t("account.security.newEmail"),
                type: "email",
                autoComplete: "email",
                hint: t("account.security.emailHint"),
                required: true,
                maxLength: 254,
              },
              {
                name: "password",
                label: t("account.security.currentPassword"),
                type: "password",
                autoComplete: "current-password",
                required: true,
                maxLength: PASSWORD_MAX,
              },
            ]}
          />
        </section>
      </div>

      <section id="sessions" aria-labelledby="sessions-title" className={`${SECTION} mt-6`}>
        <h2 id="sessions-title" className={H2}>
          {t("account.security.sessionsTitle")}
        </h2>
        <p className="text-ink-600 mt-1">{t("account.security.sessionsIntro")}</p>
        {query.closed === "1" ? (
          <p role="status" className="mt-4 rounded-lg bg-teal-100 p-3 text-teal-900">
            {t("account.security.closed")}
          </p>
        ) : null}

        <ul className="divide-parchment-300 mt-4 divide-y">
          {open.map((item) => {
            const isCurrent = item.id === currentId;
            const name = device(item.userAgent);
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
              >
                <div>
                  <p className="text-navy-900 font-bold">
                    {name}
                    {isCurrent ? (
                      <span className="bg-success-700 ml-2 rounded-full px-2.5 py-0.5 text-xs text-white">
                        {t("account.security.thisDevice")}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-ink-600 text-sm">
                    {t("account.security.lastActive")}{" "}
                    <DateTime locale={locale} date={item.updatedAt} />
                  </p>
                </div>
                {isCurrent ? null : (
                  <form action={revokeSessionAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="sessionId" value={item.id} />
                    <button
                      type="submit"
                      aria-label={t("account.security.closeOne", { device: name })}
                      className={buttonStyles({ variant: "secondary" })}
                    >
                      {t("account.security.close")}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>

        {others.length > 0 ? (
          <form action={revokeSessionAction} className="mt-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="sessionId" value="others" />
            <button type="submit" className={buttonStyles({ variant: "secondary" })}>
              {t("account.security.closeOthers")}
            </button>
          </form>
        ) : (
          <p className="mt-4">{t("account.security.onlyThis")}</p>
        )}
      </section>
    </AccountShell>
  );
}
