/**
 * Recomendación según el sistema del visitante (RF-09).
 *
 * `PlatformAdvice` es el componente puro (se puede probar y prerenderizar);
 * `DetectedPlatformAdvice` lee las cabeceras de la petición y se usa dentro
 * de `<Suspense>`: el HTML estático lleva el texto genérico ("unknown") y,
 * al llegar la petición, se sustituye por el del sistema detectado. Los dos
 * textos tienen casi la misma longitud y la caja tiene altura mínima, así
 * que el cambio no mueve el diseño.
 *
 * Sin JavaScript en el navegador: la detección se hace en el servidor.
 */
import { headers } from "next/headers";

import type { Translate } from "@/i18n/translator";
import { detectPlatform, type Platform } from "@/lib/platform";
import { STORAGE_GB } from "@/config/download";

type Advice = "windows" | "desktop" | "mobile" | "unknown";

const ADVICE: Record<Platform, Advice> = {
  windows: "windows",
  mac: "desktop",
  linux: "desktop",
  android: "mobile",
  ios: "mobile",
  unknown: "unknown",
};

const BODY = {
  windows: "download.recommendation.windowsBody",
  desktop: "download.recommendation.desktopBody",
  mobile: "download.recommendation.mobileBody",
  unknown: "download.recommendation.unknownBody",
} as const;

export function PlatformAdvice({ platform, t }: { platform: Platform; t: Translate }) {
  const advice = ADVICE[platform];
  const ok = advice === "windows";
  return (
    <div
      data-platform={platform}
      className={`rounded-panel shadow-panel bg-surface min-h-32 border-l-4 p-5 ${ok ? "border-success-700" : "border-gold-500"}`}
    >
      <p className="font-display text-heading text-xl font-bold">
        {t(`download.recommendation.${advice}`)}
      </p>
      <p className="text-ink-600 mt-1">{t(BODY[advice], { size: String(STORAGE_GB) })}</p>
    </div>
  );
}

export async function DetectedPlatformAdvice({ t }: { t: Translate }) {
  const requestHeaders = await headers();
  const platform = detectPlatform(
    requestHeaders.get("user-agent"),
    requestHeaders.get("sec-ch-ua-platform"),
  );
  return <PlatformAdvice platform={platform} t={t} />;
}
