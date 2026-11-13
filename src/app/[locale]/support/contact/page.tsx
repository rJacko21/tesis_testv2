/**
 * Formulario de contacto con soporte (RF-10).
 *
 * En la web original "Soporte" era un enlace `mailto:` (F-23): dependía de
 * tener un programa de correo configurado y no pedía los datos que el equipo
 * necesita. Aquí el jugador elige el motivo y escribe su mensaje; llega por
 * correo al buzón de soporte y se le responde a su dirección.
 *
 * Es estática (se prerenderiza en los 7 idiomas): la acción es la que mira
 * si hay sesión, para añadir la cuenta al correo.
 *
 * @see RF-10 · M-39
 */
import type { Metadata } from "next";
import Link from "next/link";

import saint from "@/assets/characters/saint.webp";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPage } from "@/components/auth/AuthPage";
import { languageAlternates } from "@/config/site";
import { getLocale, getTranslator } from "@/i18n/server";
import { contactSupportAction } from "@/lib/support/actions";
import { CONTACT_CATEGORIES, CONTACT_LIMITS as L } from "@/lib/support/contact-rules";

const LINK = "text-link font-bold underline";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  return {
    title: t("support.contact.title"),
    description: t("support.contact.description"),
    alternates: {
      canonical: `/${locale}/support/contact`,
      languages: languageAlternates("/support/contact"),
    },
  };
}

export default async function SupportContactPage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  return (
    <AuthPage
      art={saint}
      title={t("support.contact.title")}
      intro={t("support.contact.intro")}
      footer={
        <p>
          <Link href={`/${locale}/support`} className={LINK}>
            {t("support.contact.back")}
          </Link>
        </p>
      }
    >
      <p className="text-ink-900 rounded-lg bg-sky-100 p-3 text-sm">
        {t("support.contact.noPassword")}
      </p>
      <AuthForm
        action={contactSupportAction}
        hidden={{ locale }}
        honeypot
        idPrefix="contact"
        submitLabel={t("support.contact.submit")}
        fields={[
          {
            name: "name",
            label: t("support.contact.fields.name"),
            type: "text",
            autoComplete: "name",
            required: true,
            maxLength: L.nameMax,
          },
          {
            name: "email",
            label: t("auth.fields.email"),
            type: "email",
            autoComplete: "email",
            hint: t("support.contact.fields.emailHint"),
            required: true,
            maxLength: L.emailMax,
          },
          {
            name: "category",
            label: t("support.contact.fields.category"),
            type: "select",
            required: true,
            options: [
              { value: "", label: t("support.contact.fields.choose") },
              ...CONTACT_CATEGORIES.map((value) => ({
                value,
                label: t(`support.contact.categories.${value}`),
              })),
            ],
          },
          {
            name: "subject",
            label: t("support.contact.fields.subject"),
            type: "text",
            required: true,
            minLength: L.subjectMin,
            maxLength: L.subjectMax,
          },
          {
            name: "message",
            label: t("support.contact.fields.message"),
            type: "textarea",
            hint: t("support.contact.fields.messageHint", { min: L.messageMin, max: L.messageMax }),
            required: true,
            minLength: L.messageMin,
            maxLength: L.messageMax,
            rows: 8,
          },
        ]}
      />
    </AuthPage>
  );
}
