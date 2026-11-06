import { describe, expect, it } from "vitest";

import { isValidUsername } from "./username";

describe("isValidUsername", () => {
  it.each(["Misaja", "pirata_99", "ABC_def"])("acepta %s", (name) => {
    expect(isValidUsername(name)).toBe(true);
  });

  it.each(["con espacio", "ñandú", "a-b", "<script>", ""])("rechaza %j", (name) => {
    expect(isValidUsername(name)).toBe(false);
  });
});
