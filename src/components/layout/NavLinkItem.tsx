/**
 * Enlace de navegación, interno (Next `Link`, con precarga) o externo.
 *
 * Los externos se abren en la misma pestaña (WCAG 3.2.5: sin cambios de
 * contexto inesperados), llevan `rel="noopener"` y anuncian que salen del
 * sitio con texto para lectores de pantalla además del icono.
 */
import Link from "next/link";
import type { ReactNode } from "react";

import type { ResolvedLink } from "./nav-types";

export interface NavLinkItemProps {
  link: ResolvedLink;
  className?: string;
  /** Texto accesible para enlaces externos, p. ej. "(sitio externo)". */
  externalLabel: string;
  /** Marca el enlace de la página actual (`aria-current="page"`). */
  current?: boolean;
  children?: ReactNode;
}

export function NavLinkItem({
  link,
  className,
  externalLabel,
  current,
  children,
}: NavLinkItemProps) {
  if (link.external) {
    return (
      <a href={link.href} rel="noopener" className={className}>
        {children ?? link.label}
        <svg aria-hidden="true" viewBox="0 0 16 16" className="ml-1 inline size-3.5 align-baseline">
          <path
            fill="currentColor"
            d="M9 2h5v5h-1.5V4.6L7.3 9.8 6.2 8.7l5.2-5.2H9V2ZM3 4h4v1.5H4.5v6h6V9H12v4H3V4Z"
          />
        </svg>
        <span className="sr-only"> {externalLabel}</span>
      </a>
    );
  }
  return (
    <Link href={link.href} className={className} aria-current={current ? "page" : undefined}>
      {children ?? link.label}
    </Link>
  );
}
