import { describe, expect, it } from "vitest";

import { formatDate, formatMoney } from "./format";

describe("formatDate", () => {
  const date = new Date("2026-11-06T23:30:00Z");

  it("usa el formato largo de cada idioma", () => {
    expect(formatDate("es", date)).toBe("6 de noviembre de 2026");
    expect(formatDate("en", date)).toBe("November 6, 2026");
    expect(formatDate("de", date)).toBe("6. November 2026");
  });

  it("no depende de la zona horaria del servidor: siempre UTC", () => {
    // A las 23:30 UTC ya es día 7 en Madrid; se debe mostrar el 6.
    expect(formatDate("fr", date)).toBe("6 novembre 2026");
  });
});

describe("formatMoney", () => {
  it("formatea céntimos con la moneda y el idioma", () => {
    // Entre la cifra y el símbolo, Intl pone un espacio de no separación.
    expect(formatMoney("es", 499, "EUR")).toBe("4,99\u00a0€");
    expect(formatMoney("en", 1999, "EUR")).toBe("€19.99");
  });
});
