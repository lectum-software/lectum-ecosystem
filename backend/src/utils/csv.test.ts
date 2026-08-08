import assert from "node:assert/strict";
import test from "node:test";
import { csvCell, csvRow } from "./csv";

test("escapa aspas e neutraliza fórmulas vindas de texto", () => {
  assert.equal(csvCell('Nome "Teste"'), '"Nome ""Teste"""');
  assert.equal(
    csvCell('=HYPERLINK("https://example.test")'),
    '"\'=HYPERLINK(""https://example.test"")"',
  );
  assert.equal(csvCell("  +cmd"), '"\'  +cmd"');
});

test("preserva números negativos legítimos", () => {
  assert.equal(csvRow(["valor", -29.9]), '"valor","-29.9"');
});
