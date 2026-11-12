import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type { billing_gateway_event } from "@/external/generated/prisma/client";
import { STRIPE_API_VERSION } from "../payment-gateway/stripe-config";
import { StripeGatewayError } from "../payment-gateway/stripe-error";
import { stripeCreditCardRequestHash } from "../payment-gateway/stripe-idempotency";
import type { StripeWebhookReference } from "../payment-gateway/stripe-types";

test("real isolated PG enriches one exact inbox proof monotonically without reopening state or lease", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "32768");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { StripeInboxRepository } = await import("./inbox-repository");
  const repository = new StripeInboxRepository();
  const suffix = randomUUID().replaceAll("-", "");
  const identity = { accountId: `acct_proof${suffix}`, mode: "test" as const };
  const otherAccount = `acct_other${suffix}`;
  const event: StripeWebhookReference = {
    ...identity,
    eventId: `evt_proof${suffix}`,
    resourceId: `seti_proof${suffix}`,
    type: "setup_intent.succeeded",
    apiVersion: STRIPE_API_VERSION,
    subscriptionId: null,
    created: new Date("2026-11-11T12:30:00.000Z"),
  };
  const proof = stripeCreditCardRequestHash(identity, `sub_${suffix}`, `pm_${suffix}`);
  const conflictingProof = "b".repeat(64);
  const withoutProof = ({ request_idempotency_key_hash: _, ...row }: billing_gateway_event) => row;
  try {
    const original = await repository.enqueue(event);
    assert.equal(original.request_idempotency_key_hash, null);
    const reviewed = await prisma.billing_gateway_event.update({
      where: { id: original.id },
      data: {
        state: "review_required",
        attempts: 10,
        last_error_code: "setup_operation_unresolved",
        lease_token: `lease-${suffix}`,
        lease_until: new Date(Date.now() + 180_000),
        next_attempt_at: new Date(Date.now() + 3600_000),
      },
    });
    const enriched = await Promise.all(
      Array.from({ length: 6 }, () => repository.enqueue({ ...event, requestKeyHash: proof })),
    );
    for (const row of enriched) {
      assert.equal(row.request_idempotency_key_hash, proof);
      assert.deepEqual(withoutProof(row), withoutProof(reviewed));
    }
    const baseline = await prisma.billing_gateway_event.findUniqueOrThrow({
      where: { id: original.id },
    });
    assert.deepEqual(
      await repository.enqueue(event),
      baseline,
      "old-version delivery must not erase proof",
    );
    assert.deepEqual(await repository.enqueue({ ...event, requestKeyHash: proof }), baseline);
    const mismatches: Array<Partial<StripeWebhookReference>> = [
      { requestKeyHash: conflictingProof },
      { resourceId: `seti_other${suffix}` },
      { type: "setup_intent.canceled" },
      { apiVersion: "mismatched" },
      { subscriptionId: `sub_other${suffix}` },
      { created: new Date(event.created.getTime() + 1) },
    ];
    for (const mismatch of mismatches) {
      await assert.rejects(
        repository.enqueue({ ...event, requestKeyHash: proof, ...mismatch }),
        StripeGatewayError,
      );
      assert.deepEqual(
        await prisma.billing_gateway_event.findUniqueOrThrow({ where: { id: original.id } }),
        baseline,
      );
    }
    const completed = await prisma.billing_gateway_event.update({
      where: { id: original.id },
      data: { state: "complete", processed_at: new Date(), lease_token: null, lease_until: null },
    });
    assert.deepEqual(await repository.enqueue({ ...event, requestKeyHash: proof }), completed);

    const scoped = await repository.enqueue({
      ...event,
      accountId: otherAccount,
      requestKeyHash: conflictingProof,
    });
    assert.notEqual(scoped.id, original.id);
    assert.equal(scoped.request_idempotency_key_hash, conflictingProof);
    assert.equal(
      (await prisma.billing_gateway_event.findUniqueOrThrow({ where: { id: original.id } }))
        .request_idempotency_key_hash,
      proof,
    );

    const raceEvent = { ...event, eventId: `evt_race${suffix}` };
    const race = await repository.enqueue(raceEvent);
    const results = await Promise.allSettled([
      repository.enqueue({ ...raceEvent, requestKeyHash: proof }),
      repository.enqueue({ ...raceEvent, requestKeyHash: conflictingProof }),
    ]);
    assert.equal(results.filter((row) => row.status === "fulfilled").length, 1);
    assert.equal(results.filter((row) => row.status === "rejected").length, 1);
    const winner = await prisma.billing_gateway_event.findUniqueOrThrow({ where: { id: race.id } });
    assert.ok([proof, conflictingProof].includes(winner.request_idempotency_key_hash!));
    assert.deepEqual(withoutProof(winner), withoutProof(race));
    await assert.rejects(
      prisma.billing_gateway_event.update({
        where: { id: race.id },
        data: { request_idempotency_key_hash: "malformed" },
      }),
    );
    assert.deepEqual(
      await prisma.billing_gateway_event.findUniqueOrThrow({ where: { id: race.id } }),
      winner,
    );
    await assert.rejects(
      repository.enqueue({ ...event, eventId: `evt_invalid${suffix}`, requestKeyHash: "invalid" }),
      StripeGatewayError,
    );
    assert.equal(
      await prisma.billing_gateway_event.count({ where: { external_id: `evt_invalid${suffix}` } }),
      0,
    );
  } finally {
    // Only this run's random scoped event fixtures. No operation, receipt, user or provider was created.
    await prisma.billing_gateway_event.deleteMany({
      where: {
        gateway: "stripe",
        mode: "test",
        account_id: { in: [identity.accountId, otherAccount] },
      },
    });
    await prisma.$disconnect();
  }
});
