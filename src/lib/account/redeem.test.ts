import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { CODE_PATTERN, normalizeCode, redeemProblem } = await import("./redeem");

const now = new Date("2026-11-07T12:00:00Z");
const day = 24 * 60 * 60 * 1000;
const active = {
  startsAt: new Date(now.getTime() - day),
  endsAt: new Date(now.getTime() + day),
  maxUses: null,
  totalUses: 0,
  usedByAccount: false,
};

describe("normalizeCode", () => {
  it("pasa a mayúsculas y quita espacios", () => {
    expect(normalizeCode(" welcome 2026 ")).toBe("WELCOME2026");
    expect(CODE_PATTERN.test(normalizeCode("winter-gift"))).toBe(true);
  });

  it("rechaza caracteres que no son de un código", () => {
    expect(CODE_PATTERN.test(normalizeCode("abc%"))).toBe(false);
    expect(CODE_PATTERN.test(normalizeCode("ab"))).toBe(false);
  });
});

describe("redeemProblem (RF-13)", () => {
  it("permite un código activo sin usar", () => {
    expect(redeemProblem(active, now)).toBeNull();
  });

  it("un código que no existe o aún no ha empezado no es válido", () => {
    expect(redeemProblem(null, now)).toBe("invalid");
    expect(redeemProblem({ ...active, startsAt: new Date(now.getTime() + 1) }, now)).toBe(
      "invalid",
    );
  });

  it("un código caducado lo dice", () => {
    expect(redeemProblem({ ...active, endsAt: now }, now)).toBe("expired");
  });

  it("CA: un código ya canjeado por la cuenta no se puede volver a usar", () => {
    expect(redeemProblem({ ...active, usedByAccount: true }, now)).toBe("used");
  });

  it("un código con todos sus usos gastados está agotado", () => {
    expect(redeemProblem({ ...active, maxUses: 3, totalUses: 3 }, now)).toBe("exhausted");
    expect(redeemProblem({ ...active, maxUses: 3, totalUses: 2 }, now)).toBeNull();
  });
});
