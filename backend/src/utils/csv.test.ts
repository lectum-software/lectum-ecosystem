import assert from "node:assert/strict";
import test from "node:test";
import { csvCell, csvPublicProvenance, csvRow } from "./csv";

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

test("converte proveniência técnica do CSV em rótulo leigo", () => {
  assert.equal(csvPublicProvenance("user_token+admin_activity_log"), "Contas");
  assert.equal(csvPublicProvenance("payment_event+visitor_session"), "Plataforma");
  assert.equal(csvPublicProvenance("mercadopago"), "mercadopago");
});
