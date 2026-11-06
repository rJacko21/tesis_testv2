/**
 * Submenú «Comunidad» de escritorio.
 *
 * `<details>` nativo (se abre con Intro o Espacio y se recorre con Tab) y
 * `HeaderBehavior` para cerrarlo con Escape o al salir de él. No es
 * un `role="menu"`: es navegación, y una lista de enlaces es lo que un
 * lector de pantalla espera aquí (patrón «disclosure» de WAI-ARIA).
 *
 * @see RF-02
 */
import type { ResolvedLink } from "./nav-types";
import { NavLinkItem } from "./NavLinkItem";

export interface CommunityMenuProps {
  label: string;
  links: readonly ResolvedLink[];
  externalLabel: string;
}

export function CommunityMenu({ label, links, externalLabel }: CommunityMenuProps) {
  return (
    <details className="group relative">
      <summary className="hover:bg-navy-700 flex min-h-11 cursor-pointer list-none items-center gap-1 rounded px-3 font-semibold [&::-webkit-details-marker]:hidden">
        {label}
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="size-4 transition-transform group-open:rotate-180"
        >
          <path fill="currentColor" d="m4 6 4 4 4-4H4Z" />
        </svg>
      </summary>
      <ul className="text-ink-900 absolute left-0 z-20 mt-1 min-w-56 rounded-md bg-white py-1 shadow-lg">
        {links.map((link) => (
          <li key={link.href}>
            <NavLinkItem
              link={link}
              externalLabel={externalLabel}
              className="aria-[current]:text-navy-700 block px-4 py-2.5 hover:bg-sky-100 aria-[current]:font-bold"
            />
          </li>
        ))}
      </ul>
    </details>
  );
}
