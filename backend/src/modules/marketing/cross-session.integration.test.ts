import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";

test("PostgreSQL: first/last touch, authorized one-account transfer, fixed retention and revocation races", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: db } = await import("@/infra/database/prisma");
  const { AttributionRepository, attributionTokenHash, purgeExpiredAttribution } = await import(
    "./attribution-repository"
  );
  const { MarketingConsentRepository, consentedAcquisition } = await import("./consent-repository");
  const day = 86_400_000;
  const start = Date.now();
  const at = (days: number) => new Date(start + days * day);
  const policy = {
    acquisitionEnabled: true,
    documentVersion: "cross-session-test-v1",
    maxAgeMs: 90 * day,
    campaigns: { utm_source: ["meta"], utm_campaign: ["campaign_a", "campaign_b", "campaign_c"] },
  };
  const repo = new AttributionRepository(policy);
  const consent = new MarketingConsentRepository(policy);
  const tokens = Array.from({ length: 6 }, () => randomBytes(32).toString("hex"));
  const users = await Promise.all(
    [0, 1, 2].map(() =>
      db.user.create({
        data: {
          name: "Disposable cross-session",
          email: `${randomUUID()}@example.invalid`,
          role: "psicologo",
        },
      }),
    ),
  );
  const input = (token: string, campaign = "campaign_a") => ({
    token,
    accepted: true as const,
    document_version: policy.documentVersion,
    campaigns: { utm_source: "meta", utm_campaign: campaign },
  });
  const grant = (token: string) => ({
    accepted: true as const,
    document_version: policy.documentVersion,
    expected_revision: 0,
    authorize_transfer: true as const,
    guest_token: token,
  });
  const row = (token: string) =>
    db.marketing_guest_attribution.findUniqueOrThrow({
      where: { token_hash: attributionTokenHash(token) },
    });
  try {
    assert.deepEqual(await new AttributionRepository().captureGuest(input(tokens[0])), {
      enabled: false,
    });
    assert.equal(
      await db.marketing_guest_attribution.count({
        where: { token_hash: attributionTokenHash(tokens[0]) },
      }),
      0,
    );
    await repo.captureGuest(input(tokens[0]), at(0));
    await db.$disconnect();
    await repo.captureGuest({ ...input(tokens[0]), campaigns: {} }, at(7));
    assert.equal((await row(tokens[0])).last_at.getTime(), at(0).getTime());
    await repo.captureGuest(input(tokens[0], "campaign_b"), at(7));
    assert.deepEqual((await row(tokens[0])).first_campaigns, input(tokens[0]).campaigns);
    assert.deepEqual(
      (await row(tokens[0])).last_campaigns,
      input(tokens[0], "campaign_b").campaigns,
    );
    assert.equal((await row(tokens[0])).expires_at.getTime(), at(30).getTime());
    await assert.rejects(
      consent.grant(users[0].id, { ...grant(tokens[0]), authorize_transfer: undefined }, at(7)),
    );
    const transfers = await Promise.allSettled(
      users.slice(0, 2).map((user) => consent.grant(user.id, grant(tokens[0]), at(7))),
    );
    assert.equal(transfers.filter((result) => result.status === "fulfilled").length, 1);
    const owner = users[transfers.findIndex((result) => result.status === "fulfilled")];
    await consent.grant(owner.id, { ...grant(tokens[0]), expected_revision: 1 }, at(8));
    await repo.touchUser(
      owner.id,
      { expected_revision: 1, campaigns: input(tokens[0], "campaign_c").campaigns },
      at(14),
    );
    const acquisition = await db.marketing_attribution.findUniqueOrThrow({
      where: { user_id: owner.id },
    });
    assert.deepEqual(acquisition.campaigns, input(tokens[0]).campaigns);
    assert.deepEqual(acquisition.last_campaigns, input(tokens[0], "campaign_c").campaigns);
    assert.equal(acquisition.expires_at?.getTime(), at(97).getTime());
    const resolve = (paid: number, processed = paid) =>
      db.$transaction((tx) => consentedAcquisition(tx, owner.id, at(paid), at(processed), policy));
    assert.deepEqual((await resolve(45))?.campaigns, input(tokens[0]).campaigns);
    assert.equal(await resolve(97), null);
    await consent.revoke(owner.id, at(46));
    assert.equal(await resolve(45, 47), null);
    await assert.rejects(
      consent.grant(owner.id, { ...grant(tokens[0]), expected_revision: 2 }, at(47)),
    );

    await repo.captureGuest(input(tokens[1]), at(0));
    await assert.rejects(consent.grant(users[2].id, grant(tokens[1]), at(30)));
    await assert.rejects(repo.captureGuest(input(tokens[1]), at(30)));
    await repo.revokeGuest(tokens[2]);
    await assert.rejects(
      repo.captureGuest(input(tokens[2]), at(0)),
      "Revocation before a delayed capture blocks it",
    );
    await repo.captureGuest(input(tokens[3]), at(0));
    await Promise.allSettled([
      repo.revokeGuest(tokens[3]),
      repo.captureGuest(input(tokens[3], "campaign_b"), at(1)),
    ]);
    assert.equal((await row(tokens[3])).revoked, true);
    assert.deepEqual((await row(tokens[3])).first_campaigns, {});
    await repo.captureGuest(input(tokens[4]), at(0));
    await consent.grant(users[2].id, grant(tokens[4]), at(7));
    await repo.revokeGuest(tokens[4]);
    assert.equal(await db.marketing_attribution.count({ where: { user_id: users[2].id } }), 0);
    await repo.captureGuest(
      { ...input(tokens[5]), campaigns: { utm_campaign: "unapproved_clinical_text" } },
      at(0),
    );
    // Preserve consent independently of rejected campaign data.
    assert.deepEqual((await row(tokens[5])).first_campaigns, {});
    assert.deepEqual((await row(tokens[5])).last_campaigns, {});
    assert.equal((await row(tokens[5])).browser_fbp, null);
    await purgeExpiredAttribution(at(31));
    assert.equal(
      await db.marketing_guest_attribution.count({
        where: { token_hash: { in: tokens.map(attributionTokenHash) } },
      }),
      0,
    );
  } finally {
    await db.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
    await db.marketing_guest_attribution.deleteMany({
      where: { token_hash: { in: tokens.map(attributionTokenHash) } },
    });
    await db.$disconnect();
  }
});
