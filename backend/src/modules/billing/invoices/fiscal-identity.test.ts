import assert from "node:assert/strict";
import test from "node:test";
import { confirmedFiscalName, fiscalNameSchema } from "./fiscal-identity";

const date = new Date("2026-10-24T12:00:00.000Z");
const profile = { id: "profile-test", cpf: "52998224725", crp: "06/123456", cfp_verified_at: date };
const check = {
  id: "check-test",
  psychologist_id: profile.id,
  provider: "infosimples",
  cpf: profile.cpf,
  found: true,
  deleted: false,
  raw: {
    provider: "infosimples",
    request: { cpf: profile.cpf },
    confirmed_at: date.toISOString(),
    confirmed_result_key: "selected",
    normalized_results: [
      { key: "other", nome: "Outra Pessoa", registro: "999999", nome_regional: "06", active: true },
      {
        key: "selected",
        nome: "Nome Completo Verificado",
        registro: "123456",
        nome_regional: "06",
        active: true,
      },
    ],
  },
};

test("fiscal identity uses only the selected confirmed CFP result", () => {
  assert.equal(confirmedFiscalName(profile, check), "Nome Completo Verificado");
});
test("fiscal identity rejects unconfirmed, unrelated, inactive or stale evidence", () => {
  assert.equal(confirmedFiscalName({ ...profile, cfp_verified_at: null }, check), null);
  assert.equal(confirmedFiscalName({ ...profile, cpf: "11144477735" }, check), null);
  assert.equal(confirmedFiscalName({ ...profile, crp: "06/999999" }, check), null);
  assert.equal(confirmedFiscalName(profile, { ...check, psychologist_id: "other" }), null);
  assert.equal(confirmedFiscalName(profile, { ...check, deleted: true }), null);
  assert.equal(
    confirmedFiscalName(profile, {
      ...check,
      raw: { ...check.raw, request: { nome: "Busca por nome" } },
    }),
    null,
  );
  assert.equal(
    confirmedFiscalName(profile, { ...check, raw: { ...check.raw, confirmed_result_key: null } }),
    null,
  );
  assert.equal(
    confirmedFiscalName(profile, {
      ...check,
      raw: { ...check.raw, confirmed_at: "2026-10-23T12:00:00.000Z" },
    }),
    null,
  );
  assert.equal(
    confirmedFiscalName(profile, {
      ...check,
      raw: {
        ...check.raw,
        normalized_results: [{ ...check.raw.normalized_results[1], active: false }],
      },
    }),
    null,
  );
});
test("fiscal names are trimmed and reject empty, oversized or control-character input", () => {
  assert.equal(fiscalNameSchema.parse("  Nome Completo  "), "Nome Completo");
  for (const value of ["", "  ", "A", "A".repeat(151), "Nome\nSobrenome"]) {
    assert.equal(fiscalNameSchema.safeParse(value).success, false);
  }
});
