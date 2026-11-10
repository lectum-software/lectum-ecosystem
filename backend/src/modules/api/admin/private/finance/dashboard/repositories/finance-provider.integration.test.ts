import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("real isolated PostgreSQL Finance reads both providers and keeps Stripe contracted value", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { AdminFinanceDashboardRepository } = await import("./AdminFinanceDashboardRepository");
  const { mapSubscription, monthlyPriceCents } = await import(
    "../use-cases/services/subscriptions"
  );
  const { AdminDashboardRepository } = await import(
    "@/modules/api/admin/private/dashboard/summary/repositories/AdminDashboardRepository"
  );
  const tag = `finance-${randomUUID()}`;
  let userId: string | undefined;
  let profileId: string | undefined;
  let planId: string | undefined;
  try {
    const user = await prisma.user.create({
      data: { name: tag, email: `${tag}@example.invalid`, role: "psicologo", active: true },
    });
    userId = user.id;
    const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
    profileId = profile.id;
    const plan = await prisma.subscription_plan.create({
      data: { slug: tag, name: tag, price_cents: 5990, interval: "month", active: true },
    });
    planId = plan.id;
    const stripe = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profile.id,
        plan_id: plan.id,
        gateway: "stripe",
        source: "stripe",
        gateway_mode: "test",
        gateway_account_id: "acct_local_finance",
        gateway_subscription_id: `sub_${tag}`,
        status: "ativa",
        current_period_end: new Date(Date.now() + 86_400_000),
        contracted_amount_cents: 2990,
        contracted_currency: "BRL",
        contracted_interval: "month",
        contracted_interval_count: 1,
      },
    });
    const legacy = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profile.id,
        plan_id: plan.id,
        gateway: "mercadopago",
        source: "mercadopago",
        gateway_subscription_id: `mp_${tag}`,
        status: "ativa",
        current_period_end: new Date(Date.now() + 86_400_000),
      },
    });
    const repository = new AdminFinanceDashboardRepository();
    const range = { start: new Date(Date.now() - 60_000), end: new Date(Date.now() + 60_000) };
    const rows = await repository.listPaidSubscriptionsForRelation(range, {}, { q: user.email });
    assert.deepEqual(new Set(rows.map((row) => row.id)), new Set([stripe.id, legacy.id]));
    const contract = rows.find((row) => row.id === stripe.id)!;
    assert.equal(contract.plan.price_cents, 5990);
    assert.equal(mapSubscription(contract).plan.price_cents, 2990);
    assert.equal(monthlyPriceCents(contract), 2990);
    assert.equal(mapSubscription(contract).payment_history.available, false);
    assert.equal(monthlyPriceCents(rows.find((row) => row.id === legacy.id)!), 5990);
    const { AdminPsychologistDetailRepository } = await import(
      "@/modules/api/admin/private/psychologists/detail/repositories/AdminPsychologistDetailRepository"
    );
    const { buildAdminDetailSubscription } = await import(
      "@/modules/api/admin/private/psychologists/detail/use-cases/subscription-projection"
    );
    const detail = await new AdminPsychologistDetailRepository().findPsychologist(user.id);
    assert.ok(detail);
    const selected = detail.subscriptions.find((row) => row.id === stripe.id)!;
    assert.equal(buildAdminDetailSubscription(detail, selected).price_cents, 2990);
    assert.equal(
      buildAdminDetailSubscription(detail, selected).time_to_first_paid_subscription.status,
      "unavailable",
    );
    const { AdminPsychologistsListProfilesRepository } = await import(
      "@/modules/api/admin/private/psychologists/list/repositories/queries/AdminPsychologistsListProfilesRepository"
    );
    const directory =
      await new AdminPsychologistsListProfilesRepository().listPsychologistProfiles();
    assert.equal(
      directory
        .find((row) => row.id === profile.id)
        ?.subscriptions.find((row) => row.id === stripe.id)?.plan.price_cents,
      2990,
    );
    const { AdminPsychologistsDashboardDirectoryRepository } = await import(
      "@/modules/api/admin/private/psychologists/dashboard/repositories/queries/AdminPsychologistsDashboardDirectoryRepository"
    );
    const dashboardDirectory =
      await new AdminPsychologistsDashboardDirectoryRepository().listPsychologistProfiles(range);
    assert.equal(
      dashboardDirectory
        .find((row) => row.id === profile.id)
        ?.subscriptions.find((row) => row.id === stripe.id)?.plan.price_cents,
      2990,
    );
    const active = await repository.listActivePaidSubscriptionsAt(new Date());
    assert.ok(active.some((row) => row.id === stripe.id));
    const general = await new AdminDashboardRepository().listPaidSubscriptionsUntil(range.end);
    assert.equal(general.find((row) => row.id === stripe.id)?.contracted_amount_cents, 2990);
    await prisma.subscription_plan.update({ where: { id: plan.id }, data: { price_cents: 9990 } });
    const refreshed = await repository.listPaidSubscriptionsForRelation(
      range,
      {},
      { q: user.email },
    );
    assert.equal(
      mapSubscription(refreshed.find((row) => row.id === stripe.id)!).plan.price_cents,
      2990,
    );
    const { estimateMrrAt } = await import(
      "@/modules/api/admin/private/dashboard/summary/use-cases/services/conversion-finance"
    );
    const historicalDate = new Date(Date.now() - 7 * 86_400_000);
    await prisma.professional_subscription.update({
      where: { id: stripe.id },
      data: { createdAt: new Date(Date.now() - 14 * 86_400_000) },
    });
    const historicalRows = await repository.listActivePaidSubscriptionsAt(historicalDate);
    const historicalStripe = historicalRows.find((row) => row.id === stripe.id);
    assert.ok(historicalStripe, "the current snapshot alone cannot prove when paid access began");
    assert.equal(
      estimateMrrAt([historicalStripe], historicalDate).mrrCents,
      null,
      "a current paid Stripe snapshot cannot fabricate historical MRR from its reservation date",
    );
    await prisma.professional_subscription.update({
      where: { id: stripe.id },
      data: { contracted_amount_cents: null, createdAt: stripe.createdAt },
    });
    const invalid = await repository.listPaidSubscriptionsForRelation(range, {}, { q: user.email });
    assert.equal(
      mapSubscription(invalid.find((row) => row.id === stripe.id)!).plan.price_cents,
      null,
    );
  } finally {
    if (profileId) {
      await prisma.professional_subscription.deleteMany({ where: { psychologist_id: profileId } });
      await prisma.professional_subscription_history.deleteMany({
        where: { psychologist_id: profileId },
      });
      await prisma.psychologist_profile.deleteMany({ where: { id: profileId } });
    }
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    if (planId) {
      await prisma.subscription_plan.deleteMany({ where: { id: planId } });
      await prisma.subscription_plan_history.deleteMany({ where: { plan_id: planId } });
    }
    await prisma.$disconnect();
  }
});
