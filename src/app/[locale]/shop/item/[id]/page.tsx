/**
 * Ficha de un artículo de la tienda (RF-05, F-44).
 *
 * `/es/shop/item/12`: cada artículo tiene por fin una URL propia que se
 * puede compartir e indexar. La antigua `/shop/detail/index/{id}` redirige
 * aquí (`i18n/routing.ts`).
 *
 * - Nombre completo, descripción, duración, si se puede regalar, si es un
 *   lote o una edición limitada, todo en texto.
 * - Si está rebajado: precio original tachado, descuento y hasta cuándo
 *   dura la campaña, con su nombre (F-16).
 * - Migas de pan en la página y en datos estructurados.
 *
 * - «Añadir a la cesta» con la cantidad. Sin sesión, lleva a iniciar sesión
 *   y vuelve a la ficha (T-20).
 *
 * Ruta bloqueante (`instant = false`), como el detalle de noticia: un
 * artículo que no existe o no está a la venta responde 404 real.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { JsonLd } from "@/components/seo/JsonLd";
import { ItemArt } from "@/components/shop/ItemArt";
import { ItemBadges, validityLabel } from "@/components/shop/ItemBadges";
import { ItemPrice } from "@/components/shop/ItemPrice";
import { buttonStyles, Container } from "@/components/ui";
import type { Locale } from "@/config/locales";
import { languageAlternates } from "@/config/site";
import { getLocale, getTranslator } from "@/i18n/server";
import { CART_MAX_QUANTITY } from "@/lib/cart";
import { addToCartAction } from "@/lib/cart-actions";
import { formatDate, isoDate } from "@/lib/format";
import { tryLoad } from "@/lib/safe";
import { loadShop } from "@/lib/shop";
import { catalogAt } from "@/lib/shop-catalog";
import { itemHref, parseItemId, shopHref } from "@/lib/shop-filters";
import { breadcrumbs } from "@/lib/structured-data";

export const instant = false;

type Props = PageProps<"/[locale]/shop/item/[id]">;

/** El artículo a la venta ahora con sus categorías; `null` si no existe o no se vende. */
async function findItem(locale: Locale, rawId: string) {
  const id = parseItemId(rawId);
  if (id === null) return { ok: true as const, data: null };
  // El precio vigente depende de la hora de la petición.
  await connection();
  return tryLoad("el artículo", async () => {
    const { categories, items } = catalogAt(await loadShop(locale), new Date());
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return null;
    const category = categories.find((c) => c.slug === item.category)!;
    const subcategory = category.children.find((c) => c.slug === item.subcategory) ?? null;
    return { item, category, subcategory };
  });
}

/** Primeras frases de la descripción, para la meta descripción. */
const summary = (text: string) => (text.length <= 155 ? text : `${text.slice(0, 154).trimEnd()}…`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ id }, locale] = await Promise.all([params, getLocale()]);
  const found = await findItem(locale, id);
  if (!found.ok || !found.data) return {};
  const { item } = found.data;
  return {
    title: item.name,
    description: summary(item.description),
    alternates: {
      canonical: itemHref(locale, item.id),
      languages: languageAlternates(`/shop/item/${item.id}`),
    },
  };
}

