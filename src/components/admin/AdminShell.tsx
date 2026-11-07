/**
 * Marco del panel de administración (RF-12): título y menú con las zonas
 * que abren los roles de quien lo ve (`permissions.ts`).
 *
 * Mismo patrón que «Mi cuenta» (`AccountShell`): Server Component, zona
 * actual con `aria-current="page"` y, en móvil, una fila que se desplaza
 * dentro de su caja.
 *
 * @see RF-12 · M-35
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/ui";
import type { Locale } from "@/config/locales";
import type { Translate } from "@/i18n/translator";
import { type AdminArea, areasFor } from "@/lib/admin/permissions";
import { adminPath } from "@/lib/admin/staff";

export interface AdminShellProps {
  locale: Locale;
  t: Translate;
  roles: readonly string[];
  /** Zona actual; `null` en la portada del panel. */
  current: AdminArea | null;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}

const LINK =
  "border-parchment-300 text-navy-900 hover:border-navy-700 aria-[current]:bg-navy-900 aria-[current]:border-navy-900 inline-flex min-h-11 items-center rounded-full border bg-white px-4 font-semibold aria-[current]:text-white";

export function AdminShell({ locale, t, roles, current, title, intro, children }: AdminShellProps) {
  // «Roles» no es una página: se cambian en la ficha de cada cuenta.
  const areas = areasFor(roles).filter((area) => area !== "roles");
  return (
    <main className="flex-1 py-8 sm:py-12">
      <Container>
        <p className="text-ink-600 text-sm font-bold tracking-wide uppercase">{t("admin.title")}</p>
        <nav aria-label={t("admin.nav.label")} className="-mx-4 mt-3 overflow-x-auto px-4 pb-1">
          <ul className="flex min-w-max gap-2">
            <li>
              <Link
                href={adminPath(locale)}
                aria-current={current === null ? "page" : undefined}
                className={LINK}
              >
                {t("admin.nav.home")}
              </Link>
            </li>
            {areas.map((area) => (
              <li key={area}>
                <Link
                  href={adminPath(locale, area)}
                  aria-current={area === current ? "page" : undefined}
                  className={LINK}
                >
                  {t(`admin.nav.${area as "users" | "audit"}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <h1 className="font-display text-navy-900 mt-6 text-4xl font-bold break-words">{title}</h1>
        {intro ? <div className="text-ink-600 mt-2 max-w-2xl text-lg">{intro}</div> : null}
        <div className="mt-6">{children}</div>
      </Container>
    </main>
  );
}

/** Resultado de la última acción (`?done=` o `?error=`). */
export function AdminNotice({ tone, children }: { tone: "done" | "error"; children: ReactNode }) {
  return tone === "error" ? (
    <p role="alert" className="border-danger-700 mb-6 max-w-2xl rounded-lg border-l-4 bg-white p-4">
      {children}
    </p>
  ) : (
    <p role="status" className="mb-6 max-w-2xl rounded-lg bg-teal-100 p-4 text-teal-900">
      {children}
    </p>
  );
}

/** Tabla con desplazamiento propio en móvil, como el ranking (M-19). */
export function AdminTable({
  id,
  caption,
  minWidth = "40rem",
  children,
}: {
  id: string;
  caption: string;
  minWidth?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="region"
      aria-labelledby={id}
      tabIndex={0}
      className="border-parchment-300 overflow-x-auto rounded-lg border bg-white"
    >
      <table className="w-full text-sm" style={{ minWidth }}>
        <caption id={id} className="sr-only">
          {caption}
        </caption>
        {children}
      </table>
    </div>
  );
}

export const CELL = "px-3 py-2.5 text-left align-top";
export const HEAD = "bg-parchment-100 text-navy-900";
