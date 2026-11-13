/**
 * Consultas del catálogo de la tienda (RF-05).
 *
 * `loadShop(locale)` lee de una vez las categorías, los artículos activos y
 * todas sus filas de precio, con los textos en el idioma pedido (o en
 * inglés si falta la traducción). Va en caché (`"use cache"`, etiqueta
 * `shop`, minutos): con decenas o pocos cientos de artículos es una lectura
 * pequeña que comparten todos los visitantes.
 *
 * El precio vigente **no** se guarda en caché: `catalogAt` lo calcula en
 * cada petición con la hora actual (`currentPrice`). Así una rebaja empieza
 * y termina a su hora exacta aunque la caché tenga unos minutos.
 *
 * @see RF-05 · F-16 (fin de campaña) · F-19
 */
import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { cacheLife, cacheTag } from "next/cache";

import type { Locale } from "@/config/locales";
import {
  campaignTranslations,
  campaigns,
  itemPrices,
  media,
  shopCategories,
  shopCategoryTranslations,
  shopItemPreviews,
  shopItems,
  shopItemTranslations,
} from "@/db/schema";

import { mediaUrl } from "./media";
import type { RawItem, ShopCategory, ShopData } from "./shop-catalog";

/** Etiqueta de caché que invalidará el panel de administración al cambiar la tienda. */
export const SHOP_CACHE_TAG = "shop";

/** Categorías, artículos activos y precios en un idioma. */
export async function loadShop(locale: Locale): Promise<ShopData> {
  "use cache";
  cacheTag(SHOP_CACHE_TAG);
  cacheLife("minutes");

  const { db } = await import("@/db/client");
  const localCategory = alias(shopCategoryTranslations, "local_category");
  const englishCategory = alias(shopCategoryTranslations, "english_category");
  const categoryRows = await db
    .select({
      id: shopCategories.id,
      parentId: shopCategories.parentId,
      slug: shopCategories.slug,
      name: sql<string>`coalesce(${localCategory.name}, ${englishCategory.name}, ${shopCategories.slug})`,
    })
    .from(shopCategories)
    .leftJoin(
      localCategory,
      and(eq(localCategory.categoryId, shopCategories.id), eq(localCategory.locale, locale)),
    )
    .leftJoin(
      englishCategory,
      and(eq(englishCategory.categoryId, shopCategories.id), eq(englishCategory.locale, "en")),
    )
    .orderBy(asc(shopCategories.sortOrder), asc(shopCategories.id));

  const localItem = alias(shopItemTranslations, "local_item");
  const englishItem = alias(shopItemTranslations, "english_item");
  const itemRows = await db
    .select({
      id: shopItems.id,
      categoryId: shopItems.categoryId,
      name: sql<string>`coalesce(${localItem.name}, ${englishItem.name}, ${shopItems.sku})`,
      description: sql<string>`coalesce(${localItem.description}, ${englishItem.description}, '')`,
      validityDays: shopItems.validityDays,
      isBundle: shopItems.isBundle,
      isLimited: shopItems.isLimited,
      isGiftable: shopItems.isGiftable,
      sortOrder: shopItems.sortOrder,
      createdAt: shopItems.createdAt,
      imagePath: media.path,
      imageWidth: media.width,
      imageHeight: media.height,
    })
    .from(shopItems)
    .leftJoin(media, eq(media.id, shopItems.imageId))
    .leftJoin(localItem, and(eq(localItem.itemId, shopItems.id), eq(localItem.locale, locale)))
    .leftJoin(englishItem, and(eq(englishItem.itemId, shopItems.id), eq(englishItem.locale, "en")))
    .where(eq(shopItems.isActive, 1));

  const localCampaign = alias(campaignTranslations, "local_campaign");
  const englishCampaign = alias(campaignTranslations, "english_campaign");
  const priceRows = itemRows.length
    ? await db
        .select({
          itemId: itemPrices.itemId,
          priceAp: itemPrices.priceAp,
          salePriceAp: itemPrices.salePriceAp,
          campaignId: itemPrices.campaignId,
          campaign: sql<
            string | null
          >`coalesce(${localCampaign.name}, ${englishCampaign.name}, ${campaigns.code})`,
          startsAt: itemPrices.startsAt,
          endsAt: itemPrices.endsAt,
        })
        .from(itemPrices)
        .leftJoin(campaigns, eq(campaigns.id, itemPrices.campaignId))
        .leftJoin(
          localCampaign,
          and(eq(localCampaign.campaignId, campaigns.id), eq(localCampaign.locale, locale)),
        )
        .leftJoin(
          englishCampaign,
          and(eq(englishCampaign.campaignId, campaigns.id), eq(englishCampaign.locale, "en")),
        )
        .where(
          inArray(
            itemPrices.itemId,
            itemRows.map((row) => row.id),
          ),
        )
    : [];

  // Capturas del juego de cada artículo (solo las tienen los cosméticos).
  const previewRows = itemRows.length
    ? await db
        .select({
          itemId: shopItemPreviews.itemId,
          path: media.path,
          width: media.width,
          height: media.height,
        })
        .from(shopItemPreviews)
        .innerJoin(media, eq(media.id, shopItemPreviews.mediaId))
        .orderBy(asc(shopItemPreviews.sortOrder), asc(shopItemPreviews.mediaId))
    : [];

  const byId = new Map(categoryRows.map((row) => [row.id, row]));
  const categories: ShopCategory[] = categoryRows
    .filter((row) => row.parentId === null)
    .map((row) => ({
      slug: row.slug,
      name: row.name,
      children: categoryRows
        .filter((child) => child.parentId === row.id)
        .map((child) => ({ slug: child.slug, name: child.name })),
    }));

  const items: RawItem[] = itemRows.flatMap((row) => {
    const own = byId.get(row.categoryId);
    if (!own) return [];
    const parent = own.parentId === null ? null : byId.get(own.parentId);
    return [
      {
        id: row.id,
        name: row.name,
        description: row.description,
        category: parent ? parent.slug : own.slug,
        subcategory: parent ? own.slug : null,
        image:
          row.imagePath && row.imageWidth && row.imageHeight
            ? { src: mediaUrl(row.imagePath), width: row.imageWidth, height: row.imageHeight }
            : null,
        previews: previewRows
          .filter((preview) => preview.itemId === row.id)
          .map((preview) => ({
            src: mediaUrl(preview.path),
            width: preview.width,
            height: preview.height,
          })),
        validityDays: row.validityDays,
        isBundle: row.isBundle === 1,
        isLimited: row.isLimited === 1,
        isGiftable: row.isGiftable === 1,
        sortOrder: row.sortOrder,
        createdAt: row.createdAt,
        prices: priceRows
          .filter((price) => price.itemId === row.id)
          .map((price) => ({
            priceAp: price.priceAp,
            salePriceAp: price.salePriceAp,
            campaignId: price.campaignId,
            campaign: price.campaignId === null ? null : price.campaign,
            startsAt: price.startsAt,
            endsAt: price.endsAt,
          })),
      },
    ];
  });

  return { categories, items };
}
