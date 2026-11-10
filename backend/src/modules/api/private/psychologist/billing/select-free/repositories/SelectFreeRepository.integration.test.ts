import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("real PostgreSQL select-free preserves external contracts and serializes with checkout", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { SelectFreeRepository } = await import("./SelectFreeRepository");
  const tag = `select-free-qa-${randomUUID()}`;
  let userId: string | undefined;
  let profileId: string | undefined;
  const createdPlanIds: string[] = [];
  let concurrentSelection: Promise<unknown> | undefined;
  try {
    const user = await prisma.user.create({
      data: { name: tag, email: `${tag}@example.invalid`, role: "psicologo", active: true },
    });
    userId = user.id;
    const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
    profileId = profile.id;
    let free = await prisma.subscription_plan.findUnique({ where: { slug: "gratuito" } });
    if (!free) {
      free = await prisma.subscription_plan.create({
        data: { name: tag, slug: "gratuito", price_cents: 0, active: true },
      });
      createdPlanIds.push(free.id);
    }
    assert.equal(free.active && !free.deleted, true);
    const paid = await prisma.subscription_plan.create({
      data: { name: tag, slug: tag, price_cents: 2990, active: true },
    });
    createdPlanIds.push(paid.id);
    const repository = new SelectFreeRepository();
    const select = () => repository.createFreeSubscription(profile.id, free.id);
    const external = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profile.id,
        plan_id: paid.id,
        gateway: "stripe",
        source: "stripe",
        gateway_subscription_id: `sub_${tag}`,
        status: "inadimplente",
        current_period_end: new Date(Date.now() - 60_000),
      },
    });
    for (const gateway of ["stripe", "mercadopago"]) {
      for (const status of ["ativa", "inativa", "inadimplente"]) {
        await prisma.professional_subscription.update({
          where: { id: external.id },
          data: { gateway, source: gateway, status },
        });
        assert.deepEqual(await select(), { type: "operation_conflict" });
        assert.equal(
          (await prisma.professional_subscription.findUniqueOrThrow({ where: { id: external.id } }))
            .status,
          status,
        );
      }
    }
    await prisma.professional_subscription.update({
      where: { id: external.id },
      data: { status: "cancelada", current_period_end: new Date(Date.now() + 60_000) },
    });
    assert.deepEqual(await select(), { type: "entitlement_conflict" });
    await prisma.professional_subscription.update({
      where: { id: external.id },
      data: { current_period_end: new Date(Date.now() - 60_000) },
    });
    const legacy = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profile.id,
        plan_id: paid.id,
        source: "admin_grant",
        status: "inativa",
      },
    });
    // An external contract without a known remote ID is also never locally canceled here.
    const unbound = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profile.id,
        plan_id: paid.id,
        source: "mercadopago",
        gateway: "mercadopago",
        status: "inativa",
      },
    });
    const selected = await select();
    assert.equal(selected.type, "selected");
    assert.equal(
      (await prisma.professional_subscription.findUniqueOrThrow({ where: { id: legacy.id } }))
        .status,
      "cancelada",
    );
    assert.equal(
      (await prisma.professional_subscription.findUniqueOrThrow({ where: { id: unbound.id } }))
        .status,
      "inativa",
    );
    const again = await select();
    assert.ok(selected.type === "selected" && again.type === "selected");
    assert.equal(selected.current.id, again.current.id);

    const pending = await prisma.billing_operation.create({
      data: {
        user_id: user.id,
        psychologist_id: profile.id,
        gateway: "stripe",
        mode: "test",
        account_id: "acct_local_select_free",
        kind: "checkout",
        request_key: randomUUID(),
      },
    });
    for (const state of [
      "reserved",
      "creating",
      "requires_confirmation",
      "processing",
      "review_required",
    ]) {
      await prisma.billing_operation.update({ where: { id: pending.id }, data: { state } });
      assert.deepEqual(
        await select(),
        { type: "operation_conflict" },
        "existing free cannot bypass unresolved payment",
      );
    }
    await prisma.billing_operation.update({ where: { id: pending.id }, data: { state: "failed" } });

    await prisma.$transaction(
      async (tx) => {
        // The exact profile MVCC lock taken by reserveCheckout, no provider call.
        await tx.$executeRaw`UPDATE psychologist_profiles SET updated_at = updated_at WHERE id = ${profile.id}`;
        await tx.billing_operation.update({
          where: { id: pending.id },
          data: { state: "creating" },
        });
        concurrentSelection = select();
        let waiting = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          const rows = await prisma.$queryRaw<Array<{ count: number }>>`
          SELECT count(*)::int AS count FROM pg_stat_activity
          WHERE datname = current_database() AND wait_event_type = 'Lock'
          AND query LIKE '%RETURNING p.user_id%'`;
          if (rows[0]?.count) {
            waiting = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        assert.equal(waiting, true, "selection must wait for checkout's profile lock");
      },
      { timeout: 10_000 },
    );
    assert.deepEqual(await concurrentSelection, { type: "operation_conflict" });
    assert.equal(
      await prisma.professional_subscription.count({
        where: { psychologist_id: profile.id, plan_id: free.id, status: "ativa" },
      }),
      1,
    );
  } finally {
    await concurrentSelection;
    if (userId) await prisma.billing_operation.deleteMany({ where: { user_id: userId } });
    if (profileId) {
      await prisma.professional_subscription.deleteMany({ where: { psychologist_id: profileId } });
      await prisma.psychologist_profile.deleteMany({ where: { id: profileId } });
    }
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    for (const id of createdPlanIds.reverse())
      await prisma.subscription_plan.delete({ where: { id } });
    await prisma.$disconnect();
  }
});
