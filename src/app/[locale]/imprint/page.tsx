/** Página fija `imprint` (RF-10, RF-11). Ver `components/legal/StaticPageView.tsx`. */
import { renderStaticPage, staticPageMetadata } from "@/components/legal/StaticPageView";

// Bloqueante: el texto se lee de la base de datos al pedir la página.
export const instant = false;

export const generateMetadata = () => staticPageMetadata("imprint");

export default function Page() {
  return renderStaticPage("imprint");
}
