import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeWhatsapp, updateSchema } from "./profile-validation";

describe("contato do perfil sem truncamento", () => {
  it("preserva DDI, DDD e todos os dígitos ao normalizar", () => {
    assert.equal(normalizeWhatsapp("+55 (55) 99999-9999"), "+5555999999999");
    assert.equal(normalizeWhatsapp(null), null);
    assert.equal(normalizeWhatsapp(""), null);
    assert.equal(normalizeWhatsapp(`+${"9".repeat(16)}`), `+${"9".repeat(16)}`);
  });

  it("schema recusa mais de 15 dígitos, sem depender de CPF ou persistência", () => {
    const schema = updateSchema.shape.whatsapp;
    for (const digits of ["9".repeat(15), `55${"9".repeat(11)}`]) {
      assert.equal(schema.safeParse(`+${digits}`).success, true);
    }
    for (const value of [`+${"9".repeat(16)}`, `+55 (55) ${"9".repeat(12)}`]) {
      const parsed = schema.safeParse(value);
      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.equal(
          parsed.error.issues[0].message,
          "Informe um WhatsApp com no máximo 15 dígitos",
        );
      }
    }
  });

  it("preserva contrato opcional e aceita formatação sem contar pontuação como dígito", () => {
    const schema = updateSchema.shape.whatsapp;
    for (const value of [undefined, null, "", "+55 (55) 99999-9999"]) {
      assert.equal(schema.safeParse(value).success, true);
    }
  });

  it("mantém o limite existente do nome composto, sem truncar nomes", () => {
    assert.equal(updateSchema.shape.name.safeParse("a".repeat(160)).success, true);
    assert.equal(updateSchema.shape.name.safeParse("a".repeat(161)).success, false);
  });
});
