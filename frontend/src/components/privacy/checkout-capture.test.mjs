import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { captureOptionalCheckout } from "./checkout-capture.ts";

const status = () => ({
  granted: true,
  collection_available: true,
  revision: 2,
  document_version: "reviewed",
  expires_at: new Date(Date.now() + 60000).toISOString(),
});
const input = () => ({
  enabled: true,
  operationId: "local-operation",
  documentVersion: "reviewed",
  hasConsent: () => true,
  status: async () => status(),
  capture: async () => {},
});
test("disabled capture and local refusal perform no consent reads or requests", async () => {
  for (const change of [{ enabled: false }, { hasConsent: () => false }]) {
    let calls = 0;
    await captureOptionalCheckout({
      ...input(),
      status: async () => {
        calls++;
        return status();
      },
      capture: async () => {
        calls++;
      },
      ...change,
    });
    assert.equal(calls, 0);
  }
});
test("checkout capture uses only the current granted revision and opaque operation", async () => {
  const sent = [];
  await captureOptionalCheckout({
    ...input(),
    capture: async (body) => {
      sent.push(body);
    },
  });
  assert.deepEqual(sent, [
    { operationId: "local-operation", revision: 2, documentVersion: "reviewed" },
  ]);
});
test("expired, revoked, unavailable and stale-document decisions never capture", async () => {
  for (const change of [
    { granted: false },
    { collection_available: false },
    { revision: 0 },
    { document_version: "old" },
    { expires_at: null },
    { expires_at: "invalid" },
    { expires_at: new Date(0).toISOString() },
  ]) {
    let calls = 0;
    await captureOptionalCheckout({
      ...input(),
      status: async () => ({ ...status(), ...change }),
      capture: async () => {
        calls++;
      },
    });
    assert.equal(calls, 0);
  }
  let consent = true;
  let calls = 0;
  await captureOptionalCheckout({
    ...input(),
    hasConsent: () => consent,
    status: async () => {
      consent = false;
      return status();
    },
    capture: async () => {
      calls++;
    },
  });
  assert.equal(calls, 0);
});
test("timeouts abort evidence without delaying payment indefinitely or posting later", async () => {
  let resolveStatus;
  let signal;
  let calls = 0;
  await captureOptionalCheckout({
    ...input(),
    timeoutMs: 10,
    status: async (value) => {
      signal = value;
      return new Promise((resolve) => {
        resolveStatus = resolve;
      });
    },
    capture: async () => {
      calls++;
    },
  });
  assert.equal(signal.aborted, true);
  resolveStatus(status());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 0);
  await assert.doesNotReject(
    captureOptionalCheckout({
      ...input(),
      capture: async () => {
        throw new Error("unavailable");
      },
    }),
  );
});
test("production gate stays off and optional requests cannot sign users out", () => {
  const api = readFileSync(new URL("../../api/req/privacy/index.ts", import.meta.url), "utf8");
  assert.match(api, /CHECKOUT_CONTEXT_CAPTURE_ENABLED = false/);
  assert.match(api, /signOutOnUnauthorized: false/);
});
