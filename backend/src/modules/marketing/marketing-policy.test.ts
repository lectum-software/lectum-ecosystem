import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type AdvertisingConsent,
  permittedCampaignAttribution,
  permittedFacebookClickId,
} from "./acquisition-policy";
import { conversionEventId } from "./conversion-identity";
import {
  type FirstPaidSubscriptionEvidence,
  firstPaidSubscriptionCandidate,
} from "./first-paid-subscription";
import { META_CONVERSIONS, META_EVENT_POLICY, metaTransmissionDecision } from "./meta-policy";

const consent: AdvertisingConsent = {
  purpose: "meta_ads_measurement",
  documentVersion: "test-v1",
  grantedAt: 100,
  expiresAt: 300,
  revokedAt: null,
};

test("reviewed conversions are eligible; subscription still requires first verified payment", () => {
  for (const conversion of META_CONVERSIONS) {
    assert.equal(metaTransmissionDecision(conversion).allowed, true);
  }
  assert.equal(META_EVENT_POLICY.patient_community_post.confirmation, "post_committed");
  assert.equal(META_EVENT_POLICY.professional_subscription.confirmation, "first_payment_verified");
  for (const conversion of [
    "patient_registration",
    "patient_contact",
    "patient_community_post",
  ] as const) {
    assert.equal(metaTransmissionDecision(conversion).reason, "eligible");
  }
});

test("campaigns require explicit, current, purpose-specific consent", () => {
  const input = { utm_source: "meta" };
  const catalog = { utm_source: ["meta"] };
  for (const invalid of [
    null,
    { ...consent, revokedAt: 150 },
    { ...consent, documentVersion: "" },
    { ...consent, grantedAt: 201 },
    { ...consent, expiresAt: 200 },
  ]) {
    assert.deepEqual(permittedCampaignAttribution(input, catalog, invalid, 200), {});
  }
  assert.deepEqual(permittedCampaignAttribution(input, catalog, consent, 200), input);
});

test("drop arbitrary campaign text, URLs, clinical data and unknown properties", () => {
  const input = {
    utm_source: "meta",
    utm_campaign: "anxiety",
    utm_term: "person@example.test",
    utm_content: "https://example.test/health",
    title: "clinical text",
    community: "health",
    email: "person@example.test",
    fbclid: "click-test",
  };
  assert.deepEqual(permittedCampaignAttribution(input, { utm_source: ["meta"] }, consent, 200), {
    utm_source: "meta",
  });
  assert.deepEqual(permittedCampaignAttribution(input, {}, consent, 200), {});
});

test("fbclid is not allowed just because consent exists", () => {
  assert.equal(permittedFacebookClickId("click-test", false, consent, 200), null);
  assert.equal(permittedFacebookClickId("click-test", true, null, 200), null);
  assert.equal(
    permittedFacebookClickId("click-test", true, { ...consent, revokedAt: 150 }, 200),
    null,
  );
  assert.equal(permittedFacebookClickId("https://example.test", true, consent, 200), null);
  assert.equal(permittedFacebookClickId("click-test", true, consent, 200), "click-test");
});

test("IDs are stable for retries and different across conversions/entities without exposing IDs", () => {
  const key = "test-only-secret-never-used-in-runtime";
  const id = conversionEventId("professional_registration", "user-test", key);
  assert.match(id ?? "", /^[a-f0-9]{64}$/);
  assert.equal(id, conversionEventId("professional_registration", "user-test", key));
  assert.notEqual(id, conversionEventId("professional_subscription", "user-test", key));
  assert.notEqual(id, conversionEventId("professional_registration", "user-other", key));
  assert.equal(conversionEventId("professional_registration", "user-test", ""), null);
  assert.equal(conversionEventId("professional_registration", "", key), null);
});

