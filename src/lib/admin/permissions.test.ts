import { describe, expect, it } from "vitest";

import { areasFor, can, canChangeStatus, canSetRoles, isStaff } from "./permissions";

describe("permisos del panel (RF-12)", () => {
  it("cada rol abre solo sus zonas", () => {
    expect(areasFor(["admin"])).toEqual(["users", "roles", "audit"]);
    expect(areasFor(["support"])).toEqual(["users"]);
    expect(areasFor(["editor"])).toEqual([]);
    expect(areasFor([])).toEqual([]);
    expect(can(["editor", "support"], "users")).toBe(true);
    expect(can(["support"], "audit")).toBe(false);
  });

  it("un jugador sin roles del equipo no es del equipo", () => {
    expect(isStaff([])).toBe(false);
    expect(isStaff(["vip"])).toBe(false);
    expect(isStaff(["editor"])).toBe(true);
  });

  it("soporte suspende jugadores, pero no al equipo ni a sí mismo", () => {
    const support = { id: 1, roles: ["support"] };
    expect(canChangeStatus(support, { id: 2, roles: [] })).toBe(true);
    expect(canChangeStatus(support, { id: 3, roles: ["admin"] })).toBe(false);
    expect(canChangeStatus(support, { id: 1, roles: ["support"] })).toBe(false);
    expect(canChangeStatus({ id: 4, roles: ["editor"] }, { id: 2, roles: [] })).toBe(false);
  });

  it("admin suspende a cualquiera menos a sí mismo", () => {
    const admin = { id: 1, roles: ["admin"] };
    expect(canChangeStatus(admin, { id: 2, roles: ["support"] })).toBe(true);
    expect(canChangeStatus(admin, { id: 1, roles: ["admin"] })).toBe(false);
  });

  it("solo admin cambia roles y no puede quitarse el suyo", () => {
    const admin = { id: 1, roles: ["admin"] };
    expect(canSetRoles(admin, 2, ["editor"])).toBe(true);
    expect(canSetRoles(admin, 1, ["admin", "editor"])).toBe(true);
    expect(canSetRoles(admin, 1, ["editor"])).toBe(false);
    expect(canSetRoles({ id: 3, roles: ["support"] }, 2, ["editor"])).toBe(false);
  });
});
