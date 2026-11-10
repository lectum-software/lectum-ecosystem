import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { STRIPE_API_VERSION } from "@/modules/billing/payment-gateway/stripe-config";
import { assertDisposableLocalDatabaseTarget } from "@/utils/local-database-safety";
import type { StripeEventRequeueArguments } from "./stripe-event-requeue-policy";

test("real isolated PostgreSQL requeues one reviewed event with atomic audit, CAS and no provider", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  assertDisposableLocalDatabaseTarget();
  const target = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["127.0.0.1", "localhost"].includes(target.hostname));
  assert.equal(target.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { requeueStripeEvent } = await import("./stripe-event-requeue-service");
  const suffix = randomUUID().replaceAll("-", "");
  const accountId = `acct_requeue${suffix}`;
  const beforeEnv = { ...process.env };
  // Configuration-shaped test data only. This command has no Stripe client/provider calls.
  Object.assign(process.env, {
    STRIPE_ENV: "test",
    STRIPE_ACCOUNT_ID: accountId,
    STRIPE_SECRET_KEY: "rk_test_localrequeuenoprovider",
    STRIPE_PUBLISHABLE_KEY: "pk_test_localrequeuenoprovider",
    STRIPE_WEBHOOK_SECRET: "",
  });
  let adminId: string | undefined;
  const eventIds: string[] = [];
  try {
    const actor = await prisma.admin.create({
      data: {
        name: "Operador QA local",
        email: `requeue-${suffix}@example.invalid`,
        active: true,
        confirmed: true,
      },
    });
    adminId = actor.id;
    const row = await prisma.billing_gateway_event.create({
      data: {
        gateway: "stripe",
        mode: "test",
        account_id: accountId,
        external_id: `evt_requeue${suffix}`,
        resource_id: `in_requeue${suffix}`,
        provider_subscription_id: `sub_requeue${suffix}`,
        type: "invoice.paid",
        api_version: STRIPE_API_VERSION,
        gateway_created_at: new Date(),
        state: "review_required",
        attempts: 10,
        next_attempt_at: new Date(Date.now() + 60_000),
        last_error_code: "reconciliation_unavailable",
      },
    });
    eventIds.push(row.id);
    const dry: StripeEventRequeueArguments = {
      eventId: row.id,
      accountId,
      mode: "test",
      expectedAttempts: 10,
      actorAdminId: actor.id,
      reason: "provider_recovered",
      apply: false,
    };
    const apply = { ...dry, apply: true, confirm: "test" as const };
    const auditCount = () => prisma.admin_activity_log.count({ where: { admin_id: actor.id } });
    assert.deepEqual(await requeueStripeEvent(dry), {
      mode: "test",
      eligible_events: 1,
      requeued_events: 0,
      applied: false,
      attempts_preserved: true,
      provider_calls: 0,
      worker_executed: false,
    });
    assert.deepEqual(
      await prisma.billing_gateway_event.findUniqueOrThrow({ where: { id: row.id } }),
      row,
    );
    assert.equal(await auditCount(), 0);
    for (const args of [
      { ...apply, expectedAttempts: 9 },
      { ...apply, accountId: `acct_other${suffix}` },
      { ...apply, mode: "live" as const, confirm: "live" as const },
      { ...apply, actorAdminId: `missing-${suffix}` },
      { ...apply, eventId: `missing-${suffix}` },
    ])
      await assert.rejects(requeueStripeEvent(args));
    for (const invalid of [
      { active: false },
      { confirmed: false },
      { deleted: true },
      { need_reset: true },
    ]) {
      await prisma.admin.update({ where: { id: actor.id }, data: invalid });
      await assert.rejects(requeueStripeEvent(apply));
      await prisma.admin.update({
        where: { id: actor.id },
        data: { active: true, confirmed: true, deleted: false, need_reset: false },
      });
    }
    for (const invalid of [
      { gateway: "mercadopago" },
      { account_id: `acct_other${suffix}` },
      { mode: "live" },
      { state: "complete" },
      { state: "pending" },
      { state: "processing" },
      { api_version: "2020-01-01" },
      { processed_at: new Date() },
      { lease_token: "expired-but-not-released", lease_until: new Date(0) },
      { lease_token: "held", lease_until: new Date(Date.now() + 60_000) },
      { last_error_code: "uncontrolled-diagnostic" },
    ]) {
      await prisma.billing_gateway_event.update({ where: { id: row.id }, data: invalid });
      await assert.rejects(requeueStripeEvent(apply));
      await prisma.billing_gateway_event.update({
        where: { id: row.id },
        data: {
          gateway: "stripe",
          account_id: accountId,
          mode: "test",
          state: "review_required",
          api_version: STRIPE_API_VERSION,
          processed_at: null,
          lease_token: null,
          lease_until: null,
          last_error_code: "reconciliation_unavailable",
        },
      });
    }
    assert.equal(await auditCount(), 0);
    const results = await Promise.allSettled([
      requeueStripeEvent(apply),
      requeueStripeEvent(apply),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(results.filter((r) => r.status === "rejected").length, 1);
    const saved = await prisma.billing_gateway_event.findUniqueOrThrow({ where: { id: row.id } });
    assert.equal(saved.state, "pending");
    assert.ok(saved.next_attempt_at.getTime() <= Date.now());
    assert.deepEqual({ ...saved, state: row.state, next_attempt_at: row.next_attempt_at }, row);
    const audit = await prisma.admin_activity_log.findFirstOrThrow({
      where: { admin_id: actor.id },
    });
    assert.equal(await auditCount(), 1);
    assert.equal(audit.target_id, row.id);
    assert.equal(audit.reason, "provider_recovered");
    assert.equal(audit.action, "stripe_event_requeued");
    assert.deepEqual(audit.safe_before, {
      state: "review_required",
      attempts: 10,
      last_error_code: row.last_error_code,
      next_attempt_at: row.next_attempt_at.toISOString(),
    });
    assert.deepEqual(audit.safe_after, {
      state: "pending",
      attempts: 10,
      last_error_code: row.last_error_code,
      next_attempt_at: saved.next_attempt_at.toISOString(),
    });
    const safeAudit = JSON.stringify([audit.safe_before, audit.safe_after, audit.metadata]);
    for (const privateValue of [row.external_id, row.resource_id, actor.email, accountId])
      assert.ok(!safeAudit.includes(privateValue));
    await assert.rejects(requeueStripeEvent(apply));
    assert.equal(await auditCount(), 1);
    const early = await prisma.billing_gateway_event.create({
      data: {
        ...row,
        id: `early-${suffix}`,
        external_id: `evt_early${suffix}`,
        attempts: 1,
        last_error_code: "setup_operation_conflict",
      },
    });
    eventIds.push(early.id);
    await requeueStripeEvent({
      ...apply,
      eventId: early.id,
      expectedAttempts: 1,
      reason: "binding_reconciled",
    });
    assert.equal(await auditCount(), 2);
    assert.equal(
      (await prisma.billing_gateway_event.findUniqueOrThrow({ where: { id: early.id } })).attempts,
      1,
    );
  } finally {
    // No published data is targeted; remove only records created under this unique local fixture.
    if (adminId) await prisma.admin_activity_log.deleteMany({ where: { admin_id: adminId } });
    await prisma.billing_gateway_event.deleteMany({ where: { id: { in: eventIds } } });
    if (adminId) await prisma.admin.delete({ where: { id: adminId } });
    process.env = beforeEnv;
    await prisma.$disconnect();
  }
});
