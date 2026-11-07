/**
 * Texto de los cambios de una entrada de auditoría: `{ status: { from:
 * "active", to: "suspended" }, reason: "…" }` se lee «status: active →
 * suspended» y «reason: …». Es pura para probarla sin base de datos.
 *
 * Los nombres de campo y los valores se muestran tal como se guardan: son
 * datos técnicos para el equipo, iguales en todos los idiomas, y así se
 * pueden buscar en la base de datos.
 */
const show = (value: unknown): string => {
  if (Array.isArray(value)) return value.length ? value.map(show).join(", ") : "∅";
  if (value === null || value === undefined || value === "") return "∅";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const isChange = (value: unknown): value is { from: unknown; to: unknown } =>
  typeof value === "object" && value !== null && "from" in value && "to" in value;

/** Una línea por campo cambiado, en el orden en que se guardaron. */
export function describeDiff(diff: Record<string, unknown> | null): string[] {
  if (!diff) return [];
  return Object.entries(diff).map(([field, value]) =>
    isChange(value)
      ? `${field}: ${show(value.from)} → ${show(value.to)}`
      : `${field}: ${show(value)}`,
  );
}
