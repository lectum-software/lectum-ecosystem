import assert from "node:assert/strict";
import test from "node:test";
import "../../scripts/register-source-modules.mjs";

const { formatAttendanceLabel } = await import("../app/app/psychologist/[id]/modules/support.ts");

for (const [modality, label] of [
  ["presencial", "Presencial"],
  ["hibrido", "Online e presencial"],
]) {
  test(`${modality} conserva significado com localização completa, parcial ou ausente`, () => {
    assert.equal(formatAttendanceLabel({ modality }), label);
    assert.equal(
      formatAttendanceLabel({ modality, address_city: " Campinas ", address_state: " sp " }),
      `${label} em Campinas/SP`,
    );
    assert.equal(
      formatAttendanceLabel({ modality, address_city: "Campinas" }),
      `${label} em Campinas`,
    );
    assert.equal(formatAttendanceLabel({ modality, address_state: "SP" }), label);
  });
}

test("online não anuncia atendimento presencial por conter cidade no perfil", () => {
  assert.equal(formatAttendanceLabel({ modality: "online", address_city: "Campinas" }), "Online");
});

test("ausência e modalidade futura preservam fallbacks existentes", () => {
  assert.equal(formatAttendanceLabel({ modality: null }), "Modalidade não informada");
  assert.equal(formatAttendanceLabel({ modality: "outra" }), "outra");
});
