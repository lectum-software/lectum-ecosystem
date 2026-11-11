import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type { professional_subscription } from "@/interfaces/objects";

test("owned historical payment allows address-only maintenance after cancellation or courtesy without sync, entitlement or fiscal mutation", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const beforeEnv = { ...process.env };
  const { default: prisma } = await import("@/infra/database/prisma");
  const { billingAddressAccess } = await import("./address-access");
  const { storedFinancialReceiptHash } = await import("../stripe/financial-ledger/policy");
  const { default: save } = await import(
    "@/modules/api/private/psychologist/billing/address/use-cases/services"
  );
  const { default: current } = await import(
    "@/modules/api/private/psychologist/billing/current/use-cases/services"
  );
  const { AddressRepository } = await import(
    "@/modules/api/private/psychologist/billing/address/repositories/AddressRepository"
  );
  const tag = randomUUID().replaceAll("-", "");
  const account = `acct_addr${tag}`;
  const company = `company-addr-${tag}`;
  Object.assign(process.env, {
    STRIPE_ENV: "test",
    STRIPE_ACCOUNT_ID: account,
    SENDNF_TEST_ENABLED: "false",
    SENDNF_LIVE_ENABLED: "false",
  });
  // These repository fixtures are not payment/fiscal evidence. No provider is instantiated.
  delete process.env.STRIPE_SECRET_KEY;
  const users: string[] = [];
  const profiles: string[] = [];
  const contracts: string[] = [];
  const address = {
    zip: "01311000",
    street: "Endereco de teste local",
    number: "1",
    district: "Bairro de teste",
    city: "Sao Paulo",
    state: "SP",
  };
  try {
    const plan = await prisma.subscription_plan.findFirstOrThrow({
      where: { slug: "profissional", deleted: false },
    });
    const free = await prisma.subscription_plan.findFirstOrThrow({
      where: { slug: "gratuito", deleted: false },
    });
    for (const name of ["owner", "other"]) {
      const user = await prisma.user.create({
        data: {
          name: "Local address fixture",
          email: `${name}-${tag}@example.invalid`,
          role: "psicologo",
        },
      });
      users.push(user.id);
      const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
      profiles.push(profile.id);
      await prisma.professional_subscription.create({
        data: {
          psychologist_id: profile.id,
          plan_id: free.id,
          source: "free_signup",
          status: "ativa",
        },
      });
    }
    const contract = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profiles[0],
        plan_id: plan.id,
        source: "stripe",
        gateway: "stripe",
        gateway_mode: "test",
        gateway_account_id: account,
        gateway_subscription_id: `sub_addr${tag}`,
        status: "cancelada",
        current_period_end: new Date(Date.now() - 86_400_000),
      },
    });
    contracts.push(contract.id);
    const denied = { editable: false, maintenanceOnly: false };
    assert.deepEqual(await billingAddressAccess(users[0]), denied);
    assert.deepEqual(await billingAddressAccess(users[1]), denied);
    const now = new Date(Date.now() - 1000);
    const receiptData = {
      gateway: "stripe",
      mode: "test",
      account_id: account,
      subscription_id: contract.id,
      psychologist_id: profiles[0],
      provider_subscription_id: contract.gateway_subscription_id!,
      invoice_id: `in_addr${tag}`,
      invoice_payment_id: `inpay_addr${tag}`,
      payment_intent_id: `pi_addr${tag}`,
      charge_id: `ch_addr${tag}`,
      price_id: `price_addr${tag}`,
      currency: "BRL",
      amount_paid_cents: 2990,
      paid_at: now,
      invoice_paid_at: now,
      period_start: new Date(now.getTime() - 86_400_000),
      period_end: now,
      immutable_hash: "unverified",
      current_state: "paid",
      observed_at: now,
    };
    for (const [name, change] of Object.entries({
      owner: { psychologist_id: profiles[1] },
      account: { account_id: `${account}other` },
      mode: { mode: "live" },
      contract: { provider_subscription_id: "sub_wrong" },
      future: { paid_at: new Date(Date.now() + 60_000) },
      hash: {},
    })) {
      const receipt = await prisma.billing_financial_receipt.create({
        data: {
          ...receiptData,
          ...change,
          invoice_id: `in_addr${tag}${name}`,
          invoice_payment_id: `inpay_addr${tag}${name}`,
        },
      });
      if (name !== "hash")
        await prisma.billing_financial_receipt.update({
          where: { id: receipt.id },
          data: { immutable_hash: storedFinancialReceiptHash(receipt) },
        });
      assert.deepEqual(await billingAddressAccess(users[0]), denied);
      assert.deepEqual(await billingAddressAccess(users[1]), denied);
    }
    const receipt = await prisma.billing_financial_receipt.create({ data: receiptData });
    await prisma.billing_financial_receipt.update({
      where: { id: receipt.id },
      data: { immutable_hash: storedFinancialReceiptHash(receipt) },
    });
    assert.deepEqual(await billingAddressAccess(users[0]), {
      editable: true,
      maintenanceOnly: true,
    });
    const request = { auth: { id: users[0], role: "psicologo" }, b: address } as Parameters<
      typeof save
    >[0];
    const beforeSubscriptions = await prisma.professional_subscription.findMany({
      where: { psychologist_id: profiles[0] },
      orderBy: { id: "asc" },
    });
    const beforeProfile = await prisma.psychologist_profile.findUniqueOrThrow({
      where: { id: profiles[0] },
    });
    const result = await save(request);
    assert.equal(result.status, 200);
    assert.ok("data" in result && result.data?.next_path === "/app/profissional/assinatura");
    const shown = await current({ auth: request.auth });
    assert.ok(
      "data" in shown &&
        shown.data?.billing_address_editable &&
        shown.data?.billing_address_maintenance_only,
    );
    assert.equal((shown.data?.current as professional_subscription | null)?.plan?.slug, "gratuito");
    assert.deepEqual(
      await prisma.professional_subscription.findMany({
        where: { psychologist_id: profiles[0] },
        orderBy: { id: "asc" },
      }),
      beforeSubscriptions,
    );
    const afterProfile = await prisma.psychologist_profile.findUniqueOrThrow({
      where: { id: profiles[0] },
    });
    assert.equal(afterProfile.crp_status, beforeProfile.crp_status);
    assert.deepEqual(afterProfile.cfp_verified_at, beforeProfile.cfp_verified_at);
    assert.equal(afterProfile.cpf, beforeProfile.cpf);
    assert.equal(await prisma.billing_operation.count({ where: { user_id: { in: users } } }), 0);
    assert.equal(await prisma.billing_invoice.count({ where: { user_id: { in: users } } }), 0);
    assert.equal((await save({ ...request, auth: { ...request.auth, id: users[1] } })).status, 409);
    assert.equal(
      (await save({ ...request, auth: { ...request.auth, role: "paciente" } })).status,
      403,
    );
    await assert.rejects(new AddressRepository().saveAddress(users[1], profiles[0], address));
    assert.equal(await prisma.billing_address.count({ where: { user_id: users[1] } }), 0);
    const courtesy = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profiles[0],
        plan_id: plan.id,
        source: "admin_grant",
        status: "ativa",
      },
    });
    assert.deepEqual(await billingAddressAccess(users[0]), {
      editable: true,
      maintenanceOnly: true,
    });
    assert.equal((await save(request)).status, 200);
    assert.deepEqual(
      await prisma.professional_subscription.findUnique({ where: { id: courtesy.id } }),
      courtesy,
    );
    await prisma.psychologist_profile.update({
      where: { id: profiles[0] },
      data: { deleted: true },
    });
    assert.deepEqual(await billingAddressAccess(users[0]), denied);
    assert.equal((await save(request)).status, 404);
    await prisma.psychologist_profile.update({
      where: { id: profiles[0] },
      data: { deleted: false },
    });

    // Existing MP fiscal records remain an owner-bound maintenance path without credentials or sync.
    Object.assign(process.env, {
      MERCADO_PAGO_ENV: "sandbox",
      SENDNF_TEST_ENABLED: "true",
      SENDNF_API_KEY: "nt_test_unit_only",
      SENDNF_COMPANY_ID: company,
      SENDNF_PAYMENTS_FROM: "2026-01-01T00:00:00Z",
      SENDNF_SERVICE_DESCRIPTION: "Descricao fiscal de teste local",
    });
    const mp = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profiles[1],
        plan_id: plan.id,
        source: "mercadopago",
        gateway: "mercadopago",
        gateway_subscription_id: `mp_addr${tag}`,
        status: "cancelada",
        current_period_end: now,
      },
    });
    const fiscal = await prisma.billing_invoice.create({
      data: {
        gateway: "mercadopago",
        mode: "test",
        user_id: users[1],
        subscription_id: mp.id,
        payment_id: `mp_pay${tag}`,
        company_id: company,
        amount_cents: 2990,
        currency: "BRL",
        paid_at: now,
        reference: `ref_addr${tag}`,
        request_snapshot: { repository_fixture: true },
        status: "awaiting_activation",
      },
    });
    assert.deepEqual(await billingAddressAccess(users[1]), {
      editable: true,
      maintenanceOnly: true,
    });
    assert.equal((await save({ ...request, auth: { ...request.auth, id: users[1] } })).status, 200);
    assert.deepEqual(await prisma.billing_invoice.findUnique({ where: { id: fiscal.id } }), fiscal);
    assert.deepEqual(
      await prisma.professional_subscription.findUnique({ where: { id: mp.id } }),
      mp,
    );
    for (const change of [
      { user_id: users[0] },
      { subscription_id: contract.id },
      { company_id: `${company}other` },
      { mode: "live" },
      { account_id: "acct_wrong" },
    ]) {
      await prisma.billing_invoice.update({ where: { id: fiscal.id }, data: change });
      assert.deepEqual(await billingAddressAccess(users[1]), denied);
      await prisma.billing_invoice.update({
        where: { id: fiscal.id },
        data: {
          user_id: users[1],
          subscription_id: mp.id,
          company_id: company,
          mode: "test",
          account_id: null,
        },
      });
    }
  } finally {
    process.env = beforeEnv;
    await prisma.billing_invoice.deleteMany({ where: { user_id: { in: users } } });
    await prisma.billing_financial_receipt.deleteMany({
      where: { subscription_id: { in: contracts } },
    });
    await prisma.billing_address.deleteMany({ where: { user_id: { in: users } } });
    await prisma.professional_subscription.deleteMany({
      where: { psychologist_id: { in: profiles } },
    });
    await prisma.psychologist_profile.deleteMany({ where: { id: { in: profiles } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
});
