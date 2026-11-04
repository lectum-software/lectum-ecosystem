import assert from "node:assert/strict";
import { type TestContext, test } from "node:test";
import { toSendNfAddress } from "./billing-address";
import { InvoiceError } from "./config";
import { invoiceReference } from "./contracts";
import { SendNfAdapter } from "./SendNfAdapter";

const companyId = "unit-company";
const request = {
  company_id: companyId,
  reference: invoiceReference(companyId, "456", "live"),
  iss_rate: 201,
  taker: { document: "529.982.247-25", name: "Teste Unitario", email: "test@example.invalid" },
  items: [{ description: "Assinatura de teste unitario", unit_amount: 2990 }],
};
const company = {
  id: companyId,
  default_service_code: "010501",
  default_iss_rate: null,
  send_to_taker: true,
};
const goLiveCompany = {
  id: companyId,
  production: { ready: false, missing: ["no_test_note"] },
  state: "live",
  nfse_ready: true,
  live_enabled_at: "2026-10-26T12:00:00Z",
};
const goLive = {
  platform_enabled: true,
  plan: { allowed: true },
  companies: [goLiveCompany],
};
const adapter = () => new SendNfAdapter("nt_live_unit_test_only", companyId, "live");

// Contract fixtures only: all HTTP is intercepted; no fiscal acceptance is inferred from these tests.
function transport(t: TestContext, responses: Record<string, unknown>) {
  const calls: { path: string; init?: RequestInit }[] = [];
  t.mock.method(globalThis, "fetch", async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://api.sendnf.com");
    assert.ok(Object.hasOwn(responses, url.pathname), "unexpected HTTP request");
    calls.push({ path: url.pathname, init });
    return new Response(JSON.stringify(responses[url.pathname]), {
      headers: { "Content-Type": "application/json" },
    });
  });
  return calls;
}

function liveRuntime(t: TestContext) {
  const before = { ...process.env };
  Object.assign(process.env, {
    NODE_ENV: "production",
    MERCADO_PAGO_ENV: "production",
    BASE: "https://api.lectum.com.br",
    DATABASE_URL: "postgresql://unit.invalid/lectum",
  });
  t.after(() => {
    process.env = before;
  });
}

test("production readiness recognizes explicit activation with only the waived test-note pending", async (t) => {
  transport(t, { "/v1/go-live": goLive });
  assert.deepEqual(await adapter().productionStatus(), { live: true });
});

test("production readiness fails closed on missing activation, other requirements or disabled plan", async (t) => {
  let response: unknown = goLive;
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(response)));
  for (const patch of [
    { live_enabled_at: null },
    { state: "needs_test" },
    { nfse_ready: false },
    { production: { ready: false, missing: ["certificate", "no_test_note"] } },
    { production: { ready: false, missing: [] } },
    { id: "another-company" },
  ]) {
    response = { ...goLive, companies: [{ ...goLiveCompany, ...patch }] };
    assert.equal((await adapter().productionStatus()).live, false);
  }
  for (const patch of [
    { platform_enabled: false },
    { plan: { allowed: false } },
    { companies: [goLiveCompany, goLiveCompany] },
  ]) {
    response = { ...goLive, ...patch };
    assert.equal((await adapter().productionStatus()).live, false);
  }
});

test("live creation verifies company and preview then sends explicit ISS and stable idempotency", async (t) => {
  liveRuntime(t);
  const calls = transport(t, {
    "/v1/go-live": goLive,
    [`/v1/companies/${companyId}`]: company,
    "/v1/nfse/preview": { ok: true, validated: true, totals: { total: 2990 } },
    "/v1/nfse": {
      id: "unit-document",
      object: "nfse",
      mode: "live",
      company_id: companyId,
      reference: request.reference,
      total: 2990,
      status: "pending",
    },
  });
  const addressedRequest = {
    ...request,
    taker: {
      ...request.taker,
      address: toSendNfAddress({
        zip: "35503-590",
        street: "Rua de teste",
        number: "151",
        district: "Centro",
        city: "Divinopolis",
        state: "MG",
      }),
    },
  };
  await adapter().create(addressedRequest, "010501");
  assert.deepEqual(
    calls.map((c) => c.path),
    ["/v1/go-live", `/v1/companies/${companyId}`, "/v1/nfse/preview", "/v1/nfse"],
  );
  assert.equal(JSON.parse(String(calls[3].init?.body)).iss_rate, 201);
  assert.deepEqual(
    JSON.parse(String(calls[3].init?.body)).taker.address,
    addressedRequest.taker.address,
  );
  assert.deepEqual(
    JSON.parse(String(calls[2].init?.body)).taker.address,
    addressedRequest.taker.address,
  );
  assert.equal(new Headers(calls[3].init?.headers).get("Idempotency-Key"), request.reference);
  assert.equal(new Headers(calls[2].init?.headers).get("Idempotency-Key"), null);
});

test("preview accepts the confirmed schema validation contract and rejects unknown values", async (t) => {
  let result: unknown = { ok: true, validated: "schema", totals: { total: 2990 } };
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(result)));
  await adapter().preview(request);
  for (const validated of ["unknown", "", null, false]) {
    result = { ok: true, validated, totals: { total: 2990 } };
    await assert.rejects(adapter().preview(request), InvoiceError);
  }
  result = { ok: false, validated: "schema", totals: { total: 2990 } };
  await assert.rejects(adapter().preview(request), InvoiceError);
  result = { ok: true, validated: "schema", totals: { total: 2991 } };
  await assert.rejects(adapter().preview(request), InvoiceError);
});

test("live creation never issues when XML preview is invalid", async (t) => {
  liveRuntime(t);
  const calls = transport(t, {
    "/v1/go-live": goLive,
    [`/v1/companies/${companyId}`]: company,
    "/v1/nfse/preview": { ok: false, validated: false, totals: { total: 2990 } },
  });
  await assert.rejects(
    adapter().create(request, "010501"),
    (error: unknown) => error instanceof InvoiceError && error.code === "fiscal_preview_invalid",
  );
  assert.equal(
    calls.some((c) => c.path === "/v1/nfse"),
    false,
  );
});

test("live creation stops when fiscal classification, rate or email settings diverge", async (t) => {
  liveRuntime(t);
  let current = { ...company } as Record<string, unknown>;
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string) => {
    const path = new URL(input).pathname;
    calls.push(path);
    assert.ok(path === "/v1/go-live" || path === `/v1/companies/${companyId}`);
    return new Response(JSON.stringify(path === "/v1/go-live" ? goLive : current));
  });
  for (const patch of [
    { default_service_code: "010101" },
    { default_iss_rate: 200 },
    { send_to_taker: false },
  ]) {
    current = { ...company, ...patch };
    await assert.rejects(
      adapter().create(request, "010501"),
      (error: unknown) =>
        error instanceof InvoiceError && error.code === "fiscal_settings_mismatch",
    );
  }
  assert.equal(
    calls.some((c) => c === "/v1/nfse"),
    false,
  );
});

test("document read rejects a test document returned through the live adapter", async (t) => {
  transport(t, {
    "/v1/documents/unit-document": {
      id: "unit-document",
      object: "nfse",
      mode: "test",
      total: 2990,
      reference: request.reference,
      status: "authorized",
    },
  });
  await assert.rejects(
    adapter().getDocument("unit-document"),
    (error: unknown) => error instanceof InvoiceError && error.code === "document_mismatch",
  );
});
