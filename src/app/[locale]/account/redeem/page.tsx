/**
 * «Mi cuenta» › Canjear código (RF-13).
 *
 * El jugador escribe el código y, si tiene personajes, elige quién recibe
 * el objeto (los códigos de AP no lo necesitan). Las etiquetas están
 * asociadas a sus campos: en la web original el campo no tenía `<label>`
 * (F-45).
 */
import type { Metadata } from "next";
import Link from "next/link";

import { AccountShell } from "@/components/account/AccountShell";
import { AuthForm } from "@/components/auth/AuthForm";
import { getLocale, getTranslator } from "@/i18n/server";
import { redeemCodeAction } from "@/lib/account/actions";
import { listCharacterOptions } from "@/lib/account/queries";
import { accountPath, requireSession } from "@/lib/account/session";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("account.redeem.title"), robots: { index: false, follow: false } };
}

export default async function RedeemPage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  const session = await requireSession(locale, "redeem");
  const characters = await listCharacterOptions(session.userId);

  return (
    <AccountShell
      locale={locale}
      t={t}
      current="redeem"
      title={t("account.redeem.title")}
      intro={t("account.redeem.intro")}
    >
      <div className="border-parchment-300 max-w-xl rounded-lg border bg-white p-4 sm:p-6">
        <AuthForm
          action={redeemCodeAction}
          idPrefix="redeem"
          hidden={{ locale }}
          submitLabel={t("account.redeem.submit")}
          successExtra={
            <Link
              href={accountPath(locale, "redeem")}
              className="text-navy-700 font-bold underline"
            >
              {t("account.redeem.another")}
            </Link>
          }
          fields={[
            {
              name: "code",
              label: t("account.redeem.code"),
              type: "text",
              autoComplete: "off",
              hint: t("account.redeem.codeHint"),
              required: true,
              maxLength: 40,
            },
            ...(characters.length > 0
              ? [
                  {
                    name: "character",
                    label: t("account.redeem.character"),
                    type: "select" as const,
                    hint: t("account.redeem.characterHint"),
                    options: [
                      { value: "", label: t("account.redeem.noCharacter") },
                      ...characters.map((c) => ({
                        value: String(c.id),
                        label: `${c.name} (${c.server})`,
                      })),
                    ],
                  },
                ]
              : []),
          ]}
        />
      </div>
    </AccountShell>
  );
}
