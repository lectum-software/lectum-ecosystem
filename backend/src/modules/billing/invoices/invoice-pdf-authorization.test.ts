import assert from "node:assert/strict";
import { test } from "node:test";
import type { billing_invoice } from "@/external/generated/prisma/client";
import { invoicePdf } from "@/modules/api/private/psychologist/billing/subscription/use-cases/invoice";
import { documentSchema, parseProvider } from "./contracts";
import { InvoiceRepository } from "./repository";
import { SendNfAdapter } from "./SendNfAdapter";

// Unit boundary tests only: repository/provider calls are intercepted, never external fiscal proof.
test("PDF refuses simulated or unknown current responses even when legacy cache says authorized", async (t) => {
  const before = { ...process.env };
  Object.assign(process.env, {
    SENDNF_TEST_ENABLED: "true",
    SENDNF_LIVE_ENABLED: "false",
    SENDNF_API_KEY: "nt_test_unit_only",
    SENDNF_COMPANY_ID: "company-unit",
    SENDNF_PAYMENTS_FROM: "2026-01-01T00:00:00Z",
    SENDNF_SERVICE_DESCRIPTION: "Assinatura de teste unitario",
    NODE_ENV: "test",
    MERCADO_PAGO_ENV: "sandbox",
    DATABASE_URL: "postgresql://127.0.0.1/lectum_test",
  });
  t.after(() => {
    process.env = before;
  });
  const cached = {
    id: "invoice-unit",
    user_id: "owner-unit",
    company_id: "company-unit",
    gateway: "mercadopago",
    account_id: null,
    mode: "test",
    status: "authorized",
    document_id: "document-unit",
    payment_id: "payment-unit",
    number: "42",
    request_snapshot: {
      company_id: "company-unit",
      reference: "reference-unit",
      taker: {
        document: "529.982.247-25",
        name: "Teste Unitario",
        email: "test@example.invalid",
      },
      items: [{ description: "Assinatura de teste unitario", unit_amount: 2990 }],
    },
  } as unknown as billing_invoice;
  t.mock.method(InvoiceRepository.prototype, "findOwned", async () => cached);
  t.mock.method(SendNfAdapter.prototype, "verifyIdentity", async () => ({
    mode: "test" as const,
    restricted: true,
  }));
  const current = {
    id: "document-unit",
    object: "nfse",
    mode: "test",
    status: "authorized",
    company_id: "company-unit",
    reference: "reference-unit",
    total: 2990,
    nfse_number: "42",
  };
  let evidence: Record<string, unknown> = {};
  const getDocument = t.mock.method(SendNfAdapter.prototype, "getDocument", async () =>
    parseProvider(documentSchema, { ...current, ...evidence }),
  );
  const pdf = t.mock.method(SendNfAdapter.prototype, "pdf", async () => Buffer.from("%PDF-unit"));
  const input = {
    auth: { role: "psicologo", id: "owner-unit" },
    params: { id: cached.id },
  } as Parameters<typeof invoicePdf>[0];
  for (const patch of [
    { simulation: true, simulation_notice: "private provider notice" },
    {},
    { simulation: "false" },
    { simulation: false, nfse_number: "SIM-9" },
    { simulation: false, access_key: "1".repeat(50), urls: { public_query: null } },
  ]) {
    evidence = patch;
    const result = await invoicePdf(input);
    assert.equal(result.status, 409);
    assert.ok(!("pdf" in result));
    assert.ok(!JSON.stringify(result).includes("private provider notice"));
  }
  assert.equal(getDocument.mock.callCount(), 5);
  assert.equal(pdf.mock.callCount(), 0);
  evidence = {
    simulation: false,
    access_key: "1".repeat(50),
    urls: { public_query: "https://contract.example.invalid/query" },
  };
  const allowed = await invoicePdf(input);
  assert.equal(allowed.status, 200);
  assert.equal(pdf.mock.callCount(), 1);
});
