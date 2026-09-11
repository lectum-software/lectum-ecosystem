import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPersonalProfileUpdate, buildProfessionalChanges } from "./changes";

const personal = Object.freeze({
  address_city: "Cidade",
  address_complement: "Complemento",
  address_district: "Bairro",
  address_number: "1",
  address_state: "SP",
  address_street: "Rua",
  address_zip: "00000000",
  birthdate: new Date("2000-01-01T00:00:00Z"),
  cpf: null,
  gender: null,
  race_color: null,
  religion: "Anterior",
  whatsapp: null,
});
for (const key of Object.keys(personal) as (keyof typeof personal)[]) {
  test(`escrita pessoal inclui somente ${key}`, () => {
    const column = key.startsWith("address_") ? `professional_${key}` : key;
    assert.deepEqual(buildPersonalProfileUpdate(personal, [key]), { [column]: personal[key] });
  });
}
test("nenhuma alteração pessoal não gera escrita de snapshot", () => {
  assert.deepEqual(buildPersonalProfileUpdate(personal, []), {});
});
test("limpeza pessoal explícita conserva null", () => {
  assert.deepEqual(buildPersonalProfileUpdate({ ...personal, religion: null }, ["religion"]), {
    religion: null,
  });
});
const professional = Object.freeze({
  approach_ids: ["approach"],
  service_ids: ["service"],
  specialty_ids: ["specialty"],
  languages: ["Português"],
  modality: "online",
  target_audience: ["adulto"],
});
for (const key of ["languages", "modality", "target_audience"] as const) {
  test(`escrita profissional ${key} não reaplica relações`, () => {
    assert.deepEqual(buildProfessionalChanges(professional, [key]), {
      profile: { [key]: professional[key] },
    });
  });
}
for (const [field, output] of [
  ["approach_ids", "approachIds"],
  ["service_ids", "serviceIds"],
  ["specialty_ids", "specialtyIds"],
] as const) {
  test(`relação ${field} isolada, com limpeza explícita`, () => {
    assert.deepEqual(buildProfessionalChanges(professional, [field]), {
      profile: {},
      [output]: professional[field],
    });
    assert.deepEqual(buildProfessionalChanges({ ...professional, [field]: [] }, [field]), {
      profile: {},
      [output]: [],
    });
  });
}
test("nenhuma mudança profissional não escreve dados omitidos", () => {
  assert.deepEqual(buildProfessionalChanges(professional, []), { profile: {} });
});
