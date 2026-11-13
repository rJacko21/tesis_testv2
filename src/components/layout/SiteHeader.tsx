/**
 * Cabecera del sitio con la navegación completa.
 *
 * - Escritorio (≥ 1024 px): enlaces en línea, submenú Comunidad, Jugar ahora
 *   destacado, Recargar AP e Iniciar sesión o Mi cuenta (`SessionLinks`).
 * - Móvil: botón de menú que abre un `<dialog>` modal (`MobileMenu`).
 * - El selector de idioma se ve siempre: en la web original solo había EN y
 *   DE, y no estaba en el login (F-01, F-06).
 *
 * - Fija arriba y translúcida, como el panel del launcher (M-44). Es el único
 *   sitio de la página con `backdrop-filter`: desenfocar muchas capas hace
 *   que el scroll vaya a tirones en móviles modestos.
 * - Botón de tema claro u oscuro (`ThemeToggle`).
 *
 * Es un Server Component, igual que los menús: traduce aquí los textos y
 * solo el selector de idioma y `HeaderBehavior` llegan al navegador como
 * JavaScript. Así los catálogos de idioma no llegan al navegador.
 *
 * @see RF-02 Navegación global
 */
import Link from "next/link";

import { buttonStyles, Container } from "@/components/ui";
import { LOCALE_NAMES } from "@/config/locales";
import {
  COMMUNITY_LINKS,
  PLAY_NOW,
  PRIMARY_LINKS,
  localizedHref,
  type NavLink,
} from "@/config/navigation";
import { getLocale, getTranslator } from "@/i18n/server";

import { CommunityMenu } from "./CommunityMenu";
import { HeaderBehavior } from "./HeaderBehavior";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileMenu } from "./MobileMenu";
import type { ResolvedLink } from "./nav-types";
import { NavLinkItem } from "./NavLinkItem";
import { SessionLinks } from "./SessionLinks";
import { ThemeToggle } from "./ThemeToggle";

/** Ancla del logotipo del juego, en SVG en línea (0 peticiones). */
function AnchorIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-azure-400 size-6 shrink-0"
    >
      <circle cx="12" cy="5" r="2.2" />
      <path d="M12 7.2V21M8 11h8M4 14c.6 4 3.8 7 8 7s7.4-3 8-7M4 14l-1.5 2M4 14l2 1.4M20 14l1.5 2M20 14l-2 1.4" />
    </svg>
  );
}

export async function SiteHeader() {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);
  const resolve = (link: NavLink): ResolvedLink => ({
    label: t(link.label),
    href: localizedHref(locale, link),
    external: link.external,
  });

  const primary = PRIMARY_LINKS.map(resolve);
  const community = COMMUNITY_LINKS.map(resolve);
  const playNow = resolve(PLAY_NOW);
  const sessionLabels = {
    topUp: t("nav.topUp"),
    signIn: t("nav.login"),
    account: t("nav.account"),
  };
  const externalLabel = t("nav.externalSite");

  return (
    <header
      data-site-header
      className="border-azure-400/25 bg-navy-950/85 sticky top-0 z-40 border-b text-white backdrop-blur-md"
    >
      <Container className="flex items-center gap-2 py-2">
        <Link
          href={`/${locale}`}
          className="font-display text-gold-300 mr-auto flex min-h-11 items-center gap-2 text-xl font-bold tracking-wide sm:text-2xl lg:mr-1 lg:max-2xl:text-xl 2xl:mr-4"
        >
          <AnchorIcon />
          Florensia
        </Link>

        <nav
          aria-label={t("nav.label")}
          className="hidden min-w-0 flex-1 items-center gap-1 lg:flex"
        >
          <ul className="flex items-center 2xl:gap-1">
            {primary.map((link) => (
              <li key={link.href}>
                <NavLinkItem
                  link={link}
                  externalLabel={externalLabel}
                  className="hover:bg-navy-700 aria-[current]:bg-navy-700 flex min-h-11 items-center rounded px-2 text-[0.9375rem] font-semibold 2xl:px-3 2xl:text-base"
                />
              </li>
            ))}
            <li>
              <CommunityMenu
                label={t("nav.community")}
                links={community}
                externalLabel={externalLabel}
              />
            </li>
          </ul>
          <ul className="ml-auto flex items-center gap-1 2xl:gap-2">
            <li>
              <NavLinkItem
                link={playNow}
                externalLabel={externalLabel}
                className={buttonStyles({
                  className: "px-3 text-[0.9375rem] leading-tight 2xl:px-5 2xl:text-base",
                })}
              />
            </li>
            <SessionLinks
              locale={locale}
              labels={sessionLabels}
              listItems
              classes={{
                topUp:
                  "text-gold-300 hover:bg-navy-700 aria-[current]:bg-navy-700 flex min-h-11 items-center gap-1.5 rounded px-2 text-[0.9375rem] leading-tight font-semibold 2xl:px-3 2xl:text-base",
                session: buttonStyles({
                  variant: "onDark",
                  className: "px-3 text-[0.9375rem] leading-tight 2xl:px-5 2xl:text-base",
                }),
              }}
            />
          </ul>
        </nav>

        {/* «Recargar AP» siempre a la vista: en móvil, abreviado junto al menú. */}
        <div className="lg:hidden">
          <SessionLinks
            locale={locale}
            labels={sessionLabels}
            compactTopUp
            classes={{
              topUp:
                "text-gold-300 hover:bg-navy-700 aria-[current]:bg-navy-700 flex min-h-11 items-center gap-1 rounded px-2 font-bold",
              session: "",
            }}
          />
        </div>
        <LocaleSwitcher
          current={locale}
          label={t("localeSwitcher.label")}
          currentLabel={t("localeSwitcher.current", { language: LOCALE_NAMES[locale] })}
        />
        <ThemeToggle label={t("theme.dark")} className="hidden sm:grid" />
        <MobileMenu
          themeLabel={t("theme.dark")}
          openLabel={t("nav.openMenu")}
          closeLabel={t("nav.closeMenu")}
          navLabel={t("nav.label")}
          primary={primary}
          communityLabel={t("nav.community")}
          community={community}
          playNow={playNow}
          session={
            <SessionLinks
              locale={locale}
              labels={sessionLabels}
              classes={{
                topUp: buttonStyles({ size: "lg", variant: "onDark" }),
                session: buttonStyles({ size: "lg", variant: "onDark" }),
              }}
            />
          }
          externalLabel={externalLabel}
          buttonClasses={{
            primary: buttonStyles({ size: "lg" }),
          }}
        />
        <HeaderBehavior />
      </Container>
    </header>
  );
}
