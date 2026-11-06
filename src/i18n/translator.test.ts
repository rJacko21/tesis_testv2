import { describe, expect, it } from "vitest";

import { LOCALES } from "@/config/locales";

import { catalogLoaders } from "./catalog";
import { createTranslator } from "./translator";

describe("createTranslator", () => {
  it("interpola valores en todos los idiomas", async () => {
    for (const locale of LOCALES) {
      const t = createTranslator(locale, await catalogLoaders[locale]());
      expect(t("footer.copyright", { year: "2026" })).toBe("© 2026 Giiku Games GmbH");
    }
  });

  it("traduce según el idioma", async () => {
    const es = createTranslator("es", await catalogLoaders.es());
    const de = createTranslator("de", await catalogLoaders.de());
    expect(es("nav.shop")).toBe("Tienda");
    expect(de("footer.imprint")).toBe("Impressum");
    expect(es("classes.saint.role")).toBe("Curación y apoyo");
  });
});