export default async function ShopItemPage({ params }: Props) {
  const [{ id }, locale, t] = await Promise.all([params, getLocale(), getTranslator()]);
  const found = await findItem(locale, id);
  if (found.ok && !found.data) notFound();

  if (!found.ok) {
    return (
      <main className="flex-1 py-8 sm:py-12">
        <Container>
          <p role="alert" className="bg-parchment-50 border-gold-500 rounded-lg border p-4">
            {t("shop.unavailable")}
          </p>
        </Container>
      </main>
    );
  }

  const { item, category, subcategory } = found.data!;
  const trail: [string, string][] = [
    [t("shop.title"), shopHref(locale, {})],
    [category.name, shopHref(locale, { category: category.slug })],
    ...(subcategory
      ? [
          [
            subcategory.name,
            shopHref(locale, { category: category.slug, subcategory: subcategory.slug }),
          ] as [string, string],
        ]
      : []),
  ];
  const details: [string, string][] = [
    [t("shop.item.validity"), validityLabel(item.validityDays, t)],
    [t("shop.item.giftable"), item.isGiftable ? t("shop.item.yes") : t("shop.item.no")],
  ];

  return (
    <main className="flex-1 py-8 sm:py-12">
      <Container>
        <JsonLd
          data={breadcrumbs([
            ["Florensia", `/${locale}`],
            ...trail,
            [item.name, itemHref(locale, item.id)],
          ])}
        />
        <nav aria-label={t("shop.item.breadcrumb")} className="text-sm">
          <ol className="text-ink-600 flex flex-wrap gap-x-2 gap-y-1">
            {trail.map(([name, href]) => (
              <li key={href} className="after:ml-2 after:content-['/']">
                <Link href={href} className="text-navy-700 underline-offset-2 hover:underline">
                  {name}
                </Link>
              </li>
            ))}
            <li aria-current="page" className="text-ink-900">
              {item.name}
            </li>
          </ol>
        </nav>

        <article className="mt-6 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
          <ItemArt
            category={item.category}
            subcategory={item.subcategory}
            className="rounded-panel shadow-panel mx-auto w-full max-w-sm md:max-w-none"
          />
          <div className="flex flex-col gap-4">
            <ItemBadges item={item} t={t} />
            <h1 className="font-display text-navy-900 text-3xl leading-tight font-bold sm:text-4xl">
              {item.name}
            </h1>
            <ItemPrice item={item} t={t} size="lg" />
            {item.saleEndsAt ? (
              <p className="text-ink-900">
                <time dateTime={isoDate(item.saleEndsAt)}>
                  {item.campaign
                    ? t("shop.item.saleUntil", {
                        campaign: item.campaign,
                        date: formatDate(locale, item.saleEndsAt),
                      })
                    : t("shop.item.saleUntilNoName", {
                        date: formatDate(locale, item.saleEndsAt),
                      })}
                </time>
              </p>
            ) : null}
            <p className="text-ink-900 text-lg">{item.description}</p>

            <section aria-labelledby="item-details">
              <h2 id="item-details" className="text-navy-900 text-lg font-bold">
                {t("shop.item.details")}
              </h2>
              <dl className="border-parchment-300 mt-2 divide-y rounded-lg border bg-white">
                {details.map(([term, value]) => (
                  <div
                    key={term}
                    className="border-parchment-300 flex justify-between gap-4 px-4 py-2"
                  >
                    <dt className="text-ink-600">{term}</dt>
                    <dd className="text-ink-900 font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <form
              action={addToCartAction}
              className="bg-parchment-50 border-parchment-300 flex flex-wrap items-end gap-3 rounded-lg border p-4"
            >
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="itemId" value={item.id} />
              <div>
                <label
                  htmlFor="item-quantity"
                  className="text-navy-900 mb-1 block text-sm font-bold"
                >
                  {t("shop.cart.quantity")}
                </label>
                <select
                  id="item-quantity"
                  name="quantity"
                  defaultValue="1"
                  className="border-parchment-300 text-ink-900 focus:border-navy-700 min-h-11 rounded-lg border bg-white px-3"
                >
                  {Array.from({ length: CART_MAX_QUANTITY }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={buttonStyles({ variant: "primary" })}>
                {t("shop.item.addToCart")}
              </button>
              <Link
                href={`/${locale}/cart`}
                className="text-navy-700 min-h-11 content-center font-semibold underline underline-offset-2"
              >
                {t("shop.cart.view")}
              </Link>
            </form>
            <p>
              <Link
                href={shopHref(locale, { category: category.slug })}
                className="text-navy-700 font-semibold underline underline-offset-2"
              >
                <span aria-hidden="true">←&nbsp;</span>
                {t("shop.item.back", { category: category.name })}
              </Link>
            </p>
          </div>
        </article>
      </Container>
    </main>
  );
}
