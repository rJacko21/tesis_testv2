/**
 * «Recargar AP» e «Iniciar sesión» / «Mi cuenta» de la cabecera.
 *
 * La cabecera es estática (se prerenderiza con cada página), pero estos dos
 * enlaces dependen de si hay sesión. Van en un `<Suspense>`: el HTML estático
 * trae la versión sin sesión y el servidor envía la buena en la misma
 * respuesta (Partial Prerendering de Next). Así la página sigue saliendo de la
 * caché y no hace falta JavaScript propio.
 *
 * Solo se mira si existe la cookie de sesión, sin consultar la base de datos:
 * es barato y basta para elegir el enlace. Si la sesión ya no vale (caducó o
 * se cerró desde otro sitio), «Mi cuenta» lleva a iniciar sesión, porque las
 * páginas de cuenta sí la comprueban.
 *
 * Sin sesión, «Recargar AP» lleva a iniciar sesión y de vuelta a la recarga
 * (`?next=`).
 *
 * @see RF-02 · RF-03 · RF-06
 */
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";

import { SESSION_COOKIE } from "@/lib/auth/constants";

export interface SessionLinksProps {
  locale: string;
  labels: { topUp: string; signIn: string; account: string };
  classes: { topUp: string; session: string };
  /** Cada enlace en su `<li>` (cabecera de escritorio). */
  listItems?: boolean;
  /**
   * Solo «Recargar AP», con el texto visible abreviado a «AP» (barra del
   * móvil, donde no cabe entero). El nombre accesible sigue siendo el
   * completo, que contiene el visible (WCAG 2.5.3).
   */
  compactTopUp?: boolean;
}

/** En HTTPS el navegador la guarda con el prefijo `__Secure-`. */
const SESSION_COOKIES = [SESSION_COOKIE, `__Secure-${SESSION_COOKIE}`];

/** Destinos de los dos enlaces, con o sin sesión. */
export function sessionHrefs(locale: string, signedIn: boolean) {
  const topUp = `/${locale}/topup`;
  return signedIn
    ? { topUp, session: `/${locale}/account` }
    : { topUp: `/${locale}/sign-in?next=${topUp}`, session: `/${locale}/sign-in` };
}

function Links({
  locale,
  labels,
  classes,
  listItems,
  compactTopUp,
  signedIn,
}: SessionLinksProps & {
  signedIn: boolean;
}) {
  const href = sessionHrefs(locale, signedIn);
  const items = [
    <Link key="topup" href={href.topUp} className={classes.topUp} data-nav="">
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0">
        <circle cx="10" cy="10" r="8" fill="currentColor" opacity=".25" />
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path fill="currentColor" d="M9.2 5.5h1.6v3.7h3.7v1.6h-3.7v3.7H9.2v-3.7H5.5V9.2h3.7z" />
      </svg>
      {compactTopUp ? (
        <>
          <span aria-hidden="true">AP</span>
          <span className="sr-only">{labels.topUp}</span>
        </>
      ) : (
        labels.topUp
      )}
    </Link>,
    <Link key="session" href={href.session} className={classes.session} data-nav="">
      {signedIn ? labels.account : labels.signIn}
    </Link>,
  ];
  if (compactTopUp) return items[0];
  return listItems ? items.map((item) => <li key={item.key}>{item}</li>) : items;
}

async function CurrentLinks(props: SessionLinksProps) {
  const jar = await cookies();
  return <Links {...props} signedIn={SESSION_COOKIES.some((name) => jar.has(name))} />;
}

export function SessionLinks(props: SessionLinksProps) {
  return (
    <Suspense fallback={<Links {...props} signedIn={false} />}>
      <CurrentLinks {...props} />
    </Suspense>
  );
}
