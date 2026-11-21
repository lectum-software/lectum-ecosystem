import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("PostgreSQL: delayed evidence stays recoverable; repeated storage failures are retained for review", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: db } = await import("@/infra/database/prisma");
  const { SubscribeJobs } = await import("./subscribe-jobs");
  const identity = { mode: "live" as const, accountId: `acct_${randomUUID()}` };
  const event = await db.billing_gateway_event.create({
    data: {
      gateway: "stripe",
      mode: identity.mode,
      account_id: identity.accountId,
      external_id: `evt_${randomUUID()}`,
      resource_id: "in_disposable",
      type: "invoice.paid",
      state: "pending",
      gateway_created_at: new Date(),
    },
  });
  const jobs = new SubscribeJobs();
  try {
    let now = new Date(Date.now() + 1000);
    await jobs.discover(identity, new Date(now.getTime() - 60_000));
    assert.equal(await jobs.claim({ ...identity, accountId: "different_account" }, now), null);
    for (let attempt = 1; attempt <= 13; attempt++) {
      const job = await jobs.claim(identity, now);
      assert.ok(job);
      await jobs.process(job, identity, now);
      const stored = await db.marketing_subscribe_job.findUniqueOrThrow({ where: { id: job.id } });
      assert.equal(stored.state, "pending");
      assert.equal(stored.last_error_code, "evidence_pending");
      assert.equal(stored.attempts, attempt);
      assert.ok(stored.next_attempt_at.getTime() - now.getTime() <= 3_600_000);
      now = new Date(stored.next_attempt_at.getTime() + 1);
    }
    const exhausted = await jobs.claim(identity, now);
    assert.ok(exhausted);
    await jobs.defer(exhausted, "storage_unavailable", now);
    const retained = await db.marketing_subscribe_job.findUniqueOrThrow({
      where: { id: exhausted.id },
    });
    assert.equal(retained.state, "review_required");
    assert.equal(retained.last_error_code, "storage_unavailable");
    assert.equal(await jobs.claim(identity, new Date(now.getTime() + 86_400_000)), null);
    assert.equal(await jobs.discover(identity, new Date(0)), 0);
  } finally {
    await db.billing_gateway_event.delete({ where: { id: event.id } });
    await db.$disconnect();
  }
});
