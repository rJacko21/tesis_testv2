"use client";

/**
 * Cierra un `<details>` desplegable como se espera de un menú:
 * - con Escape, devolviendo el foco al `<summary>` (WCAG 2.1.2, sin trampa);
 * - al pulsar o mover el foco fuera de él;
 * - al cambiar de página (la navegación de Next no recarga la cabecera).
 *
 * Abrir y recorrer el menú sigue siendo nativo de `<details>`, así que
 * funciona aunque este JavaScript aún no se haya cargado.
 *
 * @see RF-02 CA: "puedo abrirlo, recorrerlo y cerrarlo" con teclado.
 */
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function useDismissableDetails<T extends HTMLDetailsElement>() {
  const ref = useRef<T>(null);
  const pathname = usePathname();

  // Al navegar, se cierra.
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const details = ref.current;
    if (!details) return;

    const close = (returnFocus: boolean) => {
      if (!details.open) return;
      details.open = false;
      if (returnFocus) details.querySelector("summary")?.focus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!details.contains(event.target as Node)) close(false);
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget && !details.contains(event.relatedTarget as Node)) close(false);
    };

    details.addEventListener("keydown", onKeyDown);
    details.addEventListener("focusout", onFocusOut);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      details.removeEventListener("keydown", onKeyDown);
      details.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return ref;
}
