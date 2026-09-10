import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCrpFromRegistryResult,
  normalizeCrpRegistrationNumber,
  normalizeStoredCrp,
  parseStoredCrp,
} from "./professional-registry";

test("normaliza numero publico do CRP sem zero artificial a esquerda", () => {
  assert.equal(normalizeCrpRegistrationNumber("03324"), "3324");
  assert.equal(normalizeCrpRegistrationNumber("029112"), "29112");
  assert.equal(normalizeCrpRegistrationNumber("29112"), "29112");
});

test("divide e recompõe CRP preservando regional e sem padding no numero", () => {
  assert.deepEqual(parseStoredCrp("21ª Região - PI/03324"), {
    crp_region: "21ª Região - PI",
    crp_number: "3324",
  });
  assert.equal(normalizeStoredCrp("21ª Região - PI/03324"), "21ª Região - PI/3324");
  assert.equal(
    buildCrpFromRegistryResult({ nome_regional: "7ª Região - RS", registro: "029112" }),
    "7ª Região - RS/29112",
  );
});
