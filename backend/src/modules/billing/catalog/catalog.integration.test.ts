import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("isolated PG catalog persists idempotent reservations, fingerprint conflicts, leases and stable scoped histories without gateway calls", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/lectum_stripe_test");
  assert.equal(process.env.STRIPE_SECRET_KEY, "");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { reserveCatalogPriceOperation, claimCatalogPriceOperation, resumeCatalogPrice } =
    await import("./price-operations");
  const { listCatalogRecords } = await import("./read-service");
  const { CatalogError, canReplayCatalogCreate } = await import("./policy");
  const tag = randomUUID().replaceAll("-", "");
  const account = `acct_catalog${tag}`;
  const prior = process.env.STRIPE_ACCOUNT_ID;
  process.env.STRIPE_ACCOUNT_ID = account;
  const admins: string[] = [];
  let priceId: string | undefined;
  try {
    const plan = await prisma.subscription_plan.findFirstOrThrow({
      where: { slug: "profissional", deleted: false },
    });
    const financialBefore = await prisma.$transaction([
      prisma.professional_subscription.count(),
      prisma.billing_financial_receipt.count(),
      prisma.billing_invoice.count(),
    ]);
    const originalOffers = await prisma.billing_offer.findMany({ where: { plan_id: plan.id } });
    for (let i = 0; i < 2; i++) {
      const actor = await prisma.admin.create({
        data: {
          name: `Local catalog ${tag}`,
          email: `catalog-${tag}-${i}@example.invalid`,
          confirmed: true,
        },
      });
      admins.push(actor.id);
    }
    const version = await prisma.billing_price_version.create({
      data: {
        plan_id: plan.id,
        gateway: "stripe",
        mode: "test",
        account_id: account,
        external_product_id: `prod_${tag}`,
        external_price_id: `price_${tag}`,
        amount_cents: 2990,
        currency: "BRL",
        interval: "month",
      },
    });
    priceId = version.id;
    const request = randomUUID();
    const [a, b] = await Promise.all([
      reserveCatalogPriceOperation(admins[0], 3990, request),
      reserveCatalogPriceOperation(admins[0], 3990, request),
    ]);
    assert.equal(a.id, b.id);
    assert.equal(a.status, "pending");
    assert.equal(a.first_attempt_at, null);
    assert.equal(a.version_id, null);
    assert.equal(
      await prisma.billing_catalog_operation.count({ where: { account_id: account } }),
      1,
    );
    assert.equal(
      await prisma.admin_activity_log.count({
        where: { target_id: a.id, action: "stripe_catalog_operation_reserved" },
      }),
      1,
    );
    await assert.rejects(
      reserveCatalogPriceOperation(admins[0], 4990, request),
      (cause: unknown) => cause instanceof CatalogError && cause.code === "catalog_conflict",
    );
    await assert.rejects(
      resumeCatalogPrice(a.id, admins[1]),
      (cause: unknown) =>
        cause instanceof CatalogError && cause.code === "catalog_operation_not_found",
    );
    const other = await reserveCatalogPriceOperation(admins[1], 3990, request);
    assert.notEqual(other.id, a.id);
    const claims = await Promise.all([
      claimCatalogPriceOperation(a.id, admins[0]),
      claimCatalogPriceOperation(a.id, admins[0]),
    ]);
    assert.equal(claims.filter((row) => row.claimed).length, 1);
    const claimed = claims.find((row) => row.claimed)!.operation;
    assert.ok(claimed.first_attempt_at);
    assert.ok(claimed.lease_token);
    assert.ok(claimed.lease_until);
    await prisma.billing_catalog_operation.update({
      where: { id: a.id },
      data: { lease_until: new Date(0), first_attempt_at: new Date(Date.now() - 25 * 3600000) },
    });
    const expired = await claimCatalogPriceOperation(a.id, admins[0]);
    assert.equal(expired.claimed, true);
    assert.equal(canReplayCatalogCreate(expired.operation, new Date()), false);
    const first = await listCatalogRecords(admins[0], "operations", undefined, 1);
    assert.equal(first.items.length, 1);
    assert.ok(first.next_cursor);
    const next = await listCatalogRecords(admins[0], "operations", first.next_cursor!, 1);
    assert.equal(next.items.length, 1);
    assert.notEqual(first.items[0].id, next.items[0].id);
    const serialized = JSON.stringify(await listCatalogRecords(admins[0], "prices"));
    assert.equal(serialized.includes(account), false);
    assert.equal(serialized.includes(`price_${tag}`), false);
    assert.deepEqual(
      await prisma.billing_offer.findMany({ where: { plan_id: plan.id } }),
      originalOffers,
    );
    assert.deepEqual(
      await prisma.$transaction([
        prisma.professional_subscription.count(),
        prisma.billing_financial_receipt.count(),
        prisma.billing_invoice.count(),
      ]),
      financialBefore,
    );
  } finally {
    if (prior === undefined) delete process.env.STRIPE_ACCOUNT_ID;
    else process.env.STRIPE_ACCOUNT_ID = prior;
    await prisma.billing_catalog_operation.deleteMany({ where: { account_id: account } });
    if (priceId) await prisma.billing_price_version.delete({ where: { id: priceId } });
    if (admins.length) {
      await prisma.admin_activity_log.deleteMany({ where: { admin_id: { in: admins } } });
      await prisma.admin.deleteMany({ where: { id: { in: admins } } });
    }
    await prisma.$disconnect();
  }
});
