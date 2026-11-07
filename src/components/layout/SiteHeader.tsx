/**
 * Cabecera del sitio con la navegación completa.
 *
 * - Escritorio (≥ 1024 px): enlaces en línea, submenú Comunidad, Jugar ahora
 *   destacado e Iniciar sesión.
 * - Móvil: botón de menú que abre un `<dialog>` modal (`MobileMenu`).
 * - El selector de idioma se ve siempre: en la web original solo había EN y
 *   DE, y no estaba en el login (F-01, F-06).
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
  SIGN_IN,
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
  const signIn = resolve(SIGN_IN);
  const externalLabel = t("nav.externalSite");

  return (
    <header data-site-header className="bg-navy-900 text-white">
      <Container className="flex items-center gap-2 py-2">
        <Link
          href={`/${locale}`}
          className="font-display text-gold-300 mr-auto flex min-h-11 items-center text-2xl font-bold tracking-wide lg:mr-6"
        >
          Florensia
        </Link>

        <nav aria-label={t("nav.label")} className="hidden flex-1 items-center gap-1 lg:flex">
          <ul className="flex items-center gap-1">
            {primary.map((link) => (
              <li key={link.href}>
                <NavLinkItem
                  link={link}
                  externalLabel={externalLabel}
                  className="hover:bg-navy-700 aria-[current]:bg-navy-700 flex min-h-11 items-center rounded px-3 font-semibold"
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
          <ul className="ml-auto flex items-center gap-2">
            <li>
              <NavLinkItem
                link={playNow}
                externalLabel={externalLabel}
                className={buttonStyles({})}
              />
            </li>
            <li>
              <NavLinkItem
                link={signIn}
                externalLabel={externalLabel}
                className={buttonStyles({ variant: "onDark" })}
              />
            </li>
          </ul>
        </nav>

        <LocaleSwitcher
          current={locale}
          label={t("localeSwitcher.label")}
          currentLabel={t("localeSwitcher.current", { language: LOCALE_NAMES[locale] })}
        />
        <MobileMenu
          openLabel={t("nav.openMenu")}
          closeLabel={t("nav.closeMenu")}
          navLabel={t("nav.label")}
          primary={primary}
          communityLabel={t("nav.community")}
          community={community}
          playNow={playNow}
          signIn={signIn}
          externalLabel={externalLabel}
          buttonClasses={{
            primary: buttonStyles({ size: "lg" }),
            secondary: buttonStyles({ size: "lg", variant: "onDark" }),
          }}
        />
        <HeaderBehavior />
      </Container>
    </header>
  );
}
