/**
 * Tabla de requisitos mínimos y recomendados (RF-09).
 *
 * Es una tabla de verdad (`<th scope>`), no imágenes ni columnas sueltas:
 * el lector de pantalla anuncia "Memoria, Mínimos: 512 MB". En móvil cabe
 * en 360 px porque solo tiene tres columnas y el texto se parte.
 */
import { MINIMUM, RECOMMENDED, STORAGE_GB, type Requirements } from "@/config/download";
import type { Translate } from "@/i18n/translator";

/** 512 → "512 MB", 2048 → "2 GB". Las unidades son iguales en los 7 idiomas. */
export function formatMemory(mb: number): string {
  return mb >= 1024 && mb % 1024 === 0 ? `${mb / 1024} GB` : `${mb} MB`;
}

export function RequirementsTable({ t }: { t: Translate }) {
  const storage = t("download.requirements.storageValue", { size: String(STORAGE_GB) });
  const rows: { label: string; value: (r: Requirements) => string }[] = [
    { label: t("download.requirements.os"), value: () => t("download.requirements.osValue") },
    { label: t("download.requirements.processor"), value: (r) => r.processor },
    { label: t("download.requirements.memory"), value: (r) => formatMemory(r.memoryMb) },
    { label: t("download.requirements.graphics"), value: (r) => r.graphics },
    { label: t("download.requirements.directx"), value: (r) => r.directX },
    {
      label: t("download.requirements.network"),
      value: () => t("download.requirements.networkValue"),
    },
    { label: t("download.requirements.storage"), value: () => storage },
  ];

  return (
    <div className="rounded-panel shadow-panel bg-surface overflow-hidden">
      <table className="w-full text-left text-sm sm:text-base">
        <caption className="sr-only">{t("download.requirements.title")}</caption>
        <thead className="bg-navy-900 text-white">
          <tr>
            <th scope="col" className="p-3">
              {t("download.requirements.component")}
            </th>
            <th scope="col" className="p-3">
              {t("download.requirements.minimum")}
            </th>
            <th scope="col" className="p-3">
              {t("download.requirements.recommended")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-parchment-300 even:bg-parchment-50 border-t">
              <th scope="row" className="text-heading p-3 font-bold">
                {row.label}
              </th>
              <td className="p-3 break-words">{row.value(MINIMUM)}</td>
              <td className="p-3 break-words">{row.value(RECOMMENDED)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-ink-600 border-parchment-300 border-t p-3 text-sm">
        {t("download.requirements.note")}
      </p>
    </div>
  );
}
