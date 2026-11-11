import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("real isolated PostgreSQL reads paused offers and rejects cross-scope prices without writes", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { Prisma } = await import("@/external/generated/prisma/client");
  const { AdminSettingsSubscriptionPlanRepository, readScopedCatalog } = await import(
    "./AdminSettingsSubscriptionPlanRepository"
  );
  const tag = randomUUID().replaceAll("-", "");
  const identity = { accountId: `acct_admincatalog${tag}`, mode: "test" as const };
  const scope = { gateway: "stripe", mode: identity.mode, account_id: identity.accountId };
  const plans: string[] = [];
  const prices: string[] = [];
  let offerId: string | undefined;
  try {
    for (const suffix of ["primary", "other"]) {
      const plan = await prisma.subscription_plan.create({
        data: {
          slug: `admin-catalog-${tag}-${suffix}`,
          name: "Local catalog verification",
          price_cents: 9990,
          active: false,
        },
      });
      plans.push(plan.id);
    }
    const createPrice = async (
      overrides: Partial<{
        plan_id: string;
        mode: string;
        account_id: string;
        gateway: string;
      }> = {},
    ) => {
      const row = await prisma.billing_price_version.create({
        data: {
          ...scope,
          plan_id: plans[0],
          external_product_id: `prod_local${tag}`,
          external_price_id: `price_local${tag}${prices.length}`,
          amount_cents: 2990,
          currency: "BRL",
          interval: "month",
          ...overrides,
        },
      });
      prices.push(row.id);
      return row;
    };
    const price = await createPrice();
    const offer = await prisma.billing_offer.create({
      data: {
        ...scope,
        plan_id: plans[0],
        price_version_id: price.id,
        checkout_enabled: false,
        revision: 3,
      },
    });
    offerId = offer.id;
    const read = (identityOverride = identity) =>
      prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SET TRANSACTION READ ONLY`;
          return readScopedCatalog(tx, plans[0], identityOverride);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );
    const before = await prisma.billing_offer.findUniqueOrThrow({ where: { id: offer.id } });
    const result = await read();
    assert.equal(result.offer?.checkout_enabled, false);
    assert.equal(result.offer?.revision, 3);
    assert.equal(result.price?.amount_cents, 2990);
    assert.deepEqual(await read({ ...identity, accountId: "acct_another" }), {
      offer: null,
      price: null,
    });
    assert.deepEqual(
      await prisma.$transaction((tx) =>
        readScopedCatalog(tx, plans[0], { ...identity, mode: "live" }),
      ),
      { offer: null, price: null },
    );
    assert.deepEqual(
      await prisma.billing_offer.findUniqueOrThrow({ where: { id: offer.id } }),
      before,
    );
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const mode = await tx.$queryRaw<
          Array<{ transaction_read_only: string }>
        >`SHOW transaction_read_only`;
        const isolation = await tx.$queryRaw<
          Array<{ transaction_isolation: string }>
        >`SHOW transaction_isolation`;
        assert.equal(mode[0].transaction_read_only, "on");
        assert.equal(isolation[0].transaction_isolation, "repeatable read");
        const original = await readScopedCatalog(tx, plans[0], identity);
        // A real concurrent catalog publication cannot mix the revision/price read by this snapshot.
        await prisma.billing_offer.update({
          where: { id: offer.id },
          data: { revision: 4, checkout_enabled: true },
        });
        assert.deepEqual(await readScopedCatalog(tx, plans[0], identity), original);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    assert.equal((await read()).offer?.revision, 4);
    for (const override of [
      { plan_id: plans[1] },
      { account_id: "acct_another" },
      { mode: "live" },
      { gateway: "mercadopago" },
    ]) {
      const foreign = await createPrice(override);
      await prisma.billing_offer.update({
        where: { id: offer.id },
        data: { price_version_id: foreign.id },
      });
      const scoped = await read();
      assert.ok(scoped.offer);
      assert.equal(scoped.price, null);
    }
    await prisma.billing_offer.update({
      where: { id: offer.id },
      data: { price_version_id: `missing-${tag}` },
    });
    assert.equal((await read()).price, null);
    const settings = await new AdminSettingsSubscriptionPlanRepository().findSettings(identity);
    assert.equal(settings.offer, null);
    assert.equal(settings.price, null);
    if (settings.plan) assert.equal(settings.plan.slug, "profissional");
    assert.equal(
      await prisma.billing_operation.count({ where: { account_id: identity.accountId } }),
      0,
    );
    assert.equal(
      await prisma.billing_financial_receipt.count({ where: { account_id: identity.accountId } }),
      0,
    );
  } finally {
    if (offerId)
      await prisma.billing_offer.deleteMany({
        where: { id: offerId, account_id: identity.accountId },
      });
    if (prices.length)
      await prisma.billing_price_version.deleteMany({ where: { id: { in: prices } } });
    if (plans.length) await prisma.subscription_plan.deleteMany({ where: { id: { in: plans } } });
    await prisma.$disconnect();
  }
});
