// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { contactMessage } = await import("./contact-mail");

const input = {
  name: "Ana <script>",
  email: "ana@example.test",
  category: "payment" as const,
  subject: "AP <b>missing</b>",
  message: "Line one & more\nLine two",
};
const meta = {
  to: "support@example.test",
  locale: "es" as const,
  account: { username: "ana", id: "u1" },
  sentAt: new Date("2026-11-08T10:30:00Z"),
};

describe("contactMessage", () => {
  it("va al buzón de soporte y se responde al jugador", () => {
    const mail = contactMessage(input, meta);
    expect(mail.to).toBe("support@example.test");
    expect(mail.replyTo).toBe("ana@example.test");
    expect(mail.subject).toBe("[Support · Payments and AP] AP <b>missing</b>");
  });

  it("lleva los datos para atenderlo en el texto", () => {
    const { text } = contactMessage(input, meta);
    expect(text).toContain("Category: Payments and AP");
    expect(text).toContain("Page language: Español (es)");
    expect(text).toContain("Account: ana (id u1)");
    expect(text).toContain("Sent: 2026-11-08 10:30 UTC");
    expect(text).toContain("Line one & more\nLine two");
    expect(contactMessage(input, { ...meta, account: null }).text).toContain(
      "Account: Not signed in",
    );
  });

  it("escapa en el HTML todo lo que escribe el jugador", () => {
    const { html } = contactMessage(input, meta);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>missing");
    expect(html).toContain("Ana &#60;script&#62;");
    expect(html).toContain("Line one &#38; more");
  });
});
