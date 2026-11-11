import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type { billing_invoice } from "@/external/generated/prisma/client";
import { assertDisposableLocalDatabaseTarget } from "@/utils/local-database-safety";
import type { InvoiceConfig } from "./config";

test("real isolated PostgreSQL reconciles existing fiscal documents without changing financial facts", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async (context) => {
  assertDisposableLocalDatabaseTarget();
  assert.equal(process.env.NODE_ENV, "test");
  assert.equal(new URL(process.env.DATABASE_URL ?? "").hostname, "127.0.0.1");
  assert.equal(new URL(process.env.DATABASE_URL ?? "").pathname, "/lectum_stripe_test");
  assert.ok(!process.env.STRIPE_SECRET_KEY);
  assert.ok(!process.env.SENDNF_API_KEY);
  const { default: prisma } = await import("@/infra/database/prisma");
  const { InvoiceRepository } = await import("./repository");
  const { invoiceReference } = await import("./contracts");
  const { assertExistingInvoiceDocument, invoiceDocumentSnapshot } = await import(
    "./existing-document"
  );
  const before = { ...process.env };
  const tag = randomUUID().replaceAll("-", "");
  const account = `acct_observation${tag}`;
  const company = `observation-${tag}`;
  const config = { companyId: company, mode: "test" } as InvoiceConfig;
  const scope = { gateway: "stripe" as const, accountId: account, mode: "test" as const };
  const repository = new InvoiceRepository();
  Object.assign(process.env, { STRIPE_ENV: "test", STRIPE_ACCOUNT_ID: account });
  let sequence = 0;
  // Ephemeral persistence/contract fixtures only. No payment, invoice issuance,
  // provider transport or fiscal worker is instantiated or claimed as E2E proof.
  const create = async (
    overrides: Partial<Pick<billing_invoice, "status" | "document_id">> = {},
  ) => {
    const paymentId = `in_observation${tag}${sequence++}`;
    const reference = invoiceReference(company, paymentId, "test", account);
    const record = await prisma.billing_invoice.create({
      data: {
        gateway: "stripe",
        account_id: account,
        payment_id: paymentId,
        mode: "test",
        user_id: `owner-${tag}`,
        subscription_id: `contract-${tag}`,
        company_id: company,
        amount_cents: 2990,
        currency: "BRL",
        paid_at: new Date(),
        reference,
        status: "authorized",
        number: "4",
        document_id: `document-${tag}-${sequence}`,
        request_snapshot: {
          company_id: company,
          reference,
          taker: {
            document: "529.982.247-25",
            name: "Contrato efemero de persistencia",
            email: "contract@example.invalid",
          },
          items: [{ description: "Assinatura de contrato isolado", unit_amount: 2990 }],
        },
      },
    });
    return Object.keys(overrides).length
      ? prisma.billing_invoice.update({ where: { id: record.id }, data: overrides })
      : record;
  };
  const cancelled = {
    status: "cancelled" as const,
    number: "4",
    last_error_code: null,
    next_attempt_at: new Date(Date.now() + 86_400_000),
  };
  try {
    await context.test(
      "snapshot and current document must match the exact fiscal binding",
      async () => {
        const record = await create();
        assert.equal(invoiceDocumentSnapshot(record, config).company_id, company);
        const document = {
          id: record.document_id!,
          object: "nfse" as const,
          mode: "test" as const,
          company_id: company,
          reference: record.reference,
          total: 2990,
          status: "cancelled" as const,
          nfse_number: "4",
          simulation: false,
        };
        assert.doesNotThrow(() => assertExistingInvoiceDocument(document, record, config));
        for (const change of [
          { company_id: "different-company" },
          { mode: "live" },
          { gateway: "unknown" },
          { account_id: "acct_other" },
          { payment_id: "in_different" },
          { document_id: null },
          { reference: "unrelated" },
          { currency: "USD" },
          { amount_cents: 0 },
          { amount_cents: 3990 },
          { request_snapshot: {} },
        ]) {
          assert.throws(() => invoiceDocumentSnapshot({ ...record, ...change }, config));
        }
        for (const change of [
          { id: "document-different" },
          { company_id: "different-company" },
          { mode: "live" as const },
          { reference: "unrelated" },
          { total: 3990 },
        ]) {
          assert.throws(() =>
            assertExistingInvoiceDocument({ ...document, ...change }, record, config),
          );
        }
        assert.deepEqual(
          await prisma.billing_invoice.findUniqueOrThrow({ where: { id: record.id } }),
          record,
        );
      },
    );

    await context.test(
      "manual review is claimable only for an existing document in the exact scope",
      async () => {
        const existing = await create({ status: "manual_review" });
        const unissued = await create({ status: "manual_review", document_id: null });
        const terminal = await create({ status: "cancelled" });
        const rejected = await create({ status: "rejected" });
        const now = new Date(Date.now() + 1000);
        assert.equal(
          await repository.claimInvoice(company, [scope], now, "test", [unissued.id]),
          null,
        );
        assert.equal(
          await repository.claimInvoice(company, [scope], now, "test", [terminal.id, rejected.id]),
          null,
        );
        assert.equal(
          await repository.claimInvoice(
            company,
            [{ ...scope, accountId: "acct_other" }],
            now,
            "test",
            [existing.id],
          ),
          null,
        );
        assert.equal(
          await repository.claimInvoice("other-company", [scope], now, "test", [existing.id]),
          null,
        );
        const claimed = await repository.claimInvoice(company, [scope], now, "test", [existing.id]);
        assert.equal(claimed?.id, existing.id);
        assert.equal(claimed?.document_id, existing.document_id);
        assert.equal(claimed?.status, "manual_review");
        assert.equal(claimed?.attempts, existing.attempts + 1);
        assert.equal(
          await repository.claimInvoice(company, [scope], now, "test", [existing.id]),
          null,
        );
      },
    );

    await context.test(
      "observation CAS rejects stale ownership, scope, snapshot and concurrent lease",
      async () => {
        const record = await create();
        assert.equal(await repository.isDocumentCurrent(record), true);
        for (const change of [
          { id: `missing-${tag}` },
          { user_id: `other-${tag}` },
          { subscription_id: `other-${tag}` },
          { company_id: `other-${tag}` },
          { mode: "live" },
          { gateway: "mercadopago" },
          { account_id: "acct_other" },
          { payment_id: "in_other" },
          { document_id: "document-other" },
          { reference: "different-reference" },
          { amount_cents: 3990 },
          { currency: "USD" },
          { updated_at: new Date(record.updated_at.getTime() - 1) },
          { lease_token: "stale-lease" },
          { status: "processing" },
          { number: "5" },
          { request_snapshot: { changed: true } },
        ]) {
          const stale = { ...record, ...change };
          assert.equal(await repository.isDocumentCurrent(stale), false);
          assert.equal(await repository.observeDocument(stale, cancelled), null);
        }
        assert.deepEqual(
          await prisma.billing_invoice.findUniqueOrThrow({ where: { id: record.id } }),
          record,
        );
        const updated = await repository.observeDocument(record, cancelled);
        assert.equal(updated?.status, "cancelled");
        assert.equal(updated?.document_id, record.document_id);
        assert.equal(updated?.payment_id, record.payment_id);
        assert.deepEqual(updated?.request_snapshot, record.request_snapshot);
        assert.equal(await repository.isDocumentCurrent(record), false);
        assert.equal(
          await repository.observeDocument(record, { ...cancelled, status: "authorized" }),
          null,
        );
      },
    );

    await context.test(
      "terminal cancellation is monotonic and identical replay is a persistence no-op",
      async () => {
        const record = await create({ status: "cancelled" });
        const replay = await repository.observeDocument(record, cancelled);
        assert.ok(replay);
        assert.deepEqual(replay, record);
        assert.equal(await repository.isDocumentCurrent(record), true);
        assert.equal(
          await repository.observeDocument(record, { ...cancelled, status: "authorized" }),
          null,
        );
        assert.equal(
          await repository.observeDocument(record, { ...cancelled, status: "processing" }),
          null,
        );
        assert.deepEqual(
          await prisma.billing_invoice.findUniqueOrThrow({ where: { id: record.id } }),
          record,
        );
        assert.equal(await prisma.billing_invoice_job.count({ where: { account_id: account } }), 0);
        assert.equal(await prisma.billing_operation.count({ where: { account_id: account } }), 0);
        assert.equal(
          await prisma.billing_financial_receipt.count({ where: { account_id: account } }),
          0,
        );
      },
    );
    await context.test(
      "a stale worker cannot overwrite cancellation observed while its lease is held",
      async () => {
        const record = await create();
        const claimed = await repository.claimInvoice(
          company,
          [scope],
          new Date(Date.now() + 1000),
          "test",
          [record.id],
        );
        assert.ok(claimed);
        const observed = await repository.observeDocument(claimed, cancelled);
        assert.ok(observed);
        assert.equal(observed.lease_token, claimed.lease_token);
        assert.equal(
          await repository.finishInvoice(
            claimed.id,
            claimed.lease_token,
            { status: "authorized" },
            claimed.updated_at,
          ),
          false,
        );
        assert.equal(
          await repository.finishInvoice(claimed.id, claimed.lease_token, { status: "authorized" }),
          false,
        );
        assert.equal(
          await repository.finishInvoice(
            claimed.id,
            claimed.lease_token,
            { next_attempt_at: cancelled.next_attempt_at },
            observed.updated_at,
          ),
          true,
        );
        const released = await prisma.billing_invoice.findUniqueOrThrow({
          where: { id: record.id },
        });
        assert.equal(released.status, "cancelled");
        assert.equal(released.lease_token, null);
        assert.equal(released.lease_until, null);
        assert.deepEqual(released.request_snapshot, record.request_snapshot);
        assert.equal(
          await repository.claimInvoice(
            company,
            [scope],
            new Date(Date.now() + 2 * 86_400_000),
            "test",
            [record.id],
          ),
          null,
        );
      },
    );
  } finally {
    await prisma.billing_invoice.deleteMany({
      where: { company_id: company, account_id: account },
    });
    process.env = before;
    await prisma.$disconnect();
  }
});
