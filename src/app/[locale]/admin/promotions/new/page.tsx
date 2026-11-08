/**
 * Panel › Nueva promoción (RF-01, RF-12): imagen, destino, fechas y textos.
 *
 * @see M-38
 */
import type { Metadata } from "next";
import Link from "next/link";

import { AdminForm } from "@/components/admin/AdminForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { promotionFields } from "@/components/admin/promotions";
import { getLocale, getTranslator } from "@/i18n/server";
import { savePromotionAction } from "@/lib/admin/promotion-actions";
import { adminPath, requireStaff } from "@/lib/admin/staff";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("admin.promotions.new"), robots: { index: false, follow: false } };
}

export default async function AdminNewPromotionPage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  const staff = await requireStaff(locale, "promotions", adminPath(locale, "promotions/new"));

  return (
    <AdminShell
      locale={locale}
      t={t}
      roles={staff.roles}
      current="promotions"
      title={t("admin.promotions.new")}
      intro={
        <>
          <p>{t("admin.promotions.newIntro")}</p>
          <Link
            href={adminPath(locale, "promotions")}
            className="text-base font-semibold underline"
          >
            {t("admin.promotions.back")}
          </Link>
        </>
      }
    >
      <div className="border-parchment-300 max-w-3xl rounded-lg border bg-white p-5">
        <AdminForm
          action={savePromotionAction}
          idPrefix="new-promotion"
          columns
          hidden={{ locale }}
          submitLabel={t("admin.promotions.create")}
          fields={promotionFields(t, null)}
        />
      </div>
    </AdminShell>
  );
}
