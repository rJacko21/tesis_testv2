/**
 * Presupuesto de JavaScript por página (ADR-15, revisada el 2026-11-07).
 *
 * Suma, comprimido con gzip, el JS que cada ruta necesita para cargarse
 * (`firstLoadChunkPaths` del informe de Next en `.next/diagnostics`) y
 * falla si alguna supera 150 KiB.
 *
 * No cuenta lo que Next precarga para los enlaces visibles: llega cuando la
 * página ya se ha cargado, no afecta a LCP ni a TBT y Lighthouse lo incluye
 * unas veces sí y otras no. Esa cifra se sigue viendo en Lighthouse CI como
 * aviso, sin bloquear.
 *
 * Uso: `pnpm build && pnpm js:budget`.
 */
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

/** 150 KiB, el límite de ADR-15. */
const BUDGET = 153_600;

interface RouteStats {
  route: string;
  firstLoadChunkPaths: string[];
}

const routes = JSON.parse(
  readFileSync(".next/diagnostics/route-bundle-stats.json", "utf8"),
) as RouteStats[];
const sizes = new Map<string, number>();
const gzipped = (path: string) => {
  let size = sizes.get(path);
  if (size === undefined) {
    size = gzipSync(readFileSync(path)).length;
    sizes.set(path, size);
  }
  return size;
};

let failed = false;
const rows = routes
  .map(({ route, firstLoadChunkPaths }) => ({
    route,
    bytes: firstLoadChunkPaths.reduce((sum, path) => sum + gzipped(path), 0),
  }))
  .sort((a, b) => b.bytes - a.bytes);

for (const { route, bytes } of rows) {
  const over = bytes > BUDGET;
  failed ||= over;
  console.log(`${over ? "✗" : "✓"} ${String(bytes).padStart(7)} B  ${route}`);
}
console.log(
  `\nLímite: ${BUDGET} B (gzip). Margen de la ruta más pesada: ${BUDGET - rows[0]!.bytes} B.`,
);
if (failed) {
  console.error("Alguna ruta supera el presupuesto de JavaScript (ADR-15).");
  process.exit(1);
}
