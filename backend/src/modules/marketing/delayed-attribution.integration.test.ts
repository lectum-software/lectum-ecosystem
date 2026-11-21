import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("PostgreSQL: delayed acquisition survives reconnect but fails closed after expiry or revocation", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: db } = await import("@/infra/database/prisma");
  const { MarketingConsentRepository, consentedAcquisition } = await import("./consent-repository");
  const day = 24 * 60 * 60_000;
  const start = Date.UTC(2026, 0, 1);
  const at = (days: number) => new Date(start + days * day);
  const policy = {
    documentVersion: "delayed-attribution-test-v1",
    maxAgeMs: 90 * day,
    campaigns: { utm_source: ["meta"], utm_campaign: ["campaign_a", "campaign_b"] },
  };
  const repo = new MarketingConsentRepository(policy);
  const user = await db.user.create({
    data: {
      name: "Disposable delayed acquisition",
      email: `${randomUUID()}@example.invalid`,
      role: "psicologo",
    },
  });
  const first = { utm_source: "meta", utm_campaign: "campaign_a" };
  const resolve = (paidDay: number, processedDay = paidDay) =>
    db.$transaction((tx) =>
      consentedAcquisition(tx, user.id, at(paidDay), at(processedDay), policy),
    );
  try {
    await repo.grant(
      user.id,
      {
        accepted: true,
        document_version: policy.documentVersion,
        expected_revision: 0,
        campaigns: first,
      },
      at(0),
    );
    await db.$disconnect();
    for (const days of [7, 30, 45, 89]) {
      assert.deepEqual((await resolve(days))?.campaigns, first, `Paid on day ${days}`);
    }
    assert.deepEqual(
      (await resolve(30, 45))?.campaigns,
      first,
      "Delayed processing while consent remains valid",
    );
    // Current grant semantics preserve acquisition, but do not implement last touch.
    await repo.grant(
      user.id,
      {
        accepted: true,
        document_version: policy.documentVersion,
        expected_revision: 1,
        campaigns: { utm_source: "meta", utm_campaign: "campaign_b" },
      },
      at(20),
    );
    assert.deepEqual((await resolve(45))?.campaigns, first);
    assert.equal(await resolve(90), null, "Consent expires at day 90 without silent renewal");
    assert.equal(await resolve(30, 91), null, "Late processing cannot bypass expired consent");
    assert.equal(
      await db.$transaction((tx) => consentedAcquisition(tx, user.id, at(30), at(30))),
      null,
      "Real default policy still has no approved campaign catalog",
    );
    await repo.revoke(user.id, at(40));
    assert.equal(await resolve(45), null);
    assert.equal(
      await resolve(30, 45),
      null,
      "Revocation blocks resolution of earlier payments too",
    );
    assert.equal(await db.marketing_attribution.count({ where: { user_id: user.id } }), 0);
    await repo.grant(
      user.id,
      {
        accepted: true,
        document_version: policy.documentVersion,
        expected_revision: 2,
      },
      at(50),
    );
    assert.equal(await resolve(51), null, "New consent does not recover deleted acquisition");
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
