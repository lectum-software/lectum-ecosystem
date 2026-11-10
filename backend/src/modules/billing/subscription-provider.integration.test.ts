import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("real PostgreSQL blocks courtesy and deletion while a Stripe operation is unresolved", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { grantProfessionalSubscription } = await import(
    "@/operations/subscriptions/grant-professional-subscription-service"
  );
  const { AccountRepository } = await import(
    "@/modules/api/private/account/repositories/AccountRepository"
  );
  const tag = `lifecycle-${randomUUID()}`;
  let userId: string | undefined;
  let profileId: string | undefined;
  let concurrentGrant: Promise<unknown> | undefined;
  try {
    const user = await prisma.user.create({
      data: { name: tag, email: `${tag}@example.invalid`, role: "psicologo", active: true },
    });
    userId = user.id;
    const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
    profileId = profile.id;
    await prisma.subscription_plan.findFirstOrThrow({
      where: { slug: "profissional", active: true, deleted: false },
    });
    const grant = () =>
      grantProfessionalSubscription({
        actor: "Local regression",
        days: 30,
        psychologistProfileId: profile.id,
      });
    const operation = await prisma.$transaction(
      async (tx) => {
        // Same MVCC write/lock used by checkout reservation, without a provider request.
        await tx.$executeRaw`UPDATE psychologist_profiles SET updated_at = updated_at WHERE id = ${profile.id}`;
        const operation = await tx.billing_operation.create({
          data: {
            user_id: user.id,
            psychologist_id: profile.id,
            gateway: "stripe",
            mode: "test",
            account_id: "acct_local_lifecycle",
            kind: "checkout",
            request_key: randomUUID(),
            state: "review_required",
          },
        });
        concurrentGrant = grant().then(
          () => null,
          (error: unknown) => error,
        );
        let waiting = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          const rows = await prisma.$queryRaw<Array<{ count: number }>>`
          SELECT count(*)::int AS count FROM pg_stat_activity
          WHERE datname = current_database() AND wait_event_type = 'Lock'
          AND query LIKE '%FOR UPDATE OF p%'`;
          if (rows[0]?.count) {
            waiting = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        assert.equal(
          waiting,
          true,
          "real grant transaction must wait for the checkout profile lock",
        );
        return operation;
      },
      { timeout: 10_000 },
    );
    const conflict = await concurrentGrant;
    assert.ok(conflict instanceof Error);
    assert.equal(
      conflict.message === "external_billing_subscription_blocks_admin_grant",
      true,
      "serialization retry must reach the business guard",
    );
    await assert.rejects(grant, /external_billing_subscription_blocks_admin_grant/);
    const account = new AccountRepository();
    assert.equal(await account.hasOpenBillingOperation(user.id), true);
    await assert.rejects(() => account.deleteOwnAccount(user), /ACCOUNT_BILLING_CONFLICT/);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).deleted, false);
    assert.equal(
      await prisma.professional_subscription.count({ where: { psychologist_id: profile.id } }),
      0,
    );
    await prisma.billing_operation.update({
      where: { id: operation.id },
      data: { state: "failed", completed_at: new Date() },
    });
    assert.equal(await account.hasOpenBillingOperation(user.id), false);
    const granted = await grant();
    assert.equal(granted.subscription.source, "admin_grant");
    assert.equal(
      await prisma.professional_subscription.count({
        where: { psychologist_id: profile.id, gateway: { not: null } },
      }),
      0,
    );
  } finally {
    await concurrentGrant;
    if (userId) await prisma.billing_operation.deleteMany({ where: { user_id: userId } });
    if (profileId) {
      await prisma.professional_registry_check.deleteMany({
        where: { psychologist_id: profileId },
      });
      await prisma.professional_subscription.deleteMany({ where: { psychologist_id: profileId } });
      await prisma.professional_subscription_history.deleteMany({
        where: { psychologist_id: profileId },
      });
      await prisma.psychologist_profile.deleteMany({ where: { id: profileId } });
    }
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
