import assert from "node:assert/strict";
import { test } from "node:test";
import type { InvoiceConfig } from "@/modules/billing/invoices/config";
import type { AdminInvoiceRecord } from "../repositories/interfaces/IAdminInvoiceRepository";
import { canReadAdminInvoice } from "./access-policy";

const config = { companyId: "company-unit", mode: "test" } as InvoiceConfig;
const env: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://unit@127.0.0.1:5432/lectum_stripe_test",
  BASE: "http://127.0.0.1:3121",
  STRIPE_ENV: "test",
  STRIPE_ACCOUNT_ID: "acct_unit",
  MERCADO_PAGO_ENV: "sandbox",
};
const record = {
  invoice: {
    id: "invoice-unit",
    subscription_id: "subscription-unit",
    user_id: "owner-unit",
    company_id: "company-unit",
    gateway: "stripe",
    account_id: "acct_unit",
    mode: "test",
  },
  subscription: {
    id: "subscription-unit",
    gateway: "stripe",
    source: "stripe",
    gateway_mode: "test",
    gateway_account_id: "acct_unit",
    psychologist: { id: "profile-unit", user_id: "owner-unit" },
  },
} as AdminInvoiceRecord;

test("admin fiscal object access binds user, subscription, gateway, account, company and mode", () => {
  assert.equal(canReadAdminInvoice(record, "owner-unit", config, env), true);
  assert.equal(canReadAdminInvoice(record, "different-user", config, env), false);
  for (const change of [
    { subscription_id: "other-subscription" },
    { user_id: "other-user" },
    { company_id: "other-company" },
    { gateway: "mercadopago" },
    { account_id: "acct_other" },
    { mode: "live" },
  ])
    assert.equal(
      canReadAdminInvoice(
        { ...record, invoice: { ...record.invoice, ...change } },
        "owner-unit",
        config,
        env,
      ),
      false,
    );
  for (const change of [
    { id: "other-subscription" },
    { gateway_account_id: "acct_other" },
    { gateway_mode: "live" },
    { source: "admin_grant" },
    { psychologist: { id: "other-profile", user_id: "other-user" } },
  ])
    assert.equal(
      canReadAdminInvoice(
        { ...record, subscription: { ...record.subscription, ...change } },
        "owner-unit",
        config,
        env,
      ),
      false,
    );
  assert.equal(canReadAdminInvoice(record, "owner-unit", config, {}), false);
});

test("legacy MP preserves null identity only inside the explicit fiscal runtime scope", () => {
  const mp: AdminInvoiceRecord = {
    ...record,
    invoice: { ...record.invoice, gateway: "mercadopago", account_id: null },
    subscription: {
      ...record.subscription,
      gateway: null,
      source: "mercadopago",
      gateway_mode: null,
      gateway_account_id: null,
    },
  };
  assert.equal(canReadAdminInvoice(mp, "owner-unit", config, env), true);
  assert.equal(
    canReadAdminInvoice(mp, "owner-unit", config, { ...env, MERCADO_PAGO_ENV: "production" }),
    false,
  );
  assert.equal(
    canReadAdminInvoice(
      { ...mp, subscription: { ...mp.subscription, gateway_mode: "live" } },
      "owner-unit",
      config,
      env,
    ),
    false,
  );
});
