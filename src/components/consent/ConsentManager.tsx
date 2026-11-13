"use client";

/**
 * Banner y panel de consentimiento de cookies.
 *
 * - **Banner:** aparece mientras no hay una elección válida. Tiene
 *   **Aceptar**, **Rechazar** y **Configurar** con el mismo estilo y tamaño,
 *   para que rechazar no cueste más que aceptar (RF-11, CEPD 03/2022 sobre
 *   patrones engañosos). No es modal: se puede leer la página sin elegir,
 *   y mientras tanto no se carga nada opcional.
 * - **Panel:** un `<dialog>` modal con una casilla por categoría. Se abre
 *   desde «Configurar» o desde el enlace «Configurar cookies» del pie, que
 *   lanza el evento `OPEN_CONSENT_EVENT`.
 *
 * Al elegir: se guarda la cookie, se avisa al resto de la página con el
 * evento `consentchange` (lo escuchará el cargador de analítica) y se
 * envía la prueba a `/api/consent` sin esperar la respuesta.
 *
 * Va fijo abajo (`position: fixed`), así que no desplaza el contenido
 * (CLS 0). Se renderiza **ya en el HTML del servidor**: si apareciera tras
 * la hidratación, en páginas de texto sería el elemento más grande y
 * retrasaría el LCP hasta que carga el JS (3 s en el detalle de noticia).
 * Quien ya eligió no lo ve gracias a `CONSENT_HIDE_SCRIPT`, que corre en
 * `<head>` antes del primer pintado; después, el efecto lo quita del DOM.
 * Las clases van escritas a mano en lugar de `buttonStyles` para no meter
 * tailwind-merge en el navegador (ADR-15).
 *
 * @see RF-11 · ADR-11 · `src/lib/consent.ts`
 */
import { useCallback, useEffect, useRef, useState } from "react";

import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  type ConsentChoice,
  readConsentFromCookieHeader,
  serializeConsent,
  uniformChoice,
} from "@/lib/consent";

/** Evento global para abrir el panel desde cualquier sitio (p. ej. el pie). */
export const OPEN_CONSENT_EVENT = "open-consent-settings";

export interface ConsentTexts {
  title: string;
  body: string;
  policyLink: string;
  accept: string;
  reject: string;
  configure: string;
  settingsTitle: string;
  save: string;
  close: string;
  necessaryTitle: string;
  necessaryBody: string;
  analyticsTitle: string;
  analyticsBody: string;
}

export interface ConsentManagerProps {
  texts: ConsentTexts;
  /** Página de la política de cookies en el idioma actual. */
  policyHref: string;
}

const BUTTON =
  "inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border-2 border-strong bg-surface px-2 text-center leading-tight font-semibold text-heading hover:bg-sky-100";

function saveChoice(choice: ConsentChoice): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(serializeConsent(choice))}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent<ConsentChoice>("consentchange", { detail: choice }));
  // La prueba se guarda en segundo plano; `keepalive` la envía aunque se cambie de página.
  void fetch("/api/consent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(choice),
    keepalive: true,
  }).catch(() => undefined);
}

export function ConsentManager({ texts, policyHref }: ConsentManagerProps) {
  // `true` también en el servidor: el banner va en el HTML inicial.
  const [showBanner, setShowBanner] = useState(true);
  const [analytics, setAnalytics] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const current = readConsentFromCookieHeader(document.cookie);
    // Leer la cookie solo es posible en el navegador; por eso se decide tras montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowBanner(current === null);
    setAnalytics(current?.categories.analytics ?? false);

    const open = () => {
      setAnalytics(readConsentFromCookieHeader(document.cookie)?.categories.analytics ?? false);
      dialogRef.current?.showModal();
    };
    window.addEventListener(OPEN_CONSENT_EVENT, open);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, open);
  }, []);

  const choose = useCallback((choice: ConsentChoice) => {
    saveChoice(choice);
    setAnalytics(choice.categories.analytics);
    setShowBanner(false);
    dialogRef.current?.close();
  }, []);

  return (
    <>
      {showBanner ? (
        <section
          id="consent-banner"
          aria-labelledby="consent-title"
          className="border-strong bg-surface fixed inset-x-2 bottom-2 z-40 mx-auto max-w-2xl rounded-xl border p-4 text-sm shadow-2xl sm:inset-x-4 sm:bottom-4"
        >
          <h2 id="consent-title" className="font-display text-heading text-lg font-bold">
            {texts.title}
          </h2>
          <p className="text-ink-600 mt-1">
            {texts.body}{" "}
            <a href={policyHref} className="text-link font-semibold underline">
              {texts.policyLink}
            </a>
          </p>
          {/* En una fila también en móvil: el banner tapa menos pantalla. */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button type="button" className={BUTTON} onClick={() => choose(uniformChoice(true))}>
              {texts.accept}
            </button>
            <button type="button" className={BUTTON} onClick={() => choose(uniformChoice(false))}>
              {texts.reject}
            </button>
            <button type="button" className={BUTTON} onClick={() => dialogRef.current?.showModal()}>
              {texts.configure}
            </button>
          </div>
        </section>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-labelledby="consent-settings-title"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl p-0 backdrop:bg-black/60"
      >
        <form
          method="dialog"
          className="flex flex-col gap-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            choose({ ...uniformChoice(false), categories: { analytics } });
          }}
        >
          <h2 id="consent-settings-title" className="font-display text-heading text-xl font-bold">
            {texts.settingsTitle}
          </h2>

          <label className="flex gap-3">
            <input type="checkbox" checked disabled className="mt-1 size-5 shrink-0" />
            <span>
              <span className="text-heading block font-bold">{texts.necessaryTitle}</span>
              <span className="text-ink-600 text-sm">{texts.necessaryBody}</span>
            </span>
          </label>

          <label className="flex cursor-pointer gap-3">
            <input
              type="checkbox"
              name="analytics"
              checked={analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
              className="accent-navy-700 mt-1 size-5 shrink-0"
            />
            <span>
              <span className="text-heading block font-bold">{texts.analyticsTitle}</span>
              <span className="text-ink-600 text-sm">{texts.analyticsBody}</span>
            </span>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" className={BUTTON}>
              {texts.save}
            </button>
            <button type="button" className={BUTTON} onClick={() => choose(uniformChoice(true))}>
              {texts.accept}
            </button>
            <button type="button" className={BUTTON} onClick={() => choose(uniformChoice(false))}>
              {texts.reject}
            </button>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="text-link self-center px-3 py-2 text-sm font-semibold underline"
          >
            {texts.close}
          </button>
        </form>
      </dialog>
    </>
  );
}
