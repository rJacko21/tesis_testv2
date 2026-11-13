/**
 * Panel › Ficha de campaña (RF-05, RF-12). Cambiar sus fechas mueve las
 * filas de precio que las seguían; una campaña terminada ya no cambia de
 * fechas.
 *
 * @see M-37
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminForm } from "@/components/admin/AdminForm";
import { AdminNotice, AdminShell } from "@/components/admin/AdminShell";
import { campaignFields } from "@/components/admin/shop";
import { getLocale, getTranslator } from "@/i18n/server";
import { listAdminCampaigns } from "@/lib/admin/shop";
import { saveCampaignAction } from "@/lib/admin/shop-actions";
import { adminPath, requireStaff } from "@/lib/admin/staff";

export const instant = false;

const DONE = ["created", "saved"] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/campaigns/[id]">): Promise<Metadata> {
  const [t, { id }] = await Promise.all([getTranslator(), params]);
  return { title: t("admin.campaigns.editTitle", { id }), robots: { index: false, follow: false } };
}

export default async function AdminCampaignPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/campaigns/[id]">) {
  const [locale, t, { id }, query] = await Promise.all([
    getLocale(),
    getTranslator(),
    params,
    searchParams,
  ]);
  const staff = await requireStaff(locale, "campaigns", adminPath(locale, `campaigns/${id}`));
  const campaign = (await listAdminCampaigns(locale)).find((row) => String(row.id) === id);
  if (!campaign) notFound();
  const done = DONE.find((value) => value === query.done);

  return (
    <AdminShell
      locale={locale}
      t={t}
      roles={staff.roles}
      current="campaigns"
      title={campaign.name}
      intro={
        <div className="flex flex-wrap gap-x-4 text-base">
          <span>{t("admin.campaigns.rowsLinked", { count: campaign.priceRows })}</span>
          <Link href={adminPath(locale, "campaigns")} className="font-semibold underline">
            {t("admin.campaigns.back")}
          </Link>
        </div>
      }
    >
      {done ? <AdminNotice tone="done">{t(`admin.campaigns.done.${done}`)}</AdminNotice> : null}
      <div className="border-parchment-300 bg-surface max-w-3xl rounded-lg border p-5">
        <AdminForm
          action={saveCampaignAction}
          idPrefix="campaign"
          columns
          hidden={{ locale, id: String(campaign.id) }}
          submitLabel={t("admin.news.save")}
          fields={campaignFields(t, campaign)}
        />
      </div>
    </AdminShell>
  );
}
