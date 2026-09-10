import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAdminCrpNumber,
  formatCrpRegistrationNumber,
  formatRankingCrp,
  normalizeCrpRegistrationDisplay,
} from "./crp-formatters.ts";

const crpInput = (crp, registrationNumber = null) => ({
  crp,
  regionalCrp: "21ª Região - PI",
  registrationNumber,
});

test("Admin exibe numero CRP sem zero artificial no header e campos", () => {
  assert.equal(formatAdminCrpNumber(crpInput("21ª Região - PI/03324")), "21/3324");
  assert.equal(formatAdminCrpNumber(crpInput("21ª Região - PI/03324", "03324")), "21/3324");
  assert.equal(formatCrpRegistrationNumber("03324"), "3324");
  assert.equal(formatCrpRegistrationNumber("21ª Região - PI/03324"), "3324");
  assert.equal(normalizeCrpRegistrationDisplay("029112"), "29112");
});

test("ranking administrativo nao trunca nem preenche numero CRP", () => {
  assert.equal(formatRankingCrp("21ª Região - PI/03324"), "21/3324");
  assert.equal(formatRankingCrp("7ª Região - RS/029112"), "07/29112");
});
