import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("PostgreSQL: persistent consent, races, revocation and non-retroactive attribution", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: db } = await import("@/infra/database/prisma");
  const { MarketingConsentRepository, consentedAcquisition } = await import("./consent-repository");
  const policy = {
    documentVersion: "test-notice-v1",
    maxAgeMs: 60_000,
    campaigns: { utm_source: ["meta"], utm_campaign: ["campaign_001"] },
  };
  const repo = new MarketingConsentRepository(policy);
  const user = await db.user.create({
    data: {
      name: "Disposable consent test",
      email: `${randomUUID()}@example.invalid`,
      role: "psicologo",
    },
  });
  const now = new Date();
  const input = {
    accepted: true as const,
    document_version: policy.documentVersion,
    expected_revision: 0,
    campaigns: {
      utm_source: "meta",
      utm_campaign: "campaign_001",
      utm_term: "unapproved",
      fbclid: "not-allowed",
    },
  };
  const attribution = (occurredAt: Date, current: Date) =>
    db.$transaction((tx) => consentedAcquisition(tx, user.id, occurredAt, current, policy));
  try {
    await assert.rejects(
      new MarketingConsentRepository({ ...policy, documentVersion: null }).grant(
        user.id,
        input,
        now,
      ),
      {
        code: "marketing_consent_unavailable",
      },
    );
    await assert.rejects(repo.grant(user.id, { ...input, document_version: "unknown" }, now), {
      code: "marketing_consent_invalid",
    });
    const grants = await Promise.allSettled([
      repo.grant(user.id, input, now),
      repo.grant(user.id, input, now),
    ]);
    assert.equal(grants.filter((result) => result.status === "fulfilled").length, 1);
    const rejected = grants.find((result) => result.status === "rejected");
    assert.equal(rejected?.reason.code, "marketing_consent_conflict");
    assert.equal(await db.marketing_consent_event.count({ where: { user_id: user.id } }), 1);
    const captured = await db.marketing_attribution.findUniqueOrThrow({
      where: { user_id: user.id },
    });
    assert.deepEqual(captured.campaigns, { utm_source: "meta", utm_campaign: "campaign_001" });
    await repo.grant(
      user.id,
      { ...input, expected_revision: 1, campaigns: {} },
      new Date(now.getTime() + 1),
    );
    assert.deepEqual(
      await db.marketing_attribution.findUniqueOrThrow({ where: { user_id: user.id } }),
      captured,
    );
    assert.ok(await attribution(now, now));
    assert.equal(await attribution(new Date(now.getTime() - 1), now), null);
    assert.equal(await attribution(now, new Date(now.getTime() + 60_000)), null);
    assert.equal(await db.$transaction((tx) => consentedAcquisition(tx, user.id, now, now)), null);
    // Reconnection proves evidence is persisted, not held in a process-level cache.
    await db.$disconnect();
    assert.equal((await repo.status(user.id, now)).revision, 1);
    await repo.revoke(user.id, new Date(now.getTime() + 2));
    assert.equal(await db.marketing_attribution.count({ where: { user_id: user.id } }), 0);
    assert.equal(await attribution(now, new Date(now.getTime() + 3)), null);
    await assert.rejects(repo.grant(user.id, { ...input, expected_revision: 1 }), {
      code: "marketing_consent_conflict",
    });
    await repo.revoke(user.id);
    assert.equal((await repo.status(user.id)).revision, 2);
    await repo.grant(user.id, { ...input, expected_revision: 2 }, new Date(now.getTime() + 4));
    assert.equal(await attribution(now, new Date(now.getTime() + 5)), null);
    const race = await Promise.allSettled([
      repo.grant(user.id, { ...input, expected_revision: 3 }, new Date(now.getTime() + 6)),
      repo.revoke(user.id, new Date(now.getTime() + 6)),
    ]);
    assert.ok(race.some((result) => result.status === "fulfilled"));
    assert.equal((await repo.status(user.id, new Date(now.getTime() + 7))).granted, false);
    assert.equal(await db.marketing_attribution.count({ where: { user_id: user.id } }), 0);
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});

test("PostgreSQL: notice records patient choices without acquisition or external permission", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: db } = await import("@/infra/database/prisma");
  const { MarketingConsentRepository, consentedAcquisition } = await import("./consent-repository");
  const { MARKETING_CONSENT_POLICY } = await import("./consent-policy");
  const repo = new MarketingConsentRepository();
  const user = await db.user.create({
    data: {
      name: "Disposable privacy notice test",
      email: `${randomUUID()}@example.invalid`,
      role: "paciente",
    },
  });
  try {
    assert.equal((await repo.status(user.id)).decided, false);
    const granted = await repo.grant(user.id, {
      accepted: true,
      document_version: MARKETING_CONSENT_POLICY.documentVersion!,
      expected_revision: 0,
      campaigns: { utm_source: "meta", utm_term: "not-approved" },
    });
    assert.equal(granted.granted, true);
    assert.equal(granted.decided, true);
    assert.equal(granted.external_transmission, false);
    assert.equal(await db.marketing_attribution.count({ where: { user_id: user.id } }), 0);
    assert.equal(
      await db.$transaction((tx) => consentedAcquisition(tx, user.id, new Date())),
      null,
    );
    const refused = await repo.revoke(user.id);
    assert.equal(refused.granted, false);
    assert.equal(refused.decided, true);
    assert.equal((await repo.status(user.id)).revision, 2);
    assert.equal(await db.marketing_consent_event.count({ where: { user_id: user.id } }), 2);
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
