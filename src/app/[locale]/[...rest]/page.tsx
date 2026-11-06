/**
 * Captura cualquier ruta que no exista dentro de un idioma y muestra la
 * 404 traducida de `[locale]/not-found.tsx`, en lugar de la 404 genérica
 * en inglés de Next.js.
 */
import { notFound } from "next/navigation";

export default function CatchAll(): never {
  notFound();
}
