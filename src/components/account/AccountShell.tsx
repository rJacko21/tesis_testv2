/**
 * Marco común de las páginas de «Mi cuenta»: título y navegación entre
 * secciones (resumen, compras, recargas, personajes, canjear código,
 * seguridad y privacidad).
 *
 * Es un Server Component: la sección actual llega como prop y se marca con
 * `aria-current="page"`. En móvil, las secciones forman una fila que se
 * desplaza en horizontal dentro de su caja, sin mover la página.
 *
 * @see RF-04
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/ui";
import type { Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";
import { type AccountSection, accountPath } from "@/lib/account/session";

const SECTIONS: { section: AccountSection; key: Parameters<Translate>[0] }[] = [
  { section: "", key: "account.nav.summary" },
  { section: "purchases", key: "account.nav.purchases" },
  { section: "topups", key: "account.nav.topups" },
  { section: "characters", key: "account.nav.characters" },
  { section: "redeem", key: "account.nav.redeem" },
  { section: "security", key: "account.nav.security" },
  { section: "privacy", key: "account.nav.privacy" },
];

export interface AccountShellProps {
  locale: Locale;
  t: Translate;
  current: AccountSection;
  title: string;
  /** Texto bajo el título. */
  intro?: ReactNode;
  children: ReactNode;
}

export function AccountShell({ locale, t, current, title, intro, children }: AccountShellProps) {
  return (
    <main className="flex-1 py-8 sm:py-12">
      <Container>
        <nav aria-label={t("account.nav.label")} className="-mx-4 overflow-x-auto px-4 pb-1">
          <ul className="flex min-w-max gap-2">
            {SECTIONS.map(({ section, key }) => (
              <li key={section || "summary"}>
                <Link
                  href={accountPath(locale, section)}
                  aria-current={section === current ? "page" : undefined}
                  className="border-parchment-300 text-heading hover:border-strong aria-[current]:bg-navy-900 aria-[current]:border-navy-900 bg-surface inline-flex min-h-11 items-center rounded-full border px-4 font-semibold aria-[current]:text-white"
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <h1 className="font-display text-heading mt-6 text-4xl font-bold">{title}</h1>
        {intro ? <div className="text-ink-600 mt-2 max-w-2xl text-lg">{intro}</div> : null}
        <div className="mt-6">{children}</div>
      </Container>
    </main>
  );
}

/** Mensaje de lista vacía: explica qué aparecerá ahí (F-46). */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="bg-parchment-50 border-parchment-300 max-w-2xl rounded-lg border p-4">
      {children}
    </p>
  );
}
