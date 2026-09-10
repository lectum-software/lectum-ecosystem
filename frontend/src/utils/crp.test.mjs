import assert from "node:assert/strict";
import test from "node:test";
import { formatCrpLabel, formatCrpNumber } from "./crp.ts";

test("preserva o numero publico do CRP sem zero artificial a esquerda", () => {
  assert.equal(formatCrpNumber("7/29112"), "07/29112");
  assert.equal(formatCrpLabel("07/29112"), "CRP 07/29112");
  assert.equal(formatCrpNumber("21ª Região - PI/03324"), "21/3324");
  assert.equal(formatCrpLabel("21/03324"), "CRP 21/3324");
});

test("mantem a normalizacao do prefixo CRP sem duplicar o rotulo", () => {
  assert.equal(formatCrpLabel("CRP 07/29112"), "CRP 07/29112");
  assert.equal(formatCrpLabel("CRP CRP DEMO/00005"), "CRP DEMO/00005");
});
