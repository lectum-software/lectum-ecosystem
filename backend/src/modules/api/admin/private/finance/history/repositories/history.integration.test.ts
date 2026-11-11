import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("real isolated PG admin history includes canceled contracts, paginates beyond100 and scopes every source without provider calls", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { Prisma } = await import("@/external/generated/prisma/client");
  const {
    AdminFinanceHistoryRepository,
    assertHistoryScanSize,
    HistoryFilterRequiredError,
    historyDateRange,
    readHistoryRecords,
  } = await import("./AdminFinanceHistoryRepository");
  const { projectAdminHistory } = await import("../use-cases/projection");
  const { storedFinancialReceiptHash } = await import(
    "@/modules/billing/stripe/financial-ledger/policy"
  );
  const tag = randomUUID().replaceAll("-", "");
  const account = `acct_adminhistory${tag}`;
  const users: string[] = [];
  const profiles: string[] = [];
  const contracts: string[] = [];
  const events: string[] = [];
  const now = new Date();
  const day = new Date(now.getTime() - 86_400_000);
  const context = {
    now,
    fiscal: null,
    scopes: [
      { gateway: "stripe" as const, accountId: account, mode: "test" as const },
      { gateway: "mercadopago" as const, accountId: null, mode: "test" as const },
    ],
  };
  try {
    const plan = await prisma.subscription_plan.findFirstOrThrow({
      where: { slug: "profissional", deleted: false },
    });
    for (const suffix of ["owner", "other"]) {
      const user = await prisma.user.create({
        data: {
          name: `Local admin history ${tag} ${suffix}`,
          email: `adminhistory-${tag}-${suffix}@example.invalid`,
          role: "psicologo",
        },
      });
      users.push(user.id);
      const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
      profiles.push(profile.id);
      const contract = await prisma.professional_subscription.create({
        data: {
          psychologist_id: profile.id,
          plan_id: plan.id,
          gateway: "stripe",
          source: "stripe",
          status: "cancelada",
          gateway_mode: "test",
          gateway_account_id: account,
          gateway_subscription_id: `sub_history${tag}${suffix}`,
        },
      });
      contracts.push(contract.id);
    }
    const mp = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profiles[0],
        plan_id: plan.id,
        gateway: "mercadopago",
        source: "mercadopago",
        status: "cancelada",
        gateway_subscription_id: `mp_${tag}`,
      },
    });
    contracts.push(mp.id);
    // Disposable repository records prove query ownership/pagination, not sandbox settlement.
    for (let i = 0; i < 105; i++) {
      const row = await prisma.billing_financial_receipt.create({
        data: {
          gateway: "stripe",
          account_id: account,
          mode: "test",
          subscription_id: contracts[0],
          psychologist_id: profiles[0],
          provider_subscription_id: `sub_history${tag}owner`,
          invoice_id: `in_history${tag}`,
          invoice_payment_id: `inpay_history${tag}${i}`,
          payment_intent_id: `pi_history${tag}${i}`,
          charge_id: `ch_history${tag}${i}`,
          price_id: `price_history${tag}`,
          currency: "BRL",
          amount_paid_cents: 2990,
          paid_at: new Date(day.getTime() - i * 1000),
          invoice_paid_at: day,
          period_start: day,
          period_end: new Date(now.getTime() + 86_400_000),
          immutable_hash: "unverified",
          current_state: i === 0 ? "refunded" : "paid",
          refunded_cents: i === 0 ? 2990 : 0,
          observed_at: now,
        },
      });
      await prisma.billing_financial_receipt.update({
        where: { id: row.id },
        data: { immutable_hash: storedFinancialReceiptHash(row) },
      });
    }
    const receipt = await prisma.billing_financial_receipt.findFirstOrThrow({
      where: { account_id: account },
    });
    const { id: _id, created_at: _created, updated_at: _updated, ...receiptBase } = receipt;
    for (const [label, change] of Object.entries({
      other: {
        psychologist_id: profiles[1],
        subscription_id: contracts[1],
        provider_subscription_id: `sub_history${tag}other`,
      },
      bad_owner: { psychologist_id: profiles[1] },
      bad_account: { account_id: `${account}wrong` },
      bad_mode: { mode: "live" },
      bad_reference: { provider_subscription_id: "sub_unrelated" },
      tampered: { immutable_hash: "invalid" },
    })) {
      const row = await prisma.billing_financial_receipt.create({
        data: {
          ...receiptBase,
          ...change,
          invoice_id: `in_history${tag}${label}`,
          invoice_payment_id: `inpay_history${tag}${label}`,
        },
      });
      if (label !== "tampered")
        await prisma.billing_financial_receipt.update({
          where: { id: row.id },
          data: { immutable_hash: storedFinancialReceiptHash(row) },
        });
    }
    for (let i = 0; i < 13; i++) {
      const event = await prisma.payment_event.create({
        data: {
          gateway: "mercadopago",
          external_id: `history-${tag}-${i}`,
          type: "subscription_authorized_payment",
          createdAt: new Date(day.getTime() - i * 1000),
          payload: {
            external_reference: i === 1 ? ` ${mp.id} ` : mp.id,
            payment: {
              id: `${tag}${i}`,
              status: i === 0 ? "rejected" : "approved",
              transaction_amount: 29.9,
              currency_id: "BRL",
              live_mode: false,
            },
          },
        },
      });
      events.push(event.id);
    }
    for (const payload of [
      { description: mp.id, payment: { id: "notowned", status: "approved" } },
      {
        external_reference: mp.id,
        preapproval_id: "unrelated",
        payment: { id: "conflicting", status: "approved" },
      },
    ]) {
      const event = await prisma.payment_event.create({
        data: {
          gateway: "mercadopago",
          external_id: `history-${tag}-${events.length}`,
          type: "payment",
          payload,
          createdAt: day,
        },
      });
      events.push(event.id);
    }
    const repo = new AdminFinanceHistoryRepository();
    const before = await prisma.billing_operation.count({ where: { user_id: { in: users } } });
    const records = await repo.read({ user_id: users[0] }, context);
    const result = projectAdminHistory(records, { limit: 50 }, context);
    assert.equal(result.pagination.total, 118);
    assert.equal(result.pagination.total_pages, 3);
    assert.equal(
      new Set(
        [1, 2, 3].flatMap((page) =>
          projectAdminHistory(records, { page, limit: 50 }, context).items.map((row) => row.id),
        ),
      ).size,
      118,
    );
    assert.equal(projectAdminHistory(records, { status: "failed" }, context).pagination.total, 1);
    assert.equal(projectAdminHistory(records, { status: "refunded" }, context).pagination.total, 1);
    assert.ok(result.items.every((row) => row.user_id === users[0]));
    const other = projectAdminHistory(await repo.read({ user_id: users[1] }, context), {}, context);
    assert.equal(other.pagination.total, 1);
    assert.equal(
      projectAdminHistory(
        await repo.read({ q: `Local admin history ${tag}` }, context),
        {},
        context,
      ).pagination.total,
      119,
    );
    assert.equal(
      projectAdminHistory(
        await repo.read(
          {
            user_id: users[0],
            from: new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10),
          },
          context,
        ),
        {},
        context,
      ).pagination.total,
      0,
    );
    assert.equal(
      projectAdminHistory(await repo.read({ user_id: `absent${tag}` }, context), {}, context)
        .pagination.total,
      0,
    );
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        assert.equal(
          (
            await tx.$queryRaw<Array<{ transaction_read_only: string }>>`SHOW transaction_read_only`
          )[0].transaction_read_only,
          "on",
        );
        const stable = await readHistoryRecords(tx, { user_id: users[0] }, context);
        assert.deepEqual(projectAdminHistory(stable, { limit: 50 }, context), result);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    const ambiguousReference = `mp_ambiguous${tag}`;
    const ambiguousContracts: string[] = [];
    for (const profileId of profiles) {
      const contract = await prisma.professional_subscription.create({
        data: {
          psychologist_id: profileId,
          plan_id: plan.id,
          gateway: "mercadopago",
          source: "mercadopago",
          gateway_subscription_id: ambiguousReference,
          status: "cancelada",
        },
      });
      contracts.push(contract.id);
      ambiguousContracts.push(contract.id);
    }
    const ambiguousEvent = await prisma.payment_event.create({
      data: {
        gateway: "mercadopago",
        external_id: `history-ambiguous-${tag}`,
        type: "payment",
        createdAt: day,
        payload: {
          preapproval_id: ambiguousReference,
          payment: {
            id: `ambiguous${tag}`,
            status: "approved",
            transaction_amount: 29.9,
            live_mode: false,
          },
        },
      },
    });
    events.push(ambiguousEvent.id);
    for (const query of [
      { user_id: users[0] },
      { user_id: users[1] },
      { q: `Local admin history ${tag}` },
    ]) {
      const scoped = await repo.read(query, context);
      assert.ok(scoped.ambiguousReferences.includes(ambiguousReference));
      assert.ok(
        !projectAdminHistory(scoped, { limit: 50 }, context).items.some(
          (row) => row.id === `event:${ambiguousEvent.id}`,
        ),
      );
    }
    assert.equal(
      projectAdminHistory(await repo.read({ q: ambiguousContracts[0] }, context), {}, context)
        .pagination.total,
      0,
    );

    const calendarDay = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
    const range = historyDateRange({ from: calendarDay, to: calendarDay });
    assert.equal(range.gte!.toISOString(), `${calendarDay}T03:00:00.000Z`);
    assert.equal(range.lt!.getTime() - range.gte!.getTime(), 86_400_000);
    for (const [suffix, at] of [
      ["before", range.gte!.getTime() - 1],
      ["midnight", range.gte!.getTime()],
      ["night", range.lt!.getTime() - 1],
      ["next", range.lt!.getTime()],
    ] as const) {
      const event = await prisma.payment_event.create({
        data: {
          gateway: "mercadopago",
          external_id: `history-boundary-${tag}-${suffix}`,
          type: "payment",
          createdAt: new Date(at),
          payload: {
            external_reference: mp.id,
            payment: {
              id: `boundary${tag}${suffix}`,
              status: "approved",
              transaction_amount: 29.9,
              live_mode: false,
            },
          },
        },
      });
      events.push(event.id);
    }
    const calendarRecords = await repo.read(
      { user_id: users[0], from: calendarDay, to: calendarDay },
      context,
    );
    const calendarHistory = projectAdminHistory(calendarRecords, {}, context);
    assert.equal(calendarHistory.pagination.total, 2);
    assert.deepEqual(
      new Set(calendarHistory.items.map((row) => row.occurred_at)),
      new Set([range.gte!.toISOString(), new Date(range.lt!.getTime() - 1).toISOString()]),
    );
    assert.equal(
      await prisma.billing_operation.count({ where: { user_id: { in: users } } }),
      before,
    );
    assert.equal(await prisma.billing_invoice.count({ where: { user_id: { in: users } } }), 0);

    // Persisted contract only: a document cancellation is independent from the
    // existing refunded receipt. This never performs a refund or provider request.
    const { invoiceReference } = await import("@/modules/billing/invoices/contracts");
    const companyId = `history-company-${tag}`;
    const reference = invoiceReference(companyId, `in_history${tag}`, "test", account);
    const fiscal = await prisma.billing_invoice.create({
      data: {
        gateway: "stripe",
        account_id: account,
        mode: "test",
        payment_id: `in_history${tag}`,
        subscription_id: contracts[0],
        user_id: users[0],
        company_id: companyId,
        amount_cents: 2990,
        currency: "BRL",
        paid_at: day,
        reference,
        status: "cancelled",
        number: "4",
        document_id: `document-history-${tag}`,
        request_snapshot: {
          company_id: companyId,
          reference,
          taker: {
            document: "529.982.247-25",
            name: "Historico de persistencia isolada",
            email: "history@example.invalid",
          },
          items: [{ description: "Assinatura de contrato local", unit_amount: 2990 }],
        },
      },
    });
    const fiscalContext = { ...context, fiscal: { companyId, mode: "test" as const } };
    const observed = projectAdminHistory(
      await repo.read({ user_id: users[0] }, fiscalContext),
      { status: "refunded" },
      fiscalContext,
    );
    assert.equal(observed.pagination.total, 1);
    assert.equal(observed.items[0].financial_status, "refunded");
    assert.equal(observed.items[0].status_label, "Estornado");
    assert.equal(observed.items[0].amount_cents, 2990);
    assert.equal(observed.items[0].invoice?.id, fiscal.id);
    assert.equal(observed.items[0].invoice?.status, "cancelled");
    assert.equal(observed.items[0].invoice?.downloadable, false);
    assert.equal(
      await prisma.billing_operation.count({ where: { user_id: { in: users } } }),
      before,
    );
    assertHistoryScanSize(10_000);
    assert.throws(() => assertHistoryScanSize(10_001), HistoryFilterRequiredError);
  } finally {
    await prisma.billing_invoice.deleteMany({ where: { user_id: { in: users } } });
    await prisma.payment_event.deleteMany({ where: { id: { in: events } } });
    await prisma.billing_financial_receipt.deleteMany({
      where: { account_id: { startsWith: account } },
    });
    await prisma.professional_subscription.deleteMany({ where: { id: { in: contracts } } });
    await prisma.professional_subscription_history.deleteMany({
      where: { psychologist_id: { in: profiles } },
    });
    await prisma.psychologist_profile.deleteMany({ where: { id: { in: profiles } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
});
