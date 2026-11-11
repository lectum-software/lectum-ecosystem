import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("plan catalog uses one real readonly PG snapshot and rejects cross-scope price bindings", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(process.env.NODE_ENV, "test");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "32768");
  assert.equal(url.pathname, "/lectum_stripe_test");
  assert.ok(!process.env.STRIPE_SECRET_KEY);
  assert.ok(!process.env.SENDNF_API_KEY);
  const { default: prisma } = await import("@/infra/database/prisma");
  const { Prisma } = await import("@/external/generated/prisma/client");
  const { readPlanAdmissionCatalog } = await import("./PlansRepository");
  const tag = randomUUID().replaceAll("-", "");
  const identity = { accountId: `acct_plan${tag}`, mode: "test" as const };
  const scope = { account_id: identity.accountId, mode: identity.mode, gateway: "stripe" };
  let planId: string | undefined;
  let offerId: string | undefined;
  const priceIds: string[] = [];
  try {
    const plan = await prisma.subscription_plan.create({
      data: {
        slug: `plan-admission-${tag}`,
        name: "Local catalog verification",
        price_cents: 2990,
        active: false,
      },
    });
    planId = plan.id;
    const createPrice = async (
      overrides: Partial<{ amount_cents: number; account_id: string }> = {},
    ) => {
      const row = await prisma.billing_price_version.create({
        data: {
          ...scope,
          plan_id: plan.id,
          external_product_id: `prod_local${tag}`,
          external_price_id: `price_local${tag}${priceIds.length}`,
          amount_cents: 3990,
          currency: "BRL",
          interval: "month",
          ...overrides,
        },
      });
      priceIds.push(row.id);
      return row;
    };
    const first = await createPrice();
    const second = await createPrice({ amount_cents: 4990 });
    const offer = await prisma.billing_offer.create({
      data: {
        ...scope,
        plan_id: plan.id,
        price_version_id: first.id,
        checkout_enabled: true,
        revision: 1,
      },
    });
    offerId = offer.id;
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const initial = await readPlanAdmissionCatalog(tx, plan.id, identity);
        assert.equal(initial.price?.amount_cents, 3990);
        await prisma.billing_offer.update({
          where: { id: offer.id },
          data: { revision: 2, price_version_id: second.id, checkout_enabled: false },
        });
        assert.deepEqual(await readPlanAdmissionCatalog(tx, plan.id, identity), initial);
        assert.deepEqual(
          await readPlanAdmissionCatalog(tx, plan.id, { ...identity, accountId: "acct_another" }),
          { offer: null, price: null },
        );
        assert.deepEqual(
          await readPlanAdmissionCatalog(tx, plan.id, { ...identity, mode: "live" }),
          { offer: null, price: null },
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    const published = await prisma.$transaction((tx) =>
      readPlanAdmissionCatalog(tx, plan.id, identity),
    );
    assert.equal(published.price?.amount_cents, 4990);
    assert.equal(published.offer?.revision, 2);
    assert.equal(published.offer?.checkout_enabled, false);
    const foreign = await createPrice({ account_id: "acct_another" });
    await prisma.billing_offer.update({
      where: { id: offer.id },
      data: { price_version_id: foreign.id },
    });
    const invalid = await prisma.$transaction((tx) =>
      readPlanAdmissionCatalog(tx, plan.id, identity),
    );
    assert.equal(invalid.price, null);
    assert.equal(
      (await prisma.subscription_plan.findUniqueOrThrow({ where: { id: plan.id } })).price_cents,
      2990,
    );
  } finally {
    if (offerId) await prisma.billing_offer.deleteMany({ where: { id: offerId, ...scope } });
    if (priceIds.length)
      await prisma.billing_price_version.deleteMany({ where: { id: { in: priceIds } } });
    if (planId) await prisma.subscription_plan.deleteMany({ where: { id: planId } });
    await prisma.$disconnect();
  }
});
