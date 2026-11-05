import assert from "node:assert/strict";
import { test } from "node:test";
import { invoiceDownloadFilename } from "./invoice-filename.ts";

test("usa nome fiscal seguro enviado pelo backend", () => {
  assert.equal(
    invoiceDownloadFilename(
      'attachment; filename="Lectum-Nota-Fiscal-123-05-11-2026.pdf"',
      "fallback.pdf",
    ),
    "Lectum-Nota-Fiscal-123-05-11-2026.pdf",
  );
});

test("rejeita caminhos e nomes antigos e preserva compatibilidade", () => {
  for (const header of [
    undefined,
    'attachment; filename="../secret.pdf"',
    'attachment; filename="nota-fiscal.pdf"',
  ]) {
    assert.equal(
      invoiceDownloadFilename(header, "Lectum-Nota-Fiscal-123.pdf"),
      "Lectum-Nota-Fiscal-123.pdf",
    );
  }
});
