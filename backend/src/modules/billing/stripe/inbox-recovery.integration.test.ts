import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("real PostgreSQL recovers abandoned inbox leases and persists backoff without stale ACK or replay", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { StripeInboxRepository } = await import("./inbox-repository");
  const { nextInboxAttempt } = await import("./policy");
  const tag = randomUUID().replaceAll("-", "");
  const identity = { accountId: `acct_local${tag}`, mode: "test" as const };
  const repository = new StripeInboxRepository();
  const scope = { gateway: "stripe", account_id: identity.accountId, mode: identity.mode };
  // Database-only references and controlled lease dates. No provider request, clock, or payment proof.
  const event = {
    ...identity,
    eventId: `evt_local${tag}`,
    type: "invoice.payment_succeeded",
    resourceId: `in_local${tag}`,
    subscriptionId: `sub_local${tag}`,
    apiVersion: "2026-10-28.endive",
    created: new Date(),
  };
  let rowId: string | undefined;
  try {
    const stored = await repository.enqueue(event);
    rowId = stored.id;
    const firstAt = new Date(Math.max(Date.now(), stored.next_attempt_at.getTime()));
    const crashed = await repository.claim(identity, firstAt);
    assert.ok(crashed);
    assert.equal(crashed.attempts, 1);
    const persistedLease = await prisma.billing_gateway_event.findUniqueOrThrow({
      where: { id: rowId },
    });
    assert.equal(persistedLease.state, "processing");
    assert.equal(persistedLease.lease_token, crashed.lease_token);
    assert.equal(persistedLease.processed_at, null);

    // The first worker exits without finish. Delivery during its lease cannot clear or duplicate it.
    assert.equal((await repository.enqueue(event)).id, rowId);
    assert.equal(
      await repository.claim(identity, new Date(crashed.lease_until.getTime() - 1)),
      null,
    );
    const reclaimedAt = crashed.lease_until;
    const recovered = await repository.claim(identity, reclaimedAt);
    assert.ok(recovered);
    assert.equal(recovered.id, rowId);
    assert.equal(recovered.attempts, 2);
    assert.notEqual(recovered.lease_token, crashed.lease_token);
    assert.equal(
      (
        await repository.finish(rowId, crashed.lease_token, {
          state: "complete",
          processed_at: reclaimedAt,
        })
      ).count,
      0,
      "late worker must not acknowledge the reclaimed event",
    );

    // Persist the same retry decision used for unavailable canonical reads; no transport is mocked.
    const retryAt = nextInboxAttempt(recovered.attempts, reclaimedAt);
    assert.ok(retryAt > reclaimedAt);
    assert.equal(
      (
        await repository.finish(rowId, recovered.lease_token, {
          state: "pending",
          next_attempt_at: retryAt,
          last_error_code: "reconciliation_unavailable",
        })
      ).count,
      1,
    );
    const deferred = await prisma.billing_gateway_event.findUniqueOrThrow({ where: { id: rowId } });
    assert.equal(deferred.state, "pending");
    assert.equal(deferred.processed_at, null);
    assert.equal(deferred.lease_token, null);
    assert.equal(deferred.lease_until, null);
    assert.equal(deferred.last_error_code, "reconciliation_unavailable");
    assert.deepEqual(deferred.next_attempt_at, retryAt);
    assert.equal((await repository.enqueue(event)).id, rowId);
    assert.equal(await repository.claim(identity, new Date(retryAt.getTime() - 1)), null);

    const retried = await repository.claim(identity, retryAt);
    assert.ok(retried);
    assert.equal(retried.attempts, 3);
    assert.equal(retried.resource_id, event.resourceId);
    assert.equal(retried.external_id, event.eventId);
    assert.equal(retried.provider_subscription_id, event.subscriptionId);
    assert.equal(retried.api_version, event.apiVersion);
    assert.deepEqual(retried.gateway_created_at, event.created);
    assert.equal(
      (
        await repository.finish(rowId, retried.lease_token, {
          state: "complete",
          processed_at: retryAt,
          last_error_code: null,
        })
      ).count,
      1,
    );
    assert.equal(
      (
        await repository.finish(rowId, recovered.lease_token, {
          state: "pending",
          last_error_code: "reconciliation_unavailable",
        })
      ).count,
      0,
      "late failure must not reopen completed work",
    );
    const replay = await repository.enqueue(event);
    assert.equal(replay.state, "complete");
    assert.equal(replay.attempts, 3);
    assert.deepEqual(replay.processed_at, retryAt);
    assert.equal(await repository.claim(identity, new Date(retryAt.getTime() + 1)), null);
    assert.equal(await prisma.billing_gateway_event.count({ where: scope }), 1);
  } finally {
    // Only this run's known fixture. Existing sandbox events, operations, and receipts are untouched.
    if (rowId) await prisma.billing_gateway_event.deleteMany({ where: { id: rowId, ...scope } });
    await prisma.$disconnect();
  }
});
