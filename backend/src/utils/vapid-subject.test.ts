import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeVapidSubject } from "./vapid-subject";

describe("normalizeVapidSubject", () => {
  it("preserva subjects VAPID completos", () => {
    assert.equal(normalizeVapidSubject("mailto:admin@example.com"), "mailto:admin@example.com");
    assert.equal(
      normalizeVapidSubject("https://example.com/contact"),
      "https://example.com/contact",
    );
  });

  it("adiciona mailto somente a e-mails sem esquema", () => {
    assert.equal(normalizeVapidSubject(" admin@example.com "), "mailto:admin@example.com");
    assert.equal(normalizeVapidSubject(undefined), "");
  });

  it("recusa subject vazio, malformado, com controle ou credenciais", () => {
    const invalidSubjects = [
      "mailto:",
      "admin@localhost",
      "mailto:admin @example.com",
      "mailto:admin@example.com\nBCC:other@example.com",
      "http://example.com/contact",
      "https://user:password@example.com/contact",
      "https://localhost/contact",
    ];

    for (const subject of invalidSubjects) {
      assert.equal(normalizeVapidSubject(subject), "");
    }
  });
});
