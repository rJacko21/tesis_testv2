/**
 * Configuración de Vitest (tests unitarios y de componentes).
 * Los tests extremo a extremo usan Playwright y viven en `tests/e2e`.
 */
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
