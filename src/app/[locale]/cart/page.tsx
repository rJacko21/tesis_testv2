/**
 * Cesta de la compra y pago con AP (RF-05).
 *
 * - Cada artículo con su precio actual, cantidad (1-10) y subtotal. Los que
 *   ya no se venden se marcan y hay que quitarlos antes de pagar.
 * - Resumen con el total, el saldo y el saldo que queda tras pagar.
 * - Se elige el personaje (y con él, el servidor) que recibe los objetos.
 * - Si el saldo no alcanza, se dice cuánto falta y se ofrece recargar
 *   (criterio de aceptación de RF-05).
 * - Comprar exige el correo confirmado (RF-03).
 *
 * Sin JavaScript de cliente: cada botón es un formulario con una Server
 * Action que vuelve aquí con el resultado en la URL.
 *
 * Datos privados: sesión obligatoria, `noindex` y sin caché.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ItemArt } from "@/components/shop/ItemArt";
import { ItemPrice } from "@/components/shop/ItemPrice";
import { buttonStyles, Container } from "@/components/ui";
import type { Locale } from "@/config/locales";
import { getLocale, getTranslator } from "@/i18n/server";
import type { Translate } from "@/i18n/translator";
import { getApBalance, listCharacterOptions } from "@/lib/account/queries";
import { getSession } from "@/lib/auth/session";
import { CART_MAX_QUANTITY, getCartLines } from "@/lib/cart";
import { checkoutAction, updateCartAction } from "@/lib/cart-actions";
import type { PurchaseProblem } from "@/lib/purchase";
import { loadShop } from "@/lib/shop";
import { catalogAt, finalPrice, type CatalogItem } from "@/lib/shop-catalog";
import { itemHref, parseItemId } from "@/lib/shop-filters";

export const instant = false;

const PANEL = "border-parchment-300 rounded-lg border bg-white p-4 sm:p-6";
const FIELD =
  "border-parchment-300 text-ink-900 min-h-11 rounded-lg border bg-white px-3 focus:border-navy-700";

/** Errores que la cesta sabe explicar. */
const ERRORS = [
  "empty",
  "unavailable",
  "character",
  "pricesChanged",
  "insufficient",
  "unverified",
  "full",
] as const satisfies readonly (PurchaseProblem | "full")[];
type CartError = (typeof ERRORS)[number];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return { title: t("shop.cart.title"), robots: { index: false, follow: false } };
}

