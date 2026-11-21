import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildConsentedMetaCapiPayload,
  buildMetaCapiPayload,
  type MetaCapiCandidate,
} from "./meta-capi";
import { USER_CONVERSIONS } from "./user-events";

const at = 1795100000000;
const sourceUrl = "https://community.example.test/activity";
const base = {
  eventId: "a".repeat(64),
  occurredAt: at / 1000,
  sourceUrl,
  fbp: "fb.1.1795099999000.123456",
};
const consent = {
  purpose: "meta_ads_measurement" as const,
  documentVersion: "synthetic-user-notice",
  grantedAt: at - 1000,
  expiresAt: at + 60000,
  revokedAt: null,
};

test("user payloads require action-specific URL review and preserve distinct meanings", () => {
  const names = ["CompleteRegistration", "Contact", "forum_post"];
  for (const [i, conversion] of USER_CONVERSIONS.entries()) {
    const candidate = { ...base, conversion };
    assert.equal(buildMetaCapiPayload(candidate, [sourceUrl], at / 1000), null);
    const body = buildMetaCapiPayload(candidate, [sourceUrl], at / 1000, {
      [conversion]: [sourceUrl],
    });
    assert.deepEqual(body, {
      data: [
        {
          event_name: names[i],
          event_id: base.eventId,
          event_time: at / 1000,
          action_source: "website",
          event_source_url: sourceUrl,
          user_data: { fbp: base.fbp },
          ...(conversion === "patient_registration"
            ? { custom_data: { account_type: "user" } }
            : {}),
        },
      ],
    });
    assert.equal(
      buildMetaCapiPayload(candidate, [], at / 1000, { [conversion]: [sourceUrl] }),
      null,
    );
    assert.equal(
      buildMetaCapiPayload(candidate, [sourceUrl], at / 1000, {
        [USER_CONVERSIONS[(i + 1) % 3]]: [sourceUrl],
      }),
      null,
    );
  }
});

test("user serialization rejects extra fields and never rewrites the actual source", () => {
  for (const conversion of USER_CONVERSIONS) {
    const reviewed = { [conversion]: [sourceUrl] };
    for (const key of [
      "email",
      "phone",
      "name",
      "community",
      "content",
      "title",
      "professional_id",
      "user_type",
      "target_id",
      "referrer",
      "custom_data",
      "user_data",
      "amountCents",
    ]) {
      assert.equal(
        buildMetaCapiPayload(
          {
            ...base,
            conversion,
            [key]: key === "amountCents" ? 100 : "private",
          },
          [sourceUrl],
          at / 1000,
          reviewed,
        ),
        null,
        key,
      );
    }
    for (const url of [
      `${sourceUrl}/topic`,
      `${sourceUrl}?theme=private`,
      `${sourceUrl}#private`,
      "http://community.example.test/activity",
      "https://user:pass@community.example.test/activity",
    ]) {
      assert.equal(
        buildMetaCapiPayload(
          { ...base, conversion, sourceUrl: url },
          [sourceUrl],
          at / 1000,
          reviewed,
        ),
        null,
      );
    }
  }
});

test("user payloads require current and event-time consent for the exact reviewed notice", () => {
  for (const conversion of USER_CONVERSIONS) {
    const candidate: MetaCapiCandidate = { ...base, conversion };
    const evidence = { candidate, consent, occurredAtMs: at };
    const reviewed = { [conversion]: [sourceUrl] };
    assert.ok(
      buildConsentedMetaCapiPayload(evidence, [sourceUrl], consent.documentVersion, at, reviewed),
    );
    for (const invalid of [
      null,
      { ...consent, grantedAt: at + 1 },
      { ...consent, expiresAt: at },
      { ...consent, revokedAt: at },
      { ...consent, documentVersion: "obsolete" },
    ]) {
      assert.equal(
        buildConsentedMetaCapiPayload(
          { ...evidence, consent: invalid },
          [sourceUrl],
          consent.documentVersion,
          at + 2,
          reviewed,
        ),
        null,
      );
    }
    assert.equal(buildConsentedMetaCapiPayload(evidence, [sourceUrl], null, at, reviewed), null);
    const retried = buildConsentedMetaCapiPayload(
      evidence,
      [sourceUrl],
      consent.documentVersion,
      at + 1000,
      reviewed,
    );
    assert.equal(retried?.data[0].event_id, base.eventId);
    assert.equal(retried?.data[0].event_time, base.occurredAt);
  }
});
