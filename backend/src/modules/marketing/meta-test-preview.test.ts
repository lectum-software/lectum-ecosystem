import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareMetaTestPreview as prepareScopedPreview } from "./meta-test-preview";

const context = {
  environment: "local",
  stripeMode: "test",
  participant: "owner_test_account",
  clientUserAgent: "Mozilla/5.0 (unit test only)",
};
function prepareMetaTestPreview(
  ...args: [
    unknown,
    Parameters<typeof prepareScopedPreview>[1],
    readonly string[],
    string | null,
    number,
  ]
) {
  return prepareScopedPreview(...args, context);
}

const now = 1794900000000;
const url = "https://example.test/subscription";
const evidence: Parameters<typeof prepareMetaTestPreview>[1] = {
  consent: {
    purpose: "meta_ads_measurement",
    documentVersion: "unit-test-only",
    grantedAt: now - 1000,
    expiresAt: now + 1000,
    revokedAt: null,
  },
  occurredAtMs: now,
  candidate: {
    conversion: "professional_subscription",
    eventId: "a".repeat(64),
    occurredAt: now / 1000,
    sourceUrl: url,
    fbp: "fb.1.1794900000000.123456",
    amountCents: 2990,
  },
};

test("test preview preserves event identity and paid amount without network access", (t) => {
  const network = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("network forbidden");
  });
  const prepare = () => prepareMetaTestPreview("TEST89280", evidence, [url], "unit-test-only", now);
  const result = prepare();
  assert.ok(result);
  assert.equal(result.transmissionAllowed, false);
  assert.equal(result.mode, "local_preview_only");
  assert.equal(result.payload.test_event_code, "TEST89280");
  assert.equal(result.payload.data[0].event_id, evidence.candidate.eventId);
  assert.deepEqual(result.payload.data[0].user_data, {
    fbp: evidence.candidate.fbp,
    client_user_agent: context.clientUserAgent,
  });
  assert.deepEqual(result.payload.data[0].custom_data, { value: 29.9, currency: "BRL" });
  assert.deepEqual(result, prepare());
  assert.equal(network.mock.callCount(), 0);
});

test("owner approval cannot expand into live mode, other participants or extra fields", () => {
  for (const invalid of [
    undefined,
    {},
    { ...context, stripeMode: "live" },
    { ...context, environment: "production" },
    { ...context, participant: "customer" },
    { ...context, email: "private@example.test" },
    { ...context, clientUserAgent: "" },
    { ...context, clientUserAgent: "   " },
    { ...context, clientUserAgent: "browser\r\nInjected: value" },
    { ...context, clientUserAgent: "a".repeat(1025) },
  ])
    assert.equal(
      prepareScopedPreview("TEST89280", evidence, [url], "unit-test-only", now, invalid),
      null,
    );
});

test("controlled preview rejects other conversions and unapproved click IDs", () => {
  for (const candidate of [
    {
      ...evidence.candidate,
      conversion: "professional_registration" as const,
      amountCents: undefined,
    },
    { ...evidence.candidate, conversion: "professional_checkout" as const, amountCents: undefined },
    { ...evidence.candidate, fbc: "fb.1.1794900000000.testclick" },
  ])
    assert.equal(
      prepareMetaTestPreview("TEST89280", { ...evidence, candidate }, [url], "unit-test-only", now),
      null,
    );
});

test("test code cannot bypass consent, reviewed URLs or reviewed document", () => {
  const prepare = (input: typeof evidence) =>
    prepareMetaTestPreview("TEST89280", input, [url], "unit-test-only", now);
  assert.equal(prepare({ ...evidence, consent: null }), null);
  for (const change of [
    { revokedAt: now },
    { expiresAt: now },
    { grantedAt: now + 1 },
    { documentVersion: "old" },
  ]) {
    assert.equal(prepare({ ...evidence, consent: { ...evidence.consent!, ...change } }), null);
  }
  assert.equal(prepareMetaTestPreview("TEST89280", evidence, [], "unit-test-only", now), null);
  assert.equal(prepareMetaTestPreview("TEST89280", evidence, [url], null, now), null);
});

test("test preview rejects invalid codes, sensitive fields and missing matching identifiers", () => {
  for (const code of [undefined, "", "TEST", " TEST89280", "TEST89280\n", "sk_secret", 89280]) {
    assert.equal(prepareMetaTestPreview(code, evidence, [url], "unit-test-only", now), null);
  }
  for (const change of [
    { fbp: undefined },
    { email: "private@example.test" },
    { amountCents: 0 },
  ]) {
    assert.equal(
      prepareMetaTestPreview(
        "TEST89280",
        { ...evidence, candidate: { ...evidence.candidate, ...change } },
        [url],
        "unit-test-only",
        now,
      ),
      null,
    );
  }
});
