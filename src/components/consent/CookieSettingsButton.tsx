"use client";

/**
 * Enlace del pie para cambiar la elección de cookies en cualquier momento
 * (RF-11: «la elección se puede cambiar desde el footer»; RGPD art. 7.3:
 * retirar el consentimiento debe ser tan fácil como darlo).
 */
import { OPEN_CONSENT_EVENT } from "./ConsentManager";

export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
      className="inline-block py-2 underline-offset-4 hover:underline"
    >
      {label}
    </button>
  );
}