export default async function CartPage({ searchParams }: PageProps<"/[locale]/cart">) {
  const [locale, t, query] = await Promise.all([getLocale(), getTranslator(), searchParams]);
  const session = await getSession();
  if (!session) redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/cart`)}`);
  const userId = Number(session.user.id);

  const [lines, shop, balance, characters] = await Promise.all([
    getCartLines(userId),
    loadShop(locale),
    getApBalance(userId),
    listCharacterOptions(userId),
  ]);
  const { items } = catalogAt(shop, new Date());
  const byId = new Map(items.map((item) => [item.id, item]));
  const rows = lines.map((line) => ({ ...line, item: byId.get(line.itemId) ?? null }));
  const total = rows.reduce(
    (sum, row) => sum + (row.item ? finalPrice(row.item) * row.quantity : 0),
    0,
  );
  const hasUnavailable = rows.some((row) => !row.item);

  const error = ERRORS.find((code) => code === query.error) as CartError | undefined;
  const added = typeof query.added === "string" ? byId.get(parseItemId(query.added) ?? 0) : null;
  const ordered = typeof query.ordered === "string" ? parseItemId(query.ordered) : null;

  return (
    <main className="flex-1 py-8 sm:py-12">
      <Container>
        <p className="text-sm">
          <Link href={`/${locale}/shop`} className="text-navy-700 font-semibold underline">
            <span aria-hidden="true">←&nbsp;</span>
            {t("shop.cart.continue")}
          </Link>
        </p>
        <h1 className="font-display text-navy-900 mt-4 text-4xl font-bold">
          {t("shop.cart.title")}
        </h1>

        <Notice
          locale={locale}
          t={t}
          error={error}
          added={added ?? null}
          ordered={ordered}
          updated={query.updated === "1"}
          removed={query.removed === "1"}
        />

        {rows.length === 0 ? (
          <p className="bg-parchment-50 border-parchment-300 mt-6 max-w-2xl rounded-lg border p-4">
            {t("shop.cart.empty")}{" "}
            <Link href={`/${locale}/shop`} className="text-navy-700 font-semibold underline">
              {t("shop.cart.browse")}
            </Link>
          </p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
            <section aria-labelledby="cart-items">
              <h2 id="cart-items" className="sr-only">
                {t("shop.cart.items")}
              </h2>
              <ul className="grid gap-3">
                {rows.map((row) => (
                  <li key={row.itemId}>
                    <CartRow
                      locale={locale}
                      t={t}
                      itemId={row.itemId}
                      quantity={row.quantity}
                      item={row.item}
                    />
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="cart-summary" className={PANEL}>
              <h2 id="cart-summary" className="font-display text-navy-900 text-2xl font-bold">
                {t("shop.cart.summary")}
              </h2>
              <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
                <dt>{t("shop.cart.total")}</dt>
                <dd className="text-navy-900 text-right text-lg font-bold">
                  {t("shop.price.amount", { amount: total })}
                </dd>
                <dt>{t("shop.cart.balance")}</dt>
                <dd className="text-right">{t("shop.price.amount", { amount: balance })}</dd>
                {total <= balance ? (
                  <>
                    <dt>{t("shop.cart.after")}</dt>
                    <dd className="text-right">
                      {t("shop.price.amount", { amount: balance - total })}
                    </dd>
                  </>
                ) : null}
              </dl>

              <Checkout
                locale={locale}
                t={t}
                total={total}
                balance={balance}
                verified={session.user.emailVerified}
                hasUnavailable={hasUnavailable}
                characters={characters}
              />
            </section>
          </div>
        )}
      </Container>
    </main>
  );
}

/** Mensaje del resultado de la última acción. */
function Notice({
  locale,
  t,
  error,
  added,
  ordered,
  updated,
  removed,
}: {
  locale: Locale;
  t: Translate;
  error: CartError | undefined;
  added: CatalogItem | null;
  ordered: number | null;
  updated: boolean;
  removed: boolean;
}) {
  if (error) {
    return (
      <p
        role="alert"
        className="border-danger-700 mt-6 max-w-2xl rounded-lg border-l-4 bg-white p-4"
      >
        {t(`shop.cart.errors.${error}`)}
      </p>
    );
  }
  let message: React.ReactNode = null;
  if (ordered) {
    message = (
      <>
        <strong>{t("shop.cart.ordered", { id: ordered })}</strong>{" "}
        <Link href={`/${locale}/account/purchases`} className="font-semibold underline">
          {t("shop.cart.seeOrders")}
        </Link>
      </>
    );
  } else if (added) {
    message = t("shop.cart.added", { name: added.name });
  } else if (updated) {
    message = t("shop.cart.updated");
  } else if (removed) {
    message = t("shop.cart.removed");
  }
  return message ? (
    <p role="status" className="mt-6 max-w-2xl rounded-lg bg-teal-100 p-4 text-teal-900">
      {message}
    </p>
  ) : null;
}

/** Una línea: imagen, nombre, precio, cantidad, subtotal y «Quitar». */
function CartRow({
  locale,
  t,
  itemId,
  quantity,
  item,
}: {
  locale: Locale;
  t: Translate;
  itemId: number;
  quantity: number;
  item: CatalogItem | null;
}) {
  const quantityId = `quantity-${itemId}`;
  return (
    <article
      aria-labelledby={`item-${itemId}`}
      className={`${PANEL} grid grid-cols-[4rem_minmax(0,1fr)] gap-x-4 gap-y-3 sm:grid-cols-[5rem_minmax(0,1fr)_auto]`}
    >
      {item ? (
        <ItemArt category={item.category} subcategory={item.subcategory} className="rounded-md" />
      ) : (
        <div aria-hidden="true" className="bg-parchment-300 aspect-square rounded-md" />
      )}
      <div className="min-w-0">
        <h3 id={`item-${itemId}`} className="text-navy-900 font-bold">
          {item ? (
            <Link href={itemHref(locale, itemId)} className="hover:underline">
              {item.name}
            </Link>
          ) : (
            t("shop.cart.unavailableName")
          )}
        </h3>
        {item ? (
          <ItemPrice item={item} t={t} />
        ) : (
          <p className="text-danger-700 font-semibold">{t("shop.cart.unavailable")}</p>
        )}
      </div>

      <div className="col-span-2 flex flex-wrap items-end gap-3 sm:col-span-1 sm:flex-col sm:items-end">
        {item ? (
          <>
            <form action={updateCartAction} className="flex items-end gap-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="itemId" value={itemId} />
              <div>
                <label htmlFor={quantityId} className="text-navy-900 block text-sm font-bold">
                  {t("shop.cart.quantity")}
                </label>
                <select id={quantityId} name="quantity" defaultValue={quantity} className={FIELD}>
                  {Array.from({ length: CART_MAX_QUANTITY }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={buttonStyles({ variant: "secondary" })}>
                {t("shop.cart.update")}
              </button>
            </form>
            <p className="text-ink-900 font-semibold">
              {t("shop.cart.subtotal", { amount: finalPrice(item) * quantity })}
            </p>
          </>
        ) : null}
        <form action={updateCartAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="quantity" value="0" />
          <button
            type="submit"
            aria-label={t("shop.cart.removeOne", {
              name: item?.name ?? t("shop.cart.unavailableName"),
            })}
            className={buttonStyles({ variant: "ghost" })}
          >
            {t("shop.cart.remove")}
          </button>
        </form>
      </div>
    </article>
  );
}

/** Personaje que recibe la compra y botón de pagar, o por qué aún no se puede. */
function Checkout({
  locale,
  t,
  total,
  balance,
  verified,
  hasUnavailable,
  characters,
}: {
  locale: Locale;
  t: Translate;
  total: number;
  balance: number;
  verified: boolean;
  hasUnavailable: boolean;
  characters: { id: number; name: string; server: string }[];
}) {
  const blocker = (message: string, link?: { href: string; label: string }) => (
    <div className="bg-parchment-50 border-parchment-300 mt-6 rounded-lg border p-4">
      <p>{message}</p>
      {link ? (
        <Link href={link.href} className={`${buttonStyles({ variant: "primary" })} mt-3`}>
          {link.label}
        </Link>
      ) : null}
    </div>
  );

  if (hasUnavailable) return blocker(t("shop.cart.removeUnavailable"));
  if (!verified) {
    return blocker(t("shop.cart.verifyFirst"), {
      href: `/${locale}/account`,
      label: t("shop.cart.goToAccount"),
    });
  }
  if (total > balance) {
    return blocker(t("shop.cart.missing", { amount: total - balance }), {
      href: `/${locale}/account/topups`,
      label: t("shop.cart.topUp"),
    });
  }
  if (characters.length === 0) return blocker(t("shop.cart.noCharacters"));

  return (
    <form action={checkoutAction} className="mt-6 grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="expectedTotal" value={total} />
      <div>
        <label htmlFor="cart-character" className="text-navy-900 mb-1 block text-sm font-bold">
          {t("shop.cart.character")}
        </label>
        <select
          id="cart-character"
          name="characterId"
          required
          aria-describedby="cart-character-hint"
          className={`${FIELD} w-full`}
        >
          {characters.map((character) => (
            <option key={character.id} value={character.id}>
              {t("shop.cart.characterOption", { name: character.name, server: character.server })}
            </option>
          ))}
        </select>
        <p id="cart-character-hint" className="text-ink-600 mt-1 text-xs">
          {t("shop.cart.characterHint")}
        </p>
      </div>
      <button type="submit" className={buttonStyles({ variant: "primary" })}>
        {t("shop.cart.pay", { amount: total })}
      </button>
      <p className="text-ink-600 text-xs">{t("shop.cart.terms")}</p>
    </form>
  );
}
