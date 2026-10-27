import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCardUpdateIdempotencyKey } from "./idempotency";
import { MercadoPagoAdapter, MercadoPagoAdapterError } from "./MercadoPagoAdapter";

type CapturedRequest = {
  url: string;
  method: string;
  headers: Headers;
  body: Record<string, unknown> | undefined;
  redirect: NonNullable<Parameters<typeof fetch>[1]>["redirect"];
  signal: AbortSignal | null | undefined;
};

// Unit transport interception only: nothing is forwarded or approved by a provider.
const captureTransport = () => {
  const requests: CapturedRequest[] = [];
  const previousFetch = globalThis.fetch;
  const previousToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const previousEnv = process.env.MERCADO_PAGO_ENV;
  process.env.MERCADO_PAGO_ACCESS_TOKEN = "APP_USR-example-only-not-a-credential";
  process.env.MERCADO_PAGO_ENV = "production";
  globalThis.fetch = async (url, options) => {
    requests.push({
      url: String(url),
      method: options?.method ?? "GET",
      headers: new Headers(options?.headers),
      body: typeof options?.body === "string" ? JSON.parse(options.body) : undefined,
      redirect: options?.redirect,
      signal: options?.signal,
    });
    throw { status: 400 };
  };
  return {
    requests,
    restore: () => {
      globalThis.fetch = previousFetch;
      if (previousToken === undefined) delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
      else process.env.MERCADO_PAGO_ACCESS_TOKEN = previousToken;
      if (previousEnv === undefined) delete process.env.MERCADO_PAGO_ENV;
      else process.env.MERCADO_PAGO_ENV = previousEnv;
    },
  };
};

const createInput = (subscriptionId: string, deviceSessionId?: string) => ({
  subscriptionId,
  cardToken: `local-card-token-${subscriptionId}`,
  payerEmail: "transport-only@example.invalid",
  planName: "Unit transport",
  amountCents: 100,
  deviceSessionId,
});

const expectIntercepted = async (request: Promise<unknown>) =>
  assert.rejects(request, (error: unknown) => error instanceof MercadoPagoAdapterError);

test("concurrent subscription operations have independent SDK device sessions and keys", async () => {
  const transport = captureTransport();
  try {
    const gateway = new MercadoPagoAdapter();
    await Promise.all([
      expectIntercepted(gateway.createSubscription(createInput("attempt-a", "session-A"))),
      expectIntercepted(gateway.createSubscription(createInput("attempt-b", "session-B"))),
      expectIntercepted(gateway.createSubscription(createInput("attempt-c"))),
      expectIntercepted(
        gateway.updateSubscriptionCard({
          gatewaySubscriptionId: "subscription-d",
          cardToken: "local-card-token-d",
          deviceSessionId: "session-D",
        }),
      ),
    ]);
    assert.equal(transport.requests.length, 4);
    for (const [id, session] of [
      ["attempt-a", "session-A"],
      ["attempt-b", "session-B"],
      ["attempt-c", null],
    ]) {
      const request = transport.requests.find((item) => item.body?.external_reference === id);
      assert.ok(request);
      assert.equal(request.method, "POST");
      assert.equal(request.headers.get("x-meli-session-id"), session);
      assert.equal(request.headers.get("x-idempotency-key"), `lectum-preapproval-${id}`);
      assert.equal(Object.hasOwn(request.body ?? {}, "deviceSessionId"), false);
    }
    const update = transport.requests.find((item) => item.url.endsWith("/subscription-d"));
    assert.ok(update);
    assert.equal(update.method, "PUT");
    assert.equal(update.headers.get("x-meli-session-id"), "session-D");
    assert.equal(
      update.headers.get("x-idempotency-key"),
      buildCardUpdateIdempotencyKey({
        gatewaySubscriptionId: "subscription-d",
        cardToken: "local-card-token-d",
      }),
    );
  } finally {
    transport.restore();
  }
});

test("session cannot leak to later cancel, reads, plans or card updates without a session", async () => {
  const transport = captureTransport();
  try {
    const gateway = new MercadoPagoAdapter();
    await expectIntercepted(gateway.createSubscription(createInput("initial", "session-initial")));
    await expectIntercepted(gateway.cancelSubscription({ gatewaySubscriptionId: "cancelled" }));
    await expectIntercepted(gateway.getSubscription("read-subscription"));
    await expectIntercepted(gateway.getSubscriptionPlan("read-plan"));
    await expectIntercepted(
      gateway.createSubscriptionPlan({ planName: "Unit transport", amountCents: 100 }),
    );
    await expectIntercepted(
      gateway.updateSubscriptionCard({ gatewaySubscriptionId: "update", cardToken: "local-token" }),
    );
    await expectIntercepted(gateway.createSubscription(createInput("invalid", "session\r\n")));
    assert.equal(transport.requests.length, 7);
    for (const request of transport.requests.slice(1)) {
      assert.equal(request.headers.get("x-meli-session-id"), null);
      assert.notEqual(request.headers.get("x-idempotency-key"), "lectum-preapproval-initial");
    }
  } finally {
    transport.restore();
  }
});

test("diagnostic invoice lookup is a bounded fixed-host GET without session or retry", async () => {
  const transport = captureTransport();
  try {
    const gateway = new MercadoPagoAdapter();
    await expectIntercepted(gateway.getAuthorizedPayment("local-invoice-123"));
    assert.equal(transport.requests.length, 1);
    const request = transport.requests[0];
    assert.equal(request.url, "https://api.mercadopago.com/authorized_payments/local-invoice-123");
    assert.equal(request.method, "GET");
    assert.equal(request.redirect, "error");
    assert.equal(request.body, undefined);
    assert.ok(request.signal);
    assert.equal(request.headers.get("x-meli-session-id"), null);
    assert.equal(request.headers.get("x-idempotency-key"), null);
    for (const id of ["../users/me", "abc\n", "https://example.invalid", ""]) {
      await expectIntercepted(gateway.getAuthorizedPayment(id));
    }
    assert.equal(transport.requests.length, 1);
  } finally {
    transport.restore();
  }
});
