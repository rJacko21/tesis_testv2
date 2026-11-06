/** Página fija `terms` (RF-10, RF-11). Ver `components/legal/StaticPageView.tsx`. */
import { renderStaticPage, staticPageMetadata } from "@/components/legal/StaticPageView";

// Bloqueante: el texto se lee de la base de datos al pedir la página.
export const instant = false;

export const generateMetadata = () => staticPageMetadata("terms");

export default function Page() {
  return renderStaticPage("terms");
}
