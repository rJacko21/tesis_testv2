import { describe, expect, it } from "vitest";

import { bonusPercent } from "./bonus";

const base = { apAmount: 2500, priceCents: 499 };

describe("bonusPercent", () => {
  it("calcula los AP extra por euro frente al paquete base, hacia abajo", () => {
    expect(bonusPercent({ apAmount: 5500, priceCents: 999 }, base)).toBe(9);
    expect(bonusPercent({ apAmount: 12_000, priceCents: 1999 }, base)).toBe(19);
    expect(bonusPercent({ apAmount: 32_500, priceCents: 4999 }, base)).toBe(29);
  });

  it("sin ventaja, o con datos imposibles, no hay insignia", () => {
    expect(bonusPercent(base, base)).toBeNull();
    expect(bonusPercent({ apAmount: 4000, priceCents: 999 }, base)).toBeNull();
    expect(bonusPercent({ apAmount: 1, priceCents: 0 }, base)).toBeNull();
  });
});
