import assert from "node:assert/strict";
import { test } from "node:test";
import { invoicePdfFilename } from "./filename";

test("PDF usa numero e data de autorizacao no horario brasileiro", () => {
  assert.equal(
    invoicePdfFilename({
      mode: "live",
      number: "123",
      paymentId: "456",
      authorizedAt: "2026-11-06T01:00:00Z",
    }),
    "Lectum-Nota-Fiscal-123-05-11-2026.pdf",
  );
});

test("PDF sem numero usa pagamento e nao inventa data", () => {
  assert.equal(
    invoicePdfFilename({ mode: "live", paymentId: "456" }),
    "Lectum-Nota-Fiscal-Pagamento-456.pdf",
  );
  assert.equal(
    invoicePdfFilename({ mode: "test", number: "12/3", paymentId: "456", authorizedAt: "invalid" }),
    "Lectum-Nota-Fiscal-Teste-12-3.pdf",
  );
});
