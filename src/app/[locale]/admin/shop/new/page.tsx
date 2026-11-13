/**
 * Panel › Nuevo artículo (RF-05, RF-12). Se crea inactivo: en su ficha se
 * escriben los nombres, se le pone precio y se activa.
 *
 * @see RF-05 · RF-12 · M-37
 */
import type { Metadata } from "next";
import Link from "next/link";

import { AdminForm } from "@/components/admin/AdminForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { itemFields } from "@/components/admin/shop";
import { getLocale, getTranslator } from "@/i18n/server";
import { listCategoryOptions } from "@/lib/admin/shop";
import { saveItemAction } from "@/lib/admin/shop-actions";
import { adminPath, requireStaff } from "@/lib/admin/staff";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("admin.shop.new"), robots: { index: false, follow: false } };
}

export default async function NewItemPage() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  const staff = await requireStaff(locale, "shop", adminPath(locale, "shop/new"));
  const categories = await listCategoryOptions(locale);
  return (
    <AdminShell
      locale={locale}
      t={t}
      roles={staff.roles}
      current="shop"
      title={t("admin.shop.new")}
      intro={
        <>
          <p>{t("admin.shop.newIntro")}</p>
          <Link href={adminPath(locale, "shop")} className="text-base font-semibold underline">
            {t("admin.shop.back")}
          </Link>
        </>
      }
    >
      <div className="border-parchment-300 bg-surface max-w-3xl rounded-lg border p-5">
        <AdminForm
          action={saveItemAction}
          idPrefix="new-item"
          columns
          hidden={{ locale, isActive: "" }}
          submitLabel={t("admin.shop.create")}
          fields={itemFields(t, categories, null).filter((field) => field.name !== "isActive")}
        />
      </div>
    </AdminShell>
  );
}
