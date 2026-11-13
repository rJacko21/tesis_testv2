"use client";

/**
 * Comportamiento de la cabecera, en un solo componente cliente que no pinta
 * nada.
 *
 * Antes, el menú móvil, el submenú Comunidad y el selector de idioma eran
 * Client Components con su propio estado y sus propios efectos. Ahora el
 * marcado es del servidor y el navegador hace casi todo:
 * - **Menú móvil:** el botón abre el `<dialog>` con `commandfor`/`command`
 *   (Invoker Commands), sin JavaScript propio. El bloqueo del scroll de
 *   fondo es CSS (`html:has(#mobile-menu[open])`).
 * - **Desplegables:** `<details>` nativos.
 *
 * Aquí queda solo lo que el navegador no hace:
 * - Abrir el menú en navegadores sin Invoker Commands (Safari < 26.2).
 * - `aria-expanded` del botón del menú.
 * - Cerrar el menú al pulsar fuera del panel (`closedby="any"` aún no está
 *   en todos los navegadores).
 * - Cerrar los `<details>` con Escape, devolviendo el foco al `<summary>`
 *   (WCAG 2.1.2), o al pulsar o mover el foco fuera de ellos.
 * - El botón de tema (`ThemeToggle`): cambia `data-theme` en `<html>` y guarda
 *   la elección (M-44).
 * - Al navegar: cerrar todo y marcar el enlace de la página actual con
 *   `aria-current`, porque la cabecera vive en el layout y Next no la vuelve
 *   a pintar al cambiar de página.
 *
 * Los oyentes se ponen una sola vez en la cabecera (delegación de eventos).
 *
 * @see RF-02 · ADR-15 (presupuesto de JavaScript) · ADR-16 (TBT)
 */
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { THEME_STORAGE_KEY } from "@/lib/theme";

import { MOBILE_MENU_ID } from "./nav-types";

export function HeaderBehavior() {
  const pathname = usePathname();

  useEffect(() => {
    const header = document.querySelector<HTMLElement>("header[data-site-header]");
    const dialog = document.getElementById(MOBILE_MENU_ID) as HTMLDialogElement | null;
    if (!header || !dialog) return;
    const opener = header.querySelector<HTMLButtonElement>(
      `[commandfor="${MOBILE_MENU_ID}"][command="show-modal"]`,
    );
    const invokers = "command" in HTMLButtonElement.prototype;

    const sync = () => opener?.setAttribute("aria-expanded", String(dialog.open));
    const root = document.documentElement;
    const themeButtons = header.querySelectorAll("[data-theme-toggle]");
    const syncTheme = () => {
      const dark = String(root.dataset.theme === "dark");
      for (const button of themeButtons) button.setAttribute("aria-pressed", dark);
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element;
      // Pulsar en el fondo (el propio <dialog>, fuera del panel) cierra.
      if (target === dialog) dialog.close();
      if (target.closest("[data-theme-toggle]")) {
        const theme = root.dataset.theme === "dark" ? "light" : "dark";
        root.dataset.theme = theme;
        try {
          localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
          // Sin `localStorage` (modo privado estricto) el cambio dura hasta recargar.
        }
        syncTheme();
      }
      if (!invokers) {
        const command = target.closest("button[commandfor]")?.getAttribute("command");
        if (command === "show-modal") dialog.showModal();
        if (command === "close") dialog.close();
      }
      // El comando del botón se ejecuta después del clic.
      setTimeout(sync);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const details = (event.target as Element).closest("details");
      if (details?.open) {
        details.open = false;
        details.querySelector("summary")?.focus();
      }
    };
    const closeOutside = (inside: Node | null) => {
      for (const details of header.querySelectorAll("details[open]")) {
        if (!inside || !details.contains(inside)) details.removeAttribute("open");
      }
    };
    const onPointerDown = (event: PointerEvent) => closeOutside(event.target as Node);
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget) closeOutside(event.relatedTarget as Node);
    };

    header.addEventListener("click", onClick);
    header.addEventListener("keydown", onKeyDown);
    header.addEventListener("focusout", onFocusOut);
    document.addEventListener("pointerdown", onPointerDown);
    // Escape cierra el diálogo sin pasar por un clic.
    dialog.addEventListener("close", sync);
    sync();
    syncTheme();
    return () => {
      header.removeEventListener("click", onClick);
      header.removeEventListener("keydown", onKeyDown);
      header.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("close", sync);
    };
  }, []);

  // Al navegar: se cierra todo y se marca el enlace de la página actual.
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("header[data-site-header]");
    if (!header) return;
    (document.getElementById(MOBILE_MENU_ID) as HTMLDialogElement | null)?.close();
    for (const details of header.querySelectorAll("details[open]")) details.removeAttribute("open");
    for (const link of header.querySelectorAll<HTMLAnchorElement>("a[data-nav]")) {
      const href = link.getAttribute("href") ?? "";
      if (pathname === href || pathname.startsWith(`${href}/`)) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  }, [pathname]);

  return null;
}
