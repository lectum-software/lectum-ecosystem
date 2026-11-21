import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";

test("PostgreSQL: delivery metadata deduplication, fenced recovery, expiry and disabled entry points", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: db } = await import("@/infra/database/prisma");
  const { MarketingDeliveryJobs, enqueueMetaDelivery, processNextMetaDelivery } = await import(
    "./delivery-jobs"
  );
  const jobs = new MarketingDeliveryJobs();
  const tag = randomUUID();
  const now = new Date();
  const { MARKETING_CONSENT_POLICY } = await import("./consent-policy");
  const { MarketingConsentRepository } = await import("./consent-repository");
  const user = await db.user.create({
    data: { name: "Disposable delivery", email: `${tag}@example.invalid`, role: "psicologo" },
  });
  const consentRepo = new MarketingConsentRepository();
  await consentRepo.grant(
    user.id,
    {
      accepted: true,
      document_version: MARKETING_CONSENT_POLICY.documentVersion!,
      expected_revision: 0,
    },
    new Date(now.getTime() - 1000),
  );
  const reference = {
    eventId: randomBytes(32).toString("hex"),
    conversion: "professional_subscription" as const,
    sourceRef: tag,
    occurredAt: now,
    userId: user.id,
    consentRevision: 1,
  };
  try {
    // This test exercises global claim/retention only on an otherwise empty local queue.
    assert.equal(await db.marketing_delivery_job.count(), 0);
    assert.deepEqual(await enqueueMetaDelivery(reference), { status: "blocked" });
    assert.deepEqual(
      await processNextMetaDelivery(async () => {
        throw new Error("resolver_must_not_run");
      }),
      { status: "blocked" },
    );
    assert.equal(await db.marketing_delivery_job.count(), 0);

    const rows = await Promise.all(Array.from({ length: 8 }, () => jobs.enqueue(reference, now)));
    assert.equal(new Set(rows.map((row) => row.id)).size, 1);
    assert.equal(await db.marketing_delivery_job.count(), 1);
    await assert.rejects(
      jobs.enqueue({ ...reference, eventId: randomBytes(32).toString("hex") }, now),
      /identity_conflict/,
    );
    await assert.rejects(
      jobs.enqueue({ ...reference, occurredAt: new Date(now.getTime() - 1) }, now),
      /identity_conflict/,
    );

    const claims = await Promise.all([jobs.claim(now), jobs.claim(now)]);
    assert.equal(claims.filter(Boolean).length, 1);
    const first = claims.find(Boolean)!;
    assert.equal(await jobs.claim(new Date(now.getTime() + 119_000)), null);
    const takeoverAt = new Date(now.getTime() + 120_001);
    await db.$disconnect();
    const recovered = await new MarketingDeliveryJobs().claim(takeoverAt);
    assert.ok(recovered);
    assert.equal(recovered.event_id, first.event_id);
    assert.notEqual(recovered.lease_token, first.lease_token);
    assert.equal((await jobs.settle(first, "sent", takeoverAt)).count, 0);
    assert.equal((await jobs.settle(first, "retry", takeoverAt)).count, 0);
    assert.equal((await jobs.settle(recovered, "retry", takeoverAt)).count, 1);

    let pending = await db.marketing_delivery_job.findUniqueOrThrow({
      where: { id: recovered.id },
    });
    assert.equal(pending.state, "pending");
    assert.equal(await jobs.claim(new Date(pending.next_attempt_at.getTime() - 1)), null);
    while (pending.state === "pending") {
      const claimed = await jobs.claim(pending.next_attempt_at);
      assert.ok(claimed);
      await jobs.settle(claimed, "retry", pending.next_attempt_at);
      pending = await db.marketing_delivery_job.findUniqueOrThrow({ where: { id: recovered.id } });
    }
    assert.equal(pending.state, "review_required");
    assert.equal(pending.attempts, 12);

    const acknowledged = {
      ...reference,
      sourceRef: `${tag}_ack`,
      eventId: randomBytes(32).toString("hex"),
    };
    const ackRow = await jobs.enqueue(acknowledged, now);
    const ackClaim = await jobs.claim(now);
    assert.ok(ackClaim);
    assert.equal(ackClaim.id, ackRow.id);
    // Storage acknowledgement only: no provider delivery is simulated or claimed.
    assert.equal((await jobs.settle(ackClaim, "sent", now)).count, 1);
    assert.equal((await jobs.settle(ackClaim, "retry", now)).count, 0);
    assert.equal((await jobs.enqueue(acknowledged, now)).state, "sent");
    assert.equal(await jobs.claim(now), null);

    const day = 86_400_000;
    const expiredAt = new Date(now.getTime() + 7 * day);
    await jobs.expireAndPurge(expiredAt);
    assert.equal(
      (await db.marketing_delivery_job.findUniqueOrThrow({ where: { id: recovered.id } })).state,
      "expired",
    );
    assert.equal(await jobs.claim(expiredAt), null);
    await assert.rejects(jobs.enqueue(reference, expiredAt), /invalid_time/);
    await jobs.expireAndPurge(new Date(now.getTime() + 30 * day));
    assert.equal(await db.marketing_delivery_job.count(), 0);
    const revokeRef = {
      ...reference,
      sourceRef: `${tag}_revoke`,
      eventId: randomBytes(32).toString("hex"),
    };
    await jobs.enqueue(revokeRef, now);
    const revokeClaim = await jobs.claim(now);
    assert.ok(revokeClaim);
    await consentRepo.revoke(user.id, new Date(now.getTime() + 1));
    assert.equal(await db.marketing_delivery_job.count(), 0);
    assert.equal((await jobs.settle(revokeClaim, "retry", now)).count, 0);
    await assert.rejects(jobs.enqueue(revokeRef, now), /consent_required/);
    await consentRepo.grant(
      user.id,
      {
        accepted: true,
        document_version: MARKETING_CONSENT_POLICY.documentVersion!,
        expected_revision: 2,
      },
      new Date(now.getTime() + 2),
    );
    await assert.rejects(jobs.enqueue(revokeRef, new Date(now.getTime() + 3)), /consent_required/);
    const raceRef = { ...revokeRef, consentRevision: 3, occurredAt: new Date(now.getTime() + 3) };
    await Promise.allSettled([
      jobs.enqueue(raceRef, new Date(now.getTime() + 4)),
      consentRepo.revoke(user.id, new Date(now.getTime() + 4)),
    ]);
    assert.equal(
      (await db.marketing_consent.findUniqueOrThrow({ where: { user_id: user.id } })).revision,
      4,
    );
    assert.equal(await db.marketing_delivery_job.count(), 0);

    // Represents a job whose consent has since expired; only maintenance is enabled.
    await db.marketing_consent.update({
      where: { user_id: user.id },
      data: {
        revoked_at: null,
        granted_at: new Date(now.getTime() - 2000),
        expires_at: new Date(now.getTime() - 1000),
      },
    });
    await db.marketing_delivery_job.create({
      data: {
        user_id: user.id,
        consent_revision: 4,
        event_id: randomBytes(32).toString("hex"),
        source_ref: `${tag}_expired_consent`,
        conversion: reference.conversion,
        occurred_at: now,
        expires_at: new Date(now.getTime() + day),
      },
    });
    const { startAttributionRetention, stopAttributionRetention } = await import(
      "./attribution-retention"
    );
    const previous = process.env.MARKETING_ATTRIBUTION_RETENTION_ENABLED;
    try {
      process.env.MARKETING_ATTRIBUTION_RETENTION_ENABLED = "false";
      startAttributionRetention();
      await stopAttributionRetention();
      assert.equal(await db.marketing_delivery_job.count(), 1);
      process.env.MARKETING_ATTRIBUTION_RETENTION_ENABLED = "true";
      startAttributionRetention();
      await stopAttributionRetention();
      assert.equal(await db.marketing_delivery_job.count(), 0);
    } finally {
      await stopAttributionRetention();
      if (previous === undefined) delete process.env.MARKETING_ATTRIBUTION_RETENTION_ENABLED;
      else process.env.MARKETING_ATTRIBUTION_RETENTION_ENABLED = previous;
    }
  } finally {
    await db.marketing_delivery_job.deleteMany({ where: { source_ref: { startsWith: tag } } });
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
