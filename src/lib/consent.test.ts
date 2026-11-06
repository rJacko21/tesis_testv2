import { describe, expect, it } from "vitest";

import {
  CONSENT_VERSION,
  isAllowed,
  parseConsent,
  readConsentFromCookieHeader,
  serializeConsent,
  uniformChoice,
} from "./consent";

describe("consentimiento de cookies (RF-11)", () => {
  it("sin elección, nada opcional está permitido (F-31)", () => {
    expect(isAllowed(null, "analytics")).toBe(false);
    expect(isAllowed(readConsentFromCookieHeader("NEXT_LOCALE=es"), "analytics")).toBe(false);
  });

  it("guarda y lee la elección", () => {
    const accepted = uniformChoice(true);
    expect(parseConsent(serializeConsent(accepted))).toEqual(accepted);
    expect(isAllowed(parseConsent(serializeConsent(uniformChoice(false))), "analytics")).toBe(
      false,
    );
  });

  it("lee la cookie entre otras de la cabecera", () => {
    const value = encodeURIComponent(serializeConsent(uniformChoice(true)));
    const header = `NEXT_LOCALE=es; consent=${value}; other=1`;
    expect(isAllowed(readConsentFromCookieHeader(header), "analytics")).toBe(true);
  });

  it("vuelve a preguntar si la cookie es de otra versión o está manipulada", () => {
    expect(parseConsent(`${CONSENT_VERSION + 1}.analytics:1`)).toBeNull();
    expect(parseConsent(`${CONSENT_VERSION}.analytics:yes`)).toBeNull();
    expect(parseConsent("basura")).toBeNull();
  });
});
