/**
 * Preparación común de los tests: desmonta lo renderizado tras cada test,
 * para que un test no vea los elementos del anterior.
 */
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
