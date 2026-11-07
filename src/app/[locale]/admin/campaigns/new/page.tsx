/**
 * Panel › Nueva campaña (RF-05, RF-12).
 *
 * @see M-37
 */
import type { Metadata } from "next";
import Link from "next/link";

import { AdminForm } from "@/components/admin/AdminForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { campaignFields } from "@/components/admin/shop";
import { getLocale, getTranslator } from "@/i18n/server";
import { saveCampaignAction } from "@/lib/admin/shop-actions";
import { adminPath, requireStaff } from "@/lib/admin/staff";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("admin.campaigns.new"), robots: { index: false, follow: false } };
}

export default async function NewCampaignPage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  const staff = await requireStaff(locale, "campaigns", adminPath(locale, "campaigns/new"));
  return (
    <AdminShell
      locale={locale}
      t={t}
      roles={staff.roles}
      current="campaigns"
      title={t("admin.campaigns.new")}
      intro={
        <Link href={adminPath(locale, "campaigns")} className="text-base font-semibold underline">
          {t("admin.campaigns.back")}
        </Link>
      }
    >
      <div className="border-parchment-300 max-w-3xl rounded-lg border bg-white p-5">
        <AdminForm
          action={saveCampaignAction}
          idPrefix="campaign"
          columns
          hidden={{ locale }}
          submitLabel={t("admin.campaigns.create")}
          fields={campaignFields(t, null)}
        />
      </div>
    </AdminShell>
  );
}
