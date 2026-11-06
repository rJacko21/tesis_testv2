// Configuración de ESLint (formato "flat").
// Base: reglas de Next.js para Core Web Vitals y TypeScript.
// Añadidos: reglas estrictas del proyecto (ver docs/plan/02-constitucion-y-estandares.md).
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Prohibido `any` salvo justificación explícita con eslint-disable + comentario.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // Los scripts de línea de comandos sí informan por consola.
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "drizzle/**", "next-env.d.ts"]),
]);

export default eslintConfig;
