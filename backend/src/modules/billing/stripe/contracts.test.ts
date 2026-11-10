import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cardValidator,
  checkoutValidator,
  configValidator,
  confirmValidator,
} from "@/modules/api/private/psychologist/billing/stripe/validator";

test("Stripe validators reject caller-supplied price, customer, secrets and malformed request keys", async () => {
  const request = { schema: true, language: "pt", headers: {} };
  const schemas = await checkoutValidator(request, null, () => assert.fail());
  const body = {
    request_key: "ca7cd772-ce68-4e26-8a2b-2bb61ce1cbb8",
    quote_revision: "localoffer:1",
  };
  assert.equal(schemas.body.safeParse(body).success, true);
  assert.equal(schemas.body.safeParse({ ...body, intent: "courtesy_renewal" }).success, true);
  for (const forbidden of [
    "price_id",
    "customer_id",
    "amount_cents",
    "client_secret",
    "payment_method_id",
  ]) {
    assert.equal(schemas.body.safeParse({ ...body, [forbidden]: "unit" }).success, false);
  }
  assert.equal(schemas.body.safeParse({ ...body, request_key: "not-a-uuid" }).success, false);
  const card = await cardValidator(request, null, () => assert.fail());
  assert.equal(card.body.safeParse({ request_key: body.request_key }).success, true);
  assert.equal(card.body.safeParse(body).success, false);
  const config = await configValidator(request, null, () => assert.fail());
  assert.equal(config.query.safeParse({}).success, true);
  assert.equal(config.query.safeParse({ intent: "courtesy_renewal" }).success, true);
  const confirm = await confirmValidator(request, null, () => assert.fail());
  assert.equal(confirm.params.safeParse({ id: "cmockoperation000000001" }).success, true);
  assert.equal(confirm.params.safeParse({ id: "sub_remote" }).success, false);
  assert.equal(confirm.body.safeParse({ client_secret: "never-accepted" }).success, false);
});
