/**
 * Presentación de cada categoría de noticia: etiqueta traducida y tono.
 *
 * @see RF-08 (Anuncio, Evento, Tienda, Canje, Mantenimiento)
 */
import type { BadgeTone } from "@/components/ui";
import { POST_CATEGORIES, type PostCategory } from "@/db/schema/content";

export { POST_CATEGORIES };

export const CATEGORY_TONE: Record<PostCategory, BadgeTone> = {
  announcement: "info",
  event: "success",
  shop: "sale",
  redeem: "neutral",
  maintenance: "neutral",
};

/** Comprueba un valor de la URL (`?category=…`). */
export function isPostCategory(value: unknown): value is PostCategory {
  return typeof value === "string" && (POST_CATEGORIES as readonly string[]).includes(value);
}
