import { describe, expect, it } from "vitest";

import { safeNext } from "./redirect";

describe("safeNext (redirección abierta)", () => {
  it("acepta rutas internas del mismo idioma", () => {
    expect(safeNext("/es/rankings?area=sea", "es")).toBe("/es/rankings?area=sea");
  });

  it.each([
    "https://otro.example",
    "//otro.example/es/",
    "/de/account",
    "/es\\..\\x",
    "",
    "/es /x",
  ])("rechaza %j y vuelve a la cuenta", (next) => {
    expect(safeNext(next, "es")).toBe("/es/account");
  });
});
