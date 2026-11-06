/**
 * Proxy de Next.js (antes "middleware"): se ejecuta antes de cada petición
 * de página.
 *
 * Responsabilidad única: garantizar que toda URL lleva un idioma admitido
 * (ver `src/i18n/routing.ts`) y recordar el idioma visitado en una cookie,
 * para que la próxima visita a `/` vaya directamente a él.
 */
import { type NextRequest, NextResponse } from "next/server";

import { LOCALE_COOKIE, negotiateLocale } from "@/i18n/negotiate";
import { resolveLocaleRoute } from "@/i18n/routing";

/** Un año: el idioma elegido rara vez cambia. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function proxy(request: NextRequest): NextResponse {
  const preferred = negotiateLocale(
    request.cookies.get(LOCALE_COOKIE)?.value,
    request.headers.get("accept-language"),
  );
  const route = resolveLocaleRoute(request.nextUrl.pathname, preferred);

  if (route.action === "redirect") {
    const url = request.nextUrl.clone();
    const [pathname = "/", search] = route.pathname.split("?");
    url.pathname = pathname;
    // Parámetros que añade una ruta antigua (`/rankings?area=sea`), junto a los que ya traía.
    for (const [key, value] of new URLSearchParams(search)) url.searchParams.set(key, value);
    const response = NextResponse.redirect(url, route.status);
    // La caché compartida no debe guardar una redirección que depende del visitante.
    if (route.status === 307) response.headers.set("Vary", "Accept-Language, Cookie");
    return response;
  }

  const response = NextResponse.next();
  if (request.cookies.get(LOCALE_COOKIE)?.value !== route.locale) {
    // Cookie funcional (preferencia de idioma): no requiere consentimiento (RF-11).
    response.cookies.set(LOCALE_COOKIE, route.locale, {
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  // Todo menos la API, los ficheros internos de Next y los ficheros con extensión (imágenes, robots.txt…).
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
