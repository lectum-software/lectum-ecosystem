import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type { BillingPaymentHistoryItem } from "@/modules/api/private/psychologist/billing/subscription/repositories/interfaces/ISubscriptionRepository";
import type { FiscalRequirements } from "./fiscal-requirements";

test("subscription fiscal guidance is owner/hash scoped, read-only and follows actual DB identity/address eligibility", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: prisma } = await import("@/infra/database/prisma");
  const { showSubscription } = await import(
    "@/modules/api/private/psychologist/billing/subscription/use-cases/services"
  );
  const { storedFinancialReceiptHash } = await import("../stripe/financial-ledger/policy");
  const { fiscalRequirementsForHistory } = await import("./fiscal-requirements");
  const tag = randomUUID().replaceAll("-", "");
  const account = `acct_fiscal${tag}`;
  const beforeEnv = { ...process.env };
  Object.assign(process.env, {
    STRIPE_ENV: "test",
    STRIPE_ACCOUNT_ID: account,
    SENDNF_TEST_ENABLED: "false",
    SENDNF_LIVE_ENABLED: "false",
  });
  delete process.env.STRIPE_SECRET_KEY;
  const userIds: string[] = [];
  const profileIds: string[] = [];
  const contractIds: string[] = [];
  const read = async (id: string) => {
    const response = await showSubscription({ auth: { id, role: "psicologo" } });
    assert.equal(response.status, 200);
    assert.ok("data" in response && response.data);
    assert.ok(Array.isArray(response.data.payment_history));
    return response.data as {
      payment_history: BillingPaymentHistoryItem[];
      fiscal_requirements?: FiscalRequirements;
    };
  };
  try {
    const plan = await prisma.subscription_plan.findFirstOrThrow({
      where: { slug: "profissional", deleted: false, active: true },
    });
    for (const label of ["owner", "other"]) {
      const user = await prisma.user.create({
        data: {
          name: "Local fiscal projection test",
          email: `${label}-${tag}@example.invalid`,
          role: "psicologo",
          active: true,
        },
      });
      userIds.push(user.id);
      const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
      profileIds.push(profile.id);
      const contract = await prisma.professional_subscription.create({
        data: {
          psychologist_id: profile.id,
          plan_id: plan.id,
          source: "stripe",
          gateway: "stripe",
          gateway_mode: "test",
          gateway_account_id: account,
          gateway_subscription_id: `sub_fiscal${tag}${label}`,
          status: "ativa",
          current_period_end: new Date(Date.now() + 86_400_000),
        },
      });
      contractIds.push(contract.id);
    }
    assert.equal((await read(userIds[0])).fiscal_requirements, undefined);
    // Repository fixtures prove projection/access control, not a financial or fiscal execution.
    const now = new Date(Date.now() - 1000);
    let receipt = await prisma.billing_financial_receipt.create({
      data: {
        gateway: "stripe",
        mode: "test",
        account_id: account,
        subscription_id: contractIds[0],
        psychologist_id: profileIds[0],
        provider_subscription_id: `sub_fiscal${tag}owner`,
        invoice_id: `in_fiscal${tag}`,
        invoice_payment_id: `inpay_fiscal${tag}`,
        payment_intent_id: `pi_fiscal${tag}`,
        charge_id: `ch_fiscal${tag}`,
        price_id: `price_fiscal${tag}`,
        currency: "BRL",
        amount_paid_cents: 2990,
        paid_at: now,
        invoice_paid_at: now,
        period_start: now,
        period_end: new Date(now.getTime() + 86_400_000),
        immutable_hash: "invalid",
        current_state: "paid",
        observed_at: now,
      },
    });
    assert.equal((await read(userIds[0])).fiscal_requirements, undefined);
    receipt = await prisma.billing_financial_receipt.update({
      where: { id: receipt.id },
      data: { immutable_hash: storedFinancialReceiptHash(receipt) },
    });
    assert.equal((await read(userIds[1])).fiscal_requirements, undefined);
    assert.equal((await read(userIds[0])).fiscal_requirements?.next_action, "billing_address");
    const address = {
      user_id: userIds[0],
      zip: "01001000",
      street: "Endereco local",
      number: "1",
      district: "Bairro local",
      city: "Sao Paulo",
      state: "SP",
    };
    await prisma.billing_address.create({
      data: {
        ...address,
        createdAt: new Date(Date.now() - 20_000),
        updatedAt: new Date(Date.now() + 20_000),
      },
    });
    const latest = await prisma.billing_address.create({
      data: { ...address, state: "XX", createdAt: new Date(Date.now() - 10_000) },
    });
    assert.equal((await read(userIds[0])).fiscal_requirements?.next_action, "billing_address");
    await prisma.billing_address.update({ where: { id: latest.id }, data: { state: "SP" } });
    assert.equal(
      (await read(userIds[0])).fiscal_requirements?.next_action,
      "complete_registration",
    );
    await prisma.psychologist_profile.update({
      where: { id: profileIds[0] },
      data: { whatsapp: "5511999999999" },
    });
    assert.equal(
      (await read(userIds[0])).fiscal_requirements?.next_action,
      "registry_verification",
    );
    for (const crp_status of ["aprovado", "rejeitado"]) {
      await prisma.psychologist_profile.update({
        where: { id: profileIds[0] },
        data: { crp_status },
      });
      assert.equal((await read(userIds[0])).fiscal_requirements?.next_action, "support");
    }
    await prisma.psychologist_profile.update({
      where: { id: profileIds[0] },
      data: { crp_status: "pendente" },
    });
    const courtesy = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profileIds[0],
        plan_id: plan.id,
        source: "admin_grant",
        status: "ativa",
      },
    });
    assert.equal((await read(userIds[0])).fiscal_requirements?.next_action, "support");
    await prisma.professional_subscription.delete({ where: { id: courtesy.id } });
    await prisma.psychologist_profile.update({
      where: { id: profileIds[0] },
      data: { cpf: "52998224725", crp_status: "aprovado" },
    });
    await prisma.fiscal_identity_event.create({
      data: {
        psychologist_id: profileIds[0],
        cpf: "11144477735",
        full_name: "Outro Nome Local",
        source: "manual_admin",
        actor_id: `local-admin-${tag}`,
      },
    });
    assert.equal((await read(userIds[0])).fiscal_requirements?.next_action, "support");
    await prisma.fiscal_identity_event.create({
      data: {
        psychologist_id: profileIds[0],
        cpf: "52998224725",
        full_name: "Nome Fiscal Local",
        source: "manual_admin",
        actor_id: `local-admin-${tag}`,
      },
    });
    const before = await prisma.psychologist_profile.findUniqueOrThrow({
      where: { id: profileIds[0] },
    });
    const ready = await read(userIds[0]);
    assert.deepEqual(ready.fiscal_requirements, {
      address_complete: true,
      identity_complete: true,
      next_action: "none",
    });
    assert.deepEqual(
      await prisma.psychologist_profile.findUniqueOrThrow({ where: { id: profileIds[0] } }),
      before,
    );
    assert.equal(ready.payment_history[0]?.invoice, undefined);
    assert.equal(JSON.stringify(ready.fiscal_requirements).includes("Nome Fiscal"), false);
    assert.equal(
      await fiscalRequirementsForHistory(
        userIds[0],
        ready.payment_history.map((row) => ({ ...row, status: "processado" })),
      ),
      undefined,
    );
    assert.equal(
      await fiscalRequirementsForHistory(
        userIds[0],
        ready.payment_history.map((row) => ({
          ...row,
          invoice: {
            id: "existing-snapshot",
            status: "processing",
            number: null,
            mode: "test",
            downloadable: false,
          },
        })),
      ),
      undefined,
    );
    await prisma.billing_financial_receipt.update({
      where: { id: receipt.id },
      data: { current_state: "refunded" },
    });
    assert.equal((await read(userIds[0])).fiscal_requirements, undefined);
  } finally {
    await prisma.billing_financial_receipt.deleteMany({
      where: { subscription_id: { in: contractIds } },
    });
    await prisma.fiscal_identity_event.deleteMany({
      where: { psychologist_id: { in: profileIds } },
    });
    await prisma.professional_subscription.deleteMany({
      where: { psychologist_id: { in: profileIds } },
    });
    await prisma.billing_address.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.psychologist_profile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    for (const key of Object.keys(process.env)) if (!(key in beforeEnv)) delete process.env[key];
    Object.assign(process.env, beforeEnv);
    await prisma.$disconnect();
  }
});
