import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import prisma from "../src/infra/database/prisma";
import { invoicePdf } from "../src/modules/api/private/psychologist/billing/subscription/use-cases/invoice";
import { invoiceReference } from "../src/modules/billing/invoices/contracts";
import { withInvoiceHistory } from "../src/modules/billing/invoices/history";
import { InvoiceRepository } from "../src/modules/billing/invoices/repository";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55432");
  assert.equal(url.pathname, "/lectum_release_dev_20261104");
  assert.equal(process.env.SENDNF_TEST_ISSUANCE_ENABLED, undefined);
  assert.equal(await prisma.billing_invoice_job.count(), 0, "use an isolated invoice queue");
  const tag = `unit-${randomUUID()}`;
  const repository = new InvoiceRepository();
  const snapshot = {
    company_id: tag,
    reference: invoiceReference(tag, tag),
    taker: {
      document: "529.982.247-25",
      name: "Teste de Persistencia",
      email: "test@example.invalid",
    },
    items: [{ description: "Teste isolado de persistencia", unit_amount: 2990 }],
  };
  const data = {
    payment_id: tag,
    subscription_id: tag,
    user_id: tag,
    company_id: tag,
    amount_cents: 2990,
    paid_at: new Date(),
    reference: snapshot.reference,
    request_snapshot: snapshot,
  };
  try {
    const rows = await Promise.all(Array.from({ length: 8 }, () => repository.record(data)));
    assert.equal(new Set(rows.map((row) => row.id)).size, 1);
    const row = rows[0];
    const liveSnapshot = {
      ...snapshot,
      reference: invoiceReference(tag, tag, "live"),
      iss_rate: 201,
      fiscal_service_code: "010501",
    };
    const liveRow = await repository.record({
      ...data,
      mode: "live",
      reference: liveSnapshot.reference,
      request_snapshot: liveSnapshot,
    });
    assert.notEqual(liveRow.id, row.id);
    assert.equal((await repository.listForUser(tag, tag, "live"))[0]?.id, liveRow.id);
    assert.equal((await repository.listForUser(tag, tag, "test"))[0]?.id, row.id);
    const liveClaim = await repository.claimInvoice(tag, new Date(), "live");
    assert.equal(liveClaim?.id, liveRow.id);
    assert.equal(liveClaim?.mode, "live");
    await repository.record({
      ...data,
      request_snapshot: { ...snapshot, taker: { ...snapshot.taker, name: "Outra edicao" } },
    });
    assert.deepEqual((await repository.findOwned(row.id, tag))?.request_snapshot, snapshot);
    await assert.rejects(repository.record({ ...data, amount_cents: 3990 }));
    assert.equal(await repository.findOwned(row.id, "another-user"), null);
    assert.equal((await repository.listForUser(tag, "another-company")).length, 0);
    const claims = await Promise.all(Array.from({ length: 8 }, () => repository.claimInvoice(tag)));
    const claimed = claims.filter((value) => value !== null);
    assert.equal(claimed.length, 1);
    const token = claimed[0]!.lease_token;
    await repository.finishInvoice(row.id, "wrong-token", { status: "authorized" });
    assert.equal((await repository.findOwned(row.id, tag))?.status, "queued");
    await prisma.billing_invoice.update({
      where: { id: row.id },
      data: { lease_until: new Date(0) },
    });
    const recovered = await repository.claimInvoice(tag);
    assert.ok(recovered);
    assert.notEqual(recovered.lease_token, token);
    await repository.finishInvoice(row.id, token, { status: "authorized" });
    assert.equal((await repository.findOwned(row.id, tag))?.status, "queued");
    await repository.finishInvoice(row.id, recovered.lease_token, {
      status: "awaiting_configuration",
    });

    const event = { externalId: tag, type: "payment", resourceId: tag, raw: {} };
    await Promise.all(Array.from({ length: 8 }, () => repository.enqueue(event)));
    assert.equal(await prisma.billing_invoice_job.count({ where: { resource_id: tag } }), 1);
    const jobClaims = (
      await Promise.all(Array.from({ length: 8 }, () => repository.claimJob()))
    ).filter(Boolean);
    assert.equal(jobClaims.length, 1);
    const job = jobClaims[0]!;
    await repository.enqueue({ ...event, externalId: `${tag}-new` });
    await repository.finishJob(
      job.id,
      job.lease_token,
      {
        completed_at: new Date(),
        last_error_code: null,
      },
      tag,
    );
    assert.equal(
      (await prisma.billing_invoice_job.findUnique({ where: { id: job.id } }))?.completed_at,
      null,
    );
    await repository.finishJob(job.id, job.lease_token, {
      completed_at: new Date(),
      last_error_code: null,
    });
    await repository.enqueue(event);
    assert.equal(
      (await prisma.billing_invoice_job.findUnique({ where: { id: job.id } }))?.completed_at,
      null,
    );

    Object.assign(process.env, {
      SENDNF_TEST_ENABLED: "true",
      SENDNF_API_KEY: "nt_test_unit_test_only",
      SENDNF_COMPANY_ID: tag,
      SENDNF_PAYMENTS_FROM: "2026-01-01T00:00:00Z",
      SENDNF_SERVICE_DESCRIPTION: "Teste de persistencia fiscal",
      MERCADO_PAGO_ENV: "sandbox",
      NODE_ENV: "test",
    });
    const legacy = {
      id: "legacy-summary",
      title: "Registro anterior",
      description: "Resumo anterior",
      amount_cents: 2990,
      status: "pago" as const,
      status_label: "Sucesso",
      occurred_at: new Date(),
      gateway: "mercadopago",
      external_id: "legacy-subscription",
    };
    const history = await withInvoiceHistory(tag, [legacy]);
    assert.equal(history.length, 2);
    assert.equal(
      history.some((item) => item.invoice?.id === liveRow.id),
      false,
    );
    assert.equal(
      (await invoicePdf({ auth: { id: tag, role: "psicologo" }, params: { id: liveRow.id } }))
        .status,
      404,
    );
    assert.ok(history.some((item) => item.id === legacy.id && !item.invoice));
    assert.ok(history.some((item) => item.invoice?.id === row.id && !item.invoice.downloadable));
    assert.equal(
      (
        await invoicePdf({
          auth: { id: "another-user", role: "psicologo" },
          params: { id: row.id },
        })
      ).status,
      404,
    );
    assert.equal(
      (await invoicePdf({ auth: { id: tag, role: "paciente" }, params: { id: row.id } })).status,
      403,
    );
    assert.equal(
      (await invoicePdf({ auth: { id: tag, role: "psicologo" }, params: { id: row.id } })).status,
      409,
    );
    console.log(
      "Ledger: uniqueness, immutable snapshot, concurrent leases, recovery, ownership and download denial passed. No provider requests made.",
    );
  } finally {
    await prisma.billing_invoice_job.deleteMany({ where: { resource_id: tag } });
    await prisma.billing_invoice.deleteMany({ where: { company_id: tag } });
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error("Isolated ledger integration failed.");
  process.exitCode = 1;
});
