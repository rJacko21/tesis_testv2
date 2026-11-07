"use server";
/**
 * Server Actions de la cesta y la compra (RF-05).
 *
 * Son formularios normales (`<form action={…}>`): funcionan sin JavaScript
 * y no añaden nada al paquete del cliente. Cada acción termina con una
 * redirección a la cesta con el resultado en la URL (`?added=`, `?ordered=`,
 * `?error=`), que la página traduce a un mensaje. Así, recargar la página
 * después de comprar no vuelve a enviar la compra (patrón PRG).
 *
 * Todas exigen sesión y actúan solo sobre la cuenta de esa sesión. Next.js
 * comprueba el origen de cada Server Action (protección CSRF).
 *
 * @see RF-05 · M-32
 */
import { redirect } from "next/navigation";

import type { Locale } from "@/config/locales";
import { formLocale, text } from "@/lib/auth/action-helpers";
import { getSession } from "@/lib/auth/session";

import { addToCart, parseQuantity, setCartQuantity } from "./cart";
import { purchase } from "./purchase";
import { loadShop } from "./shop";
import { catalogAt } from "./shop-catalog";
import { itemHref, parseItemId } from "./shop-filters";

const cartPath = (locale: Locale) => `/${locale}/cart`;

/** Usuario de la sesión o, sin sesión, a iniciar sesión y volver a `back`. */
async function sessionUser(locale: Locale, back: string) {
  const session = await getSession();
  if (!session) redirect(`/${locale}/sign-in?next=${encodeURIComponent(back)}`);
  return Number(session.user.id);
}

/** Añade un artículo a la cesta desde su ficha. */
export async function addToCartAction(form: FormData): Promise<void> {
  const { locale } = await formLocale(form);
  const itemId = parseItemId(text(form, "itemId"));
  const quantity = parseQuantity(text(form, "quantity"));
  if (itemId === null || !quantity) redirect(`/${locale}/shop`);

  const userId = await sessionUser(locale, itemHref(locale, itemId));
  // Solo lo que está a la venta ahora.
  const { items } = catalogAt(await loadShop(locale), new Date());
  if (!items.some((item) => item.id === itemId)) redirect(`${cartPath(locale)}?error=unavailable`);

  const added = await addToCart(userId, itemId, quantity);
  redirect(`${cartPath(locale)}?${added ? `added=${itemId}` : "error=full"}`);
}

/** Cambia la cantidad de un artículo de la cesta; con 0 lo quita. */
export async function updateCartAction(form: FormData): Promise<void> {
  const { locale } = await formLocale(form);
  const userId = await sessionUser(locale, cartPath(locale));
  const itemId = parseItemId(text(form, "itemId"));
  const quantity = parseQuantity(text(form, "quantity"));
  if (itemId !== null && quantity !== null) await setCartQuantity(userId, itemId, quantity);
  redirect(`${cartPath(locale)}${quantity === 0 ? "?removed=1" : "?updated=1"}`);
}

/** Paga la cesta con el saldo de AP y la envía al personaje elegido. */
export async function checkoutAction(form: FormData): Promise<void> {
  const { locale } = await formLocale(form);
  const userId = await sessionUser(locale, cartPath(locale));
  const characterId = Number(text(form, "characterId"));
  const expected = Number(text(form, "expectedTotal"));
  if (!Number.isSafeInteger(characterId) || characterId <= 0) {
    redirect(`${cartPath(locale)}?error=character`);
  }

  const result = await purchase({
    userId,
    characterId,
    expectedTotal: Number.isSafeInteger(expected) ? expected : -1,
  });
  redirect(
    result.ok
      ? `${cartPath(locale)}?ordered=${result.orderId}`
      : `${cartPath(locale)}?error=${result.problem}`,
  );
}
