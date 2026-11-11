import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("isolated PG manual expenses enforce idempotency, CAS, audit hashes and identical paginated/totals snapshots without touching financial facts", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { createExpense, correctExpense, voidExpense, listExpenses } = await import(
    "../use-cases/services"
  );
  const { ExpenseError, expenseQuerySchema, parseExpense } = await import("../use-cases/policy");
  const { readExpenseSnapshot } = await import("./AdminOperatingExpenseRepository");
  const tag = randomUUID();
  const prefix = `TASK330-${tag}-main`;
  const admins: string[] = [];
  const ids: string[] = [];
  const initial = {
    amount_cents: 12345,
    competence_date: "2001-03-01",
    paid_date: null,
    category: "software",
    description: `${prefix} A`,
    request_key: randomUUID(),
  };
  const correctionReason = "Correção controlada para validação local";
  const voidReason = "Anulação controlada para validação local";
  const financialBefore = await prisma.$transaction([
    prisma.professional_subscription.count(),
    prisma.billing_financial_receipt.count(),
    prisma.billing_invoice.count(),
  ]);
  const offersBefore = await prisma.billing_offer.findMany({ orderBy: { id: "asc" } });
  try {
    for (let i = 0; i < 2; i++) {
      const actor = await prisma.admin.create({
        data: {
          name: `Local expense validation ${tag}`,
          email: `expense-${tag}-${i}@example.invalid`,
          confirmed: true,
        },
      });
      admins.push(actor.id);
    }
    const [first, retry] = await Promise.all([
      createExpense(admins[0], initial),
      createExpense(admins[0], initial),
    ]);
    ids.push(first.item.id);
    assert.equal(first.item.id, retry.item.id);
    assert.equal([first, retry].filter((item) => !item.replayed).length, 1);
    assert.equal(
      await prisma.admin_activity_log.count({
        where: { target_id: first.item.id, action: "operating_expense_created" },
      }),
      1,
    );
    const b = await createExpense(admins[0], {
      ...initial,
      request_key: randomUUID(),
      amount_cents: 7890,
      paid_date: "2000-01-01",
      description: `${prefix} B`,
    });
    ids.push(b.item.id);
    const c = await createExpense(admins[0], {
      ...initial,
      request_key: randomUUID(),
      amount_cents: 2001,
      description: `${prefix} C`,
    });
    ids.push(c.item.id);
    const correctedPayload = {
      amount_cents: 15000,
      competence_date: initial.competence_date,
      paid_date: "2000-02-29",
      category: "software",
      description: `${prefix} A corrected`,
    };
    const edited = await correctExpense(admins[0], first.item.id, {
      ...correctedPayload,
      expected_revision: 1,
      reason: correctionReason,
    });
    assert.equal(edited.item.revision, 2);
    const replay = await createExpense(admins[0], initial);
    assert.equal(replay.replayed, true);
    assert.equal(replay.item.amount_cents, 15000);
    assert.equal(replay.item.description, correctedPayload.description);
    assert.equal(replay.item.revision, 2);
    await assert.rejects(
      createExpense(admins[0], { ...initial, amount_cents: 15000 }),
      (cause: unknown) => cause instanceof ExpenseError && cause.code === "expense_replay_conflict",
    );
    await assert.rejects(
      correctExpense(admins[0], first.item.id, {
        ...correctedPayload,
        expected_revision: 1,
        reason: correctionReason,
      }),
      (cause: unknown) => cause instanceof ExpenseError && cause.code === "expense_conflict",
    );
    const annulled = await voidExpense(admins[0], c.item.id, {
      expected_revision: 1,
      reason: voidReason,
    });
    assert.equal(annulled.item.status, "voided");
    assert.equal(annulled.item.amount_cents, 2001);
    await assert.rejects(
      correctExpense(admins[0], c.item.id, {
        ...correctedPayload,
        expected_revision: 2,
        reason: correctionReason,
      }),
      (cause: unknown) => cause instanceof ExpenseError && cause.code === "expense_voided",
    );
    await prisma.admin_operating_expense.updateMany({
      where: { id: { in: ids } },
      data: { createdAt: new Date("2026-01-01T00:00:00Z") },
    });
    const query = {
      search: prefix,
      status: "all",
      competence_from: "2001-03-01",
      competence_to: "2001-03-01",
      category: "software",
      limit: 1,
      page: 1,
    };
    const one = await listExpenses(admins[0], query);
    const two = await listExpenses(admins[0], { ...query, page: 2 });
    assert.equal(one.pagination.total, 3);
    assert.notEqual(one.items[0].id, two.items[0].id);
    assert.equal(one.items[0].id, [...ids].sort().reverse()[0]);
    assert.deepEqual(one.totals, two.totals);
    assert.equal(one.totals.recorded_cents, 22890);
    assert.equal(one.totals.paid_cents, 22890);
    assert.equal(one.totals.pending_cents, 0);
    assert.equal(one.totals.voided_cents, 2001);
    const voided = await listExpenses(admins[0], { ...query, status: "voided" });
    assert.equal(voided.pagination.total, 1);
    assert.equal(voided.totals.recorded_cents, 0);
    assert.equal(voided.totals.voided_cents, 2001);
    assert.equal(
      (await listExpenses(admins[0], { ...query, category: "infrastructure" })).pagination.total,
      0,
    );
    const parsed = parseExpense(expenseQuerySchema, query);
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const before = await readExpenseSnapshot(tx, parsed);
        await correctExpense(admins[0], b.item.id, {
          ...correctedPayload,
          amount_cents: 8890,
          description: `${prefix} B corrected`,
          expected_revision: 1,
          reason: correctionReason,
        });
        const after = await readExpenseSnapshot(tx, parsed);
        assert.deepEqual(
          after,
          before,
          "repeatable-read rows/count/totals cannot mix concurrent revisions",
        );
      },
      { isolationLevel: "RepeatableRead" },
    );
    const race = await createExpense(admins[0], {
      ...initial,
      request_key: randomUUID(),
      description: `TASK330-${tag}-race`,
    });
    ids.push(race.item.id);
    const raced = await Promise.allSettled([
      correctExpense(admins[0], race.item.id, {
        ...correctedPayload,
        expected_revision: 1,
        reason: correctionReason,
      }),
      voidExpense(admins[0], race.item.id, { expected_revision: 1, reason: voidReason }),
    ]);
    assert.equal(raced.filter((row) => row.status === "fulfilled").length, 1);
    assert.equal(raced.filter((row) => row.status === "rejected").length, 1);
    const other = await createExpense(admins[1], {
      ...initial,
      description: `TASK330-${tag}-other`,
    });
    ids.push(other.item.id);
    assert.notEqual(other.item.id, first.item.id);
    await prisma.admin.update({ where: { id: admins[1] }, data: { active: false } });
    await assert.rejects(
      createExpense(admins[1], { ...initial, request_key: randomUUID() }),
      (cause: unknown) => cause instanceof ExpenseError && cause.code === "expense_actor_invalid",
    );
    const pagePrefix = `TASK330-${tag}-page`;
    for (let index = 0; index < 2; index++) {
      const created = await createExpense(admins[0], {
        ...initial,
        request_key: randomUUID(),
        description: `${pagePrefix} ${index}`,
      });
      ids.push(created.item.id);
    }
    const lastPage = await listExpenses(admins[0], {
      search: pagePrefix,
      status: "active",
      page: 2,
      limit: 1,
    });
    assert.equal(lastPage.pagination.total, 2);
    assert.equal(lastPage.pagination.page, 2);
    await voidExpense(admins[0], lastPage.items[0].id, {
      expected_revision: lastPage.items[0].revision,
      reason: voidReason,
    });
    const clamped = await listExpenses(admins[0], {
      search: pagePrefix,
      status: "active",
      page: 2,
      limit: 1,
    });
    assert.equal(clamped.pagination.total, 1);
    assert.equal(clamped.pagination.total_pages, 1);
    assert.equal(clamped.pagination.page, 1);
    assert.equal(clamped.items.length, 1);
    const excessive = await listExpenses(admins[0], {
      search: pagePrefix,
      status: "active",
      page: 100000,
      limit: 1,
    });
    assert.equal(excessive.pagination.page, 1);
    assert.equal(excessive.items[0].id, clamped.items[0].id);
    assert.deepEqual(excessive.totals, clamped.totals);
    await voidExpense(admins[0], clamped.items[0].id, {
      expected_revision: clamped.items[0].revision,
      reason: voidReason,
    });
    const empty = await listExpenses(admins[0], {
      search: pagePrefix,
      status: "active",
      page: 100000,
      limit: 1,
    });
    assert.equal(empty.pagination.page, 1);
    assert.equal(empty.pagination.total_pages, 0);
    assert.deepEqual(empty.items, []);
    const audit = JSON.stringify(
      await prisma.admin_activity_log.findMany({
        where: { target_type: "admin_operating_expense", target_id: { in: ids } },
      }),
    );
    for (const text of [prefix, correctionReason, voidReason])
      assert.equal(audit.includes(text), false);
    assert.ok(audit.includes("description_hash"));
    assert.ok(audit.includes("correction_reason_hash"));
    assert.ok(audit.includes("void_reason_hash"));
    assert.deepEqual(
      await prisma.$transaction([
        prisma.professional_subscription.count(),
        prisma.billing_financial_receipt.count(),
        prisma.billing_invoice.count(),
      ]),
      financialBefore,
    );
    assert.deepEqual(await prisma.billing_offer.findMany({ orderBy: { id: "asc" } }), offersBefore);
    // Disposable transaction-only rows exercise a legitimate sum above PostgreSQL Int32.
    const rollback = new Error("LOCAL_SUM_ROLLBACK");
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await tx.admin_operating_expense.createMany({
          data: Array.from({ length: 22 }, (_, index) => ({
            amount_cents: 99999999,
            currency: "BRL",
            category: "software",
            description: `TASK330-${tag}-sum ${index}`,
            competence_date: new Date("2001-03-01T00:00:00Z"),
            created_by_admin_id: admins[0],
            updated_by_admin_id: admins[0],
            request_key: randomUUID(),
            creation_fingerprint: "a".repeat(64),
          })),
        });
        const large = await readExpenseSnapshot(
          tx,
          parseExpense(expenseQuerySchema, { search: `TASK330-${tag}-sum`, status: "all" }),
        );
        assert.equal(large.active._sum.amount_cents, 2199999978);
        throw rollback;
      }),
      (cause) => cause === rollback,
    );
  } finally {
    const owned = admins.length
      ? await prisma.admin_operating_expense.findMany({
          where: { created_by_admin_id: { in: admins } },
          select: { id: true },
        })
      : [];
    const ownIds = owned.map((row) => row.id);
    if (ownIds.length) {
      await prisma.admin_activity_log.deleteMany({
        where: {
          target_type: "admin_operating_expense",
          target_id: { in: ownIds },
          admin_id: { in: admins },
        },
      });
      await prisma.admin_operating_expense.deleteMany({
        where: { id: { in: ownIds }, created_by_admin_id: { in: admins } },
      });
    }
    if (admins.length) await prisma.admin.deleteMany({ where: { id: { in: admins } } });
    await prisma.$disconnect();
  }
});
