// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { escapeHtml, resetPasswordMessage, verifyEmailMessage } = await import("./templates");

describe("correos de cuenta", () => {
  it("se escriben en el idioma del jugador", async () => {
    const mail = await verifyEmailMessage(
      { email: "a@example.test", name: "Misaja", locale: "de" },
      "https://florensia.test/de/verify-email?token=abc",
    );
    expect(mail.subject).toBe("Bestätige dein Florensia-Konto");
    expect(mail.text).toContain("Hallo Misaja,");
    expect(mail.text).toContain("https://florensia.test/de/verify-email?token=abc");
  });

  it("escapan el nombre de cuenta en el HTML", async () => {
    const mail = await resetPasswordMessage(
      { email: "a@example.test", name: '<img src=x onerror="alert(1)">', locale: "en" },
      "https://florensia.test/en/reset-password?token=a&b",
    );
    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("&#60;img");
    expect(mail.html).toContain('href="https://florensia.test/en/reset-password?token=a&#38;b"');
  });

  it("escapeHtml cubre los cinco caracteres especiales", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&#60;&#62;&#38;&#34;&#39;");
  });
});
