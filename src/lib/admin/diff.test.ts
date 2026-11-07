import { describe, expect, it } from "vitest";

import { describeDiff } from "./diff";

describe("describeDiff", () => {
  it("muestra antes y después, listas y valores sueltos", () => {
    expect(
      describeDiff({
        status: { from: "active", to: "suspended" },
        roles: { from: [], to: ["editor", "support"] },
        reason: "Venta de cuentas",
        closedSessions: 2,
      }),
    ).toEqual([
      "status: active → suspended",
      "roles: ∅ → editor, support",
      "reason: Venta de cuentas",
      "closedSessions: 2",
    ]);
  });

  it("sin cambios, nada", () => {
    expect(describeDiff(null)).toEqual([]);
    expect(describeDiff({})).toEqual([]);
  });
});