const evidence = (): FirstPaidSubscriptionEvidence => ({
  webhookSignatureVerified: true,
  eventType: "invoice.paid",
  completeHistoryVerified: true,
  alreadyRecorded: false,
  firstEverPaidPaymentId: "payment-test",
  localSubscription: {
    id: "local-test",
    gatewaySubscriptionId: "gateway-test",
    gateway: "stripe",
    complimentary: false,
    free: false,
  },
  payment: {
    paymentId: "payment-test",
    subscriptionId: "gateway-test",
    externalReference: "local-test",
    amountCents: 3490,
    refundedCents: 0,
    currency: "BRL",
    status: "paid",
    liveMode: true,
    paidAt: new Date("2026-11-12T10:00:00Z"),
  },
});

test("first payment candidate retains the confirmed amount, not a plan price", () => {
  assert.deepEqual(firstPaidSubscriptionCandidate(evidence()), {
    eventName: "Subscribe",
    amountCents: 3490,
    currency: "BRL",
    paidAt: new Date("2026-11-12T10:00:00Z"),
  });
});

for (const [name, change] of Object.entries({
  wrong_event: (e: FirstPaidSubscriptionEvidence) => {
    e.eventType = "invoice.payment_failed";
  },
  unsigned: (e: FirstPaidSubscriptionEvidence) => {
    e.webhookSignatureVerified = false;
  },
  history_unknown: (e: FirstPaidSubscriptionEvidence) => {
    e.completeHistoryVerified = false;
  },
  duplicate: (e: FirstPaidSubscriptionEvidence) => {
    e.alreadyRecorded = true;
  },
  renewal: (e: FirstPaidSubscriptionEvidence) => {
    e.firstEverPaidPaymentId = "older-payment";
  },
  history_empty: (e: FirstPaidSubscriptionEvidence) => {
    e.firstEverPaidPaymentId = null;
  },
  complimentary: (e: FirstPaidSubscriptionEvidence) => {
    e.localSubscription.complimentary = true;
  },
  free: (e: FirstPaidSubscriptionEvidence) => {
    e.localSubscription.free = true;
  },
  wrong_provider: (e: FirstPaidSubscriptionEvidence) => {
    e.localSubscription.gateway = "other";
  },
  wrong_subscription: (e: FirstPaidSubscriptionEvidence) => {
    e.payment.subscriptionId = "other";
  },
  wrong_reference: (e: FirstPaidSubscriptionEvidence) => {
    e.payment.externalReference = "other";
  },
  pending: (e: FirstPaidSubscriptionEvidence) => {
    e.payment.status = "pending";
  },
  rejected: (e: FirstPaidSubscriptionEvidence) => {
    e.payment.status = "rejected";
  },
  authorized_not_paid: (e: FirstPaidSubscriptionEvidence) => {
    e.payment.status = "authorized";
  },
  sandbox: (e: FirstPaidSubscriptionEvidence) => {
    e.payment.liveMode = false;
  },
  wrong_currency: (e: FirstPaidSubscriptionEvidence) => {
    e.payment.currency = "USD";
  },
  zero: (e: FirstPaidSubscriptionEvidence) => {
    e.payment.amountCents = 0;
  },
  fractional_cents: (e: FirstPaidSubscriptionEvidence) => {
    e.payment.amountCents = 34.9;
  },
  invalid_amount: (e: FirstPaidSubscriptionEvidence) => {
    e.payment.amountCents = Number.NaN;
  },
  refund: (e: FirstPaidSubscriptionEvidence) => {
    e.payment.refundedCents = 1;
  },
  missing_date: (e: FirstPaidSubscriptionEvidence) => {
    e.payment.paidAt = null;
  },
  invalid_date: (e: FirstPaidSubscriptionEvidence) => {
    e.payment.paidAt = new Date("invalid");
  },
})) {
  test(`reject subscription conversion: ${name}`, () => {
    const input = evidence();
    change(input);
    assert.equal(firstPaidSubscriptionCandidate(input), null);
  });
}
