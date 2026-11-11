import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("Admin invoice ownership and audit guards use real isolated PostgreSQL", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async (context) => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(process.env.NODE_ENV, "test");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/lectum_stripe_test");
  assert.ok(!process.env.STRIPE_SECRET_KEY);
  assert.ok(!process.env.SENDNF_API_KEY);
  const { default: prisma } = await import("@/infra/database/prisma");
  const { AdminInvoiceRepository } = await import("./AdminInvoiceRepository");
  const repository = new AdminInvoiceRepository();
  const prefix = `admin-invoice-qa-${randomUUID()}`;
  const userIds: string[] = [];
  const profileIds: string[] = [];
  const contractIds: string[] = [];
  let adminId: string | undefined;
  let invoiceId: string | undefined;

  try {
    const plan = await prisma.subscription_plan.findFirstOrThrow({
      where: { slug: "profissional", deleted: false },
    });
    const actor = await prisma.admin.create({
      data: {
        name: "Ephemeral Admin invoice policy QA",
        email: `${prefix}@example.invalid`,
        active: true,
        confirmed: true,
      },
    });
    adminId = actor.id;
    for (const label of ["owner", "other"]) {
      const user = await prisma.user.create({
        data: {
          name: "Ephemeral Admin invoice owner QA",
          email: `${prefix}-${label}@example.invalid`,
          role: "psicologo",
        },
      });
      userIds.push(user.id);
      const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
      profileIds.push(profile.id);
      const subscription = await prisma.professional_subscription.create({
        data: {
          psychologist_id: profile.id,
          plan_id: plan.id,
          status: "cancelada",
          source: "stripe",
          gateway: "stripe",
          gateway_mode: "test",
          gateway_account_id: prefix,
          gateway_subscription_id: `${prefix}-${label}`,
        },
      });
      contractIds.push(subscription.id);
    }
    // Ephemeral repository-policy row, never an issued document or proof of a PDF.
    // No provider adapter, worker, SDK or network request is instantiated by this test.
    const invoice = await prisma.billing_invoice.create({
      data: {
        gateway: "stripe",
        account_id: prefix,
        mode: "test",
        payment_id: `${prefix}-payment`,
        subscription_id: contractIds[0],
        user_id: userIds[0],
        company_id: prefix,
        amount_cents: 2990,
        currency: "BRL",
        paid_at: new Date(),
        reference: prefix,
        document_id: `${prefix}-policy-document`,
        status: "authorized",
        request_snapshot: { ephemeral_repository_policy_fixture: true },
      },
    });
    invoiceId = invoice.id;
    const input = async () => {
      const record = await repository.findForUser(invoice.id, userIds[0]);
      assert.ok(record);
      return {
        adminId: actor.id,
        invoiceId: invoice.id,
        userId: userIds[0],
        updatedAt: record.invoice.updated_at,
        subscriptionUpdatedAt: record.subscription.updatedAt,
        mode: "test" as const,
      };
    };
    const auditCount = () => prisma.admin_activity_log.count({ where: { admin_id: actor.id } });

    await context.test(
      "findForUser retains canceled contracts but rejects foreign ownership",
      async () => {
        assert.equal(
          (await repository.findForUser(invoice.id, userIds[0]))?.invoice.id,
          invoice.id,
        );
        assert.equal(await repository.findForUser(invoice.id, userIds[1]), null);
        assert.equal(await repository.findForUser(`${prefix}-missing`, userIds[0]), null);
        await prisma.billing_invoice.update({
          where: { id: invoice.id },
          data: { subscription_id: contractIds[1] },
        });
        assert.equal(await repository.findForUser(invoice.id, userIds[0]), null);
        await prisma.billing_invoice.update({
          where: { id: invoice.id },
          data: { subscription_id: contractIds[0] },
        });
        for (const model of ["subscription", "profile", "user"] as const) {
          const change = async (deleted: boolean) => {
            if (model === "subscription")
              await prisma.professional_subscription.update({
                where: { id: contractIds[0] },
                data: { deleted },
              });
            else if (model === "profile")
              await prisma.psychologist_profile.update({
                where: { id: profileIds[0] },
                data: { deleted },
              });
            else await prisma.user.update({ where: { id: userIds[0] }, data: { deleted } });
          };
          await change(true);
          assert.equal(await repository.findForUser(invoice.id, userIds[0]), null);
          await change(false);
        }
      },
    );

    await context.test(
      "a prepared audit stores only local object identity and allowlisted metadata",
      async () => {
        assert.equal(await repository.recordPreparedDownload(await input()), true);
        const logs = await prisma.admin_activity_log.findMany({ where: { admin_id: actor.id } });
        assert.equal(logs.length, 1);
        const [log] = logs;
        assert.equal(log.admin_id, actor.id);
        assert.equal(log.target_id, invoice.id);
        assert.equal(log.target_type, "billing_invoice");
        assert.equal(log.domain, "billing_invoice");
        assert.equal(log.action, "billing_invoice_pdf_prepared");
        assert.equal(log.source, "admin_panel");
        assert.equal(log.area, "financeiro");
        assert.deepEqual(log.metadata, { outcome: "prepared", mode: "test" });
        for (const value of [log.changed_fields, log.safe_before, log.safe_after, log.reason])
          assert.equal(value, null);
        const audit = JSON.stringify(log);
        for (const secret of [prefix, userIds[0], invoice.payment_id, invoice.document_id])
          assert.ok(!audit.includes(secret!));
      },
    );

    await context.test(
      "stale invoice or subscription timestamps refuse audit without appending",
      async () => {
        const invoiceInput = await input();
        await prisma.billing_invoice.update({
          where: { id: invoice.id },
          data: { updated_at: new Date(invoiceInput.updatedAt.getTime() + 1_000) },
        });
        assert.equal(await repository.recordPreparedDownload(invoiceInput), false);
        const subscriptionInput = await input();
        await prisma.professional_subscription.update({
          where: { id: contractIds[0] },
          data: { updatedAt: new Date(subscriptionInput.subscriptionUpdatedAt.getTime() + 1_000) },
        });
        assert.equal(await repository.recordPreparedDownload(subscriptionInput), false);
        assert.equal(await auditCount(), 1);
      },
    );

    await context.test(
      "non-authorized status, mode or owner mismatch cannot append prepared audit",
      async () => {
        const correct = await input();
        assert.equal(await repository.recordPreparedDownload({ ...correct, mode: "live" }), false);
        assert.equal(
          await repository.recordPreparedDownload({ ...correct, userId: userIds[1] }),
          false,
        );
        for (const status of ["cancelled", "rejected", "simulated", "authorization_unverified"]) {
          const changed = await prisma.billing_invoice.update({
            where: { id: invoice.id },
            data: { status },
          });
          assert.equal(
            await repository.recordPreparedDownload({ ...correct, updatedAt: changed.updated_at }),
            false,
          );
        }
        await prisma.billing_invoice.update({
          where: { id: invoice.id },
          data: { status: "authorized" },
        });
        assert.equal(await auditCount(), 1);
      },
    );

    await context.test("inactive, unconfirmed, deleted or absent actors fail closed", async () => {
      const correct = await input();
      for (const flags of [
        { active: false, confirmed: true, deleted: false },
        { active: true, confirmed: false, deleted: false },
        { active: true, confirmed: true, deleted: true },
      ]) {
        await prisma.admin.update({ where: { id: actor.id }, data: flags });
        assert.equal(await repository.recordPreparedDownload(correct), false);
      }
      await prisma.admin.update({
        where: { id: actor.id },
        data: { active: true, confirmed: true, deleted: false },
      });
      assert.equal(
        await repository.recordPreparedDownload({ ...correct, adminId: `${prefix}-absent` }),
        false,
      );
      assert.equal(await auditCount(), 1);
    });

    await context.test(
      "ownership changed during remote work refuses the prepared audit",
      async () => {
        const correct = await input();
        await prisma.psychologist_profile.update({
          where: { id: profileIds[0] },
          data: { deleted: true },
        });
        assert.equal(await repository.recordPreparedDownload(correct), false);
        await prisma.psychologist_profile.update({
          where: { id: profileIds[0] },
          data: { deleted: false },
        });
        await prisma.user.update({ where: { id: userIds[0] }, data: { deleted: true } });
        assert.equal(await repository.recordPreparedDownload(correct), false);
        await prisma.user.update({ where: { id: userIds[0] }, data: { deleted: false } });
        assert.equal(await auditCount(), 1);
      },
    );
  } finally {
    if (adminId) await prisma.admin_activity_log.deleteMany({ where: { admin_id: adminId } });
    if (invoiceId) await prisma.billing_invoice.deleteMany({ where: { id: invoiceId } });
    await prisma.professional_subscription.deleteMany({ where: { id: { in: contractIds } } });
    await prisma.psychologist_profile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (adminId) await prisma.admin.deleteMany({ where: { id: adminId } });
    await prisma.$disconnect();
  }
});
