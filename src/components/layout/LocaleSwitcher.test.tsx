import { describe, expect, it } from "vitest";

import { switchLocalePath } from "./LocaleSwitcher";

describe("switchLocalePath", () => {
  it("cambia solo el idioma y conserva el resto de la ruta (RF-02)", () => {
    expect(switchLocalePath("/de/rankings/global/sea", "es")).toBe("/es/rankings/global/sea");
    expect(switchLocalePath("/en", "pt-BR")).toBe("/pt-BR");
  });
});
