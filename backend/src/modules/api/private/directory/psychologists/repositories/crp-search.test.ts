import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCrpSearch } from "./crp-search";

test("normaliza CRP com regional, prefixo e zeros de preenchimento", () => {
  for (const input of ["CRP 04/0012345", "04/0012345", "04-0012345", "04 0012345"]) {
    assert.deepEqual(parseCrpSearch(input), { region: "4", number: "12345" });
  }
  assert.deepEqual(parseCrpSearch("0012345"), { region: null, number: "12345" });
  assert.deepEqual(parseCrpSearch("0412345"), { region: null, number: "412345" });
});

test("nomes e entradas nao numericas nao disparam consulta CRP", () => {
  for (const input of ["Ana Silva", "", "CRP", "04/%", "1' OR 1=1", undefined]) {
    assert.equal(parseCrpSearch(input), null);
  }
});
