import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareRegistrationTestPreview } from "./registration-test-preview";

const now = 1794900000000;
const url = "https://example.test/auth/register/psychologist";
const context = { environment: "local", participant: "owner_test_account" };
const evidence: Parameters<typeof prepareRegistrationTestPreview>[1] = {
  consent: {
    purpose: "meta_ads_measurement",
    documentVersion: "registration-test-only",
    grantedAt: now - 1000,
    expiresAt: now + 1000,
    revokedAt: null,
  },
  occurredAtMs: now,
  candidate: {
    conversion: "professional_registration",
    eventId: "a".repeat(64),
    occurredAt: now / 1000,
    sourceUrl: url,
    fbp: "fb.1.1794899999000.123456",
  },
};
const prepare = (input = evidence, inputContext: unknown = context) =>
  prepareRegistrationTestPreview(
    "TEST10505",
    input,
    [url],
    "registration-test-only",
    now,
    inputContext,
  );

test("registration preview is minimal, deterministic and never transmits", (t) => {
  const network = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("No network");
  });
  const result = prepare();
  assert.ok(result);
  assert.equal(result.transmissionAllowed, false);
  assert.equal(result.payload.test_event_code, "TEST10505");
  assert.deepEqual(result.payload.data, [
    {
      event_name: "CompleteRegistration",
      event_id: evidence.candidate.eventId,
      event_time: now / 1000,
      action_source: "website",
      event_source_url: url,
      user_data: { fbp: evidence.candidate.fbp },
      custom_data: { account_type: "professional" },
    },
  ]);
  assert.deepEqual(result, prepare());
  assert.equal(network.mock.callCount(), 0);
});

test("registration preview rejects payments, extra matching data and non-test context", () => {
  for (const candidate of [
    { ...evidence.candidate, conversion: "professional_subscription" as const, amountCents: 2990 },
    { ...evidence.candidate, conversion: "professional_checkout" as const },
    { ...evidence.candidate, amountCents: 2990 },
    { ...evidence.candidate, fbc: "fb.1.1794900000000.click" },
    { ...evidence.candidate, fbp: undefined },
    { ...evidence.candidate, email: "test@example.invalid" },
  ])
    assert.equal(prepare({ ...evidence, candidate }), null);
  for (const invalid of [
    undefined,
    {},
    { ...context, environment: "production" },
    { ...context, participant: "customer" },
    { ...context, stripeMode: "test" },
  ]) {
    assert.equal(
      prepareRegistrationTestPreview(
        "TEST10505",
        evidence,
        [url],
        "registration-test-only",
        now,
        invalid,
      ),
      null,
    );
  }
});

test("registration preview requires current and prior consent and reviewed source", () => {
  assert.equal(prepare({ ...evidence, consent: null }), null);
  for (const change of [
    { grantedAt: now + 1 },
    { revokedAt: now },
    { expiresAt: now },
    { documentVersion: "old" },
  ])
    assert.equal(prepare({ ...evidence, consent: { ...evidence.consent!, ...change } }), null);
  assert.equal(
    prepare({ ...evidence, candidate: { ...evidence.candidate, sourceUrl: `${url}?email=test` } }),
    null,
  );
  for (const code of ["", "TEST", "TEST10505&access_token=bad"])
    assert.equal(
      prepareRegistrationTestPreview(code, evidence, [url], "registration-test-only", now, context),
      null,
    );
});
