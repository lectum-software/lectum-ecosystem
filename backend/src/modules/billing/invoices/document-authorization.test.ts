import assert from "node:assert/strict";
import { test } from "node:test";
import { documentSchema, parseProvider } from "./contracts";
import { invoiceDocumentNextAttempt, invoiceDocumentStatus } from "./document-authorization";

// Contract fixtures only. Government authorization is not asserted as an external E2E result.
const base = {
  id: "document-unit",
  object: "nfse",
  mode: "test",
  reference: "reference-unit",
  total: 2990,
  status: "authorized",
  nfse_number: "42",
};
const classify = (patch = {}) =>
  invoiceDocumentStatus(parseProvider(documentSchema, { ...base, ...patch }));
const government = {
  simulation: false,
  access_key: "1".repeat(50),
  urls: { public_query: "https://government-contract.example.invalid/query" },
};

test("explicit test simulation remains simulated without requiring a SIM access key", () => {
  for (const access_key of [undefined, null, "", "SIM-example", "1".repeat(50)])
    assert.equal(classify({ simulation: true, access_key }), "simulated");
  assert.equal(classify({ ...government, simulation: true }), "simulated");
  assert.equal(classify({ simulation: true, mode: "live" }), "authorization_unverified");
});

test("government classification requires explicit false and all coherent signals", () => {
  assert.equal(classify(government), "authorized");
  assert.equal(classify({ ...government, mode: "live" }), "authorized");
  for (const patch of [
    { simulation: undefined },
    { simulation: null },
    { simulation: "false" },
    { simulation: 0 },
    { access_key: undefined },
    { access_key: null },
    { access_key: "1".repeat(49) },
    { access_key: "1".repeat(51) },
    { access_key: ` ${"1".repeat(50)}` },
    { access_key: "SIM-example" },
    { nfse_number: "SIM-9" },
    { nfse_number: "sim-9" },
    { urls: undefined },
    { urls: null },
    { urls: {} },
    { urls: { public_query: null } },
    { urls: { public_query: 42 } },
    { urls: { public_query: "" } },
    { urls: { public_query: "not a URL" } },
    { urls: { public_query: "http://example.invalid/query" } },
    { urls: { public_query: "https://user:password@example.invalid/query" } },
    { urls: { public_query: "https://example.invalid/query\n" } },
    { urls: null, public_query: "https://example.invalid/query" },
  ])
    assert.equal(classify({ ...government, ...patch }), "authorization_unverified");
});

test("new missing or malformed evidence cannot discard an existing document or imply false", () => {
  for (const patch of [
    {},
    { simulation: null, access_key: {}, urls: 42 },
    { simulation: "false", access_key: "x".repeat(300), urls: { public_query: [] } },
    { simulation: [], urls: { public_query: "x".repeat(3000) } },
  ]) {
    const parsed = parseProvider(documentSchema, { ...base, ...patch });
    assert.equal(parsed.id, base.id);
    assert.equal(parsed.reference, base.reference);
    assert.equal(parsed.nfse_number, base.nfse_number);
    assert.equal(parsed.simulation, undefined);
    assert.equal(invoiceDocumentStatus(parsed), "authorization_unverified");
  }
  const parsed = parseProvider(documentSchema, {
    ...base,
    simulation: true,
    simulation_notice: "Provider text must not be copied into logs or public messages",
    urls: { public_query: null, pdf: "https://example.invalid/private-document" },
  });
  assert.ok(!("simulation_notice" in parsed));
  assert.deepEqual(parsed.urls, { public_query: null });
});

test("other provider states are preserved; no evidence promotes a pending or rejected note", () => {
  for (const status of ["pending", "processing", "rejected", "cancelled", "failed"])
    assert.equal(classify({ ...government, status }), status);
  assert.equal(classify({ status: "pending", simulation: true }), "pending");
});

test("simulated and unverified documents poll at the authorized cadence, without fast retry", () => {
  const now = Date.parse("2026-11-10T12:00:00Z");
  for (const status of ["authorized", "simulated", "authorization_unverified"] as const)
    assert.equal(invoiceDocumentNextAttempt(status, now).getTime() - now, 24 * 60 * 60_000);
  assert.equal(invoiceDocumentNextAttempt("pending", now).getTime() - now, 5 * 60_000);
});
