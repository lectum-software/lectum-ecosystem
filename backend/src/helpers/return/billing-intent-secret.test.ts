import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { sanitizeSensitiveData } from "@/utils/sanitize-sensitive";
import { send } from ".";

const paymentSecret = "pi_exampleonly_secret_exampleonly";
const setupSecret = "seti_exampleonly_secret_exampleonly";
const payload = (type = "payment", secret = paymentSecret) => ({
  operation: {
    id: "local-operation",
    confirmation: { type, client_secret: secret, secret: "never-returned" },
  },
  client_secret: secret,
  nested: { client_secret: secret },
  access_token: "never-returned",
});

test("billing intent exception is opt-in and restricted to one DTO path and intent type", () => {
  for (const [type, secret] of [
    ["payment", paymentSecret],
    ["setup", setupSecret],
  ]) {
    const data = payload(type, secret);
    const sanitized = sanitizeSensitiveData(data, {
      allowBillingIntentSecret: true,
      removeAuthTokens: true,
    });
    assert.deepEqual(sanitized, {
      operation: { id: "local-operation", confirmation: { type, client_secret: secret } },
      nested: {},
    });
    assert.equal(JSON.stringify(sanitizeSensitiveData(data)).includes(secret), false);
  }
  for (const secret of [
    setupSecret,
    `${paymentSecret}\n`,
    "sk_live_exampleonly",
    "x".repeat(513),
  ]) {
    const sanitized = sanitizeSensitiveData(payload("payment", secret), {
      allowBillingIntentSecret: true,
    });
    assert.equal(Object.hasOwn(sanitized.operation.confirmation, "client_secret"), false);
  }
  assert.deepEqual(sanitizeSensitiveData([payload()], { allowBillingIntentSecret: true }), [
    { operation: { id: "local-operation", confirmation: { type: "payment" } }, nested: {} },
  ]);
});

test("billing intent exception never authorizes the same value in arbitrary siblings", () => {
  const data = {
    ...payload(),
    description: paymentSecret,
    other: { value: setupSecret },
    values: [paymentSecret, setupSecret],
  };
  assert.deepEqual(
    sanitizeSensitiveData(data, { allowBillingIntentSecret: true, removeAuthTokens: true }),
    {
      operation: {
        id: "local-operation",
        confirmation: { type: "payment", client_secret: paymentSecret },
      },
      nested: {},
      description: "[REDACTED]",
      other: { value: "[REDACTED]" },
      values: ["[REDACTED]", "[REDACTED]"],
    },
  );
});

test("send only permits the narrow secret on authenticated Stripe operation POST responses", async () => {
  const app = express();
  app.use((req, res) => {
    if (req.headers["x-unit-role"] !== "absent") {
      req.auth = { id: "local-user", role: req.headers["x-unit-role"] } as typeof req.auth;
    }
    return send(res, { success: true, allowBillingIntentSecret: true, data: payload() });
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const base = `http://127.0.0.1:${address.port}`;
    const cases = [
      ["POST", "/api/private/psychologist/billing/stripe/checkout", "psicologo", true],
      [
        "POST",
        "/api/private/psychologist/billing/stripe/checkout/local-operation/confirm",
        "psicologo",
        true,
      ],
      ["POST", "/api/private/psychologist/billing/stripe/payment-method", "psicologo", true],
      ["GET", "/api/private/psychologist/billing/stripe/checkout", "psicologo", false],
      ["POST", "/api/public/billing/stripe/checkout", "psicologo", false],
      ["POST", "/api/private/psychologist/billing/checkout", "psicologo", false],
      ["POST", "/api/private/psychologist/billing/stripe/checkout", "paciente", false],
      ["POST", "/api/private/psychologist/billing/stripe/checkout", "absent", false],
    ] as const;
    for (const [method, path, role, expected] of cases) {
      const response = await fetch(`${base}${path}`, { method, headers: { "x-unit-role": role } });
      const body = (await response.json()) as { data: ReturnType<typeof payload> };
      assert.equal(Object.hasOwn(body, "allowBillingIntentSecret"), false);
      assert.equal(Object.hasOwn(body, "allowAuthTokens"), false);
      assert.equal(body.data.operation.confirmation.client_secret === paymentSecret, expected);
      assert.equal(Object.hasOwn(body.data, "access_token"), false);
      assert.equal(Object.hasOwn(body.data, "client_secret"), false);
    }
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
