import assert from "node:assert/strict";
import test from "node:test";
import { createWebhookRouter } from "./worker.mjs";

const timestamp = 1_789_867_200;
const now = timestamp * 1000;
const secret = "test-stream-webhook-secret";
const payload = new TextEncoder().encode('{"uid":"video-1","readyToStream":true}');

const hmacHeader = async (body = payload, time = timestamp) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const prefix = new TextEncoder().encode(`${time}.`);
  const source = new Uint8Array(prefix.length + body.length);
  source.set(prefix);
  source.set(body, prefix.length);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, source));
  return `time=${time},sig1=${[...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

const environment = (overrides = {}) => ({
  STREAM_WEBHOOK_SECRET: secret,
  HOMOLOG_WEBHOOK_URL: "https://homolog-api.lectum.com.br/api/public/video-stream/webhook",
  PRODUCTION_WEBHOOK_URL: "https://api.lectum.com.br/api/public/video-stream/webhook",
  ...overrides,
});

const request = async ({ body = payload, signature, method = "POST" } = {}) => {
  const resolvedSignature = signature ?? (await hmacHeader(body));
  return new Request("https://stream-webhook.lectum.com.br/cloudflare-stream", {
    method,
    headers: { "webhook-signature": resolvedSignature, "content-type": "application/json" },
    body: method === "POST" ? body : undefined,
  });
};

test("valida assinatura e encaminha os mesmos bytes para homolog e producao", async () => {
  const deliveries = [];
  const router = createWebhookRouter({
    now: () => now,
    fetchImpl: async (url, options) => {
      deliveries.push({
        body: new Uint8Array(options.body),
        signature: options.headers["webhook-signature"],
        url,
      });
      return new Response(null, { status: 204 });
    },
  });

  const signature = await hmacHeader();
  const result = await router.fetch(await request({ signature }), environment());

  assert.equal(result.status, 204);
  assert.deepEqual(deliveries.map((delivery) => delivery.url), [
    "https://homolog-api.lectum.com.br/api/public/video-stream/webhook",
    "https://api.lectum.com.br/api/public/video-stream/webhook",
  ]);
  assert.ok(deliveries.every((delivery) => delivery.signature === signature));
  assert.ok(deliveries.every((delivery) => Buffer.from(delivery.body).equals(Buffer.from(payload))));
});

test("produçao vazia mantem apenas o encaminhamento de homolog", async () => {
  const deliveries = [];
  const router = createWebhookRouter({
    now: () => now,
    fetchImpl: async (url) => {
      deliveries.push(url);
      return new Response(null, { status: 204 });
    },
  });

  const result = await router.fetch(await request(), environment({ PRODUCTION_WEBHOOK_URL: "" }));

  assert.equal(result.status, 204);
  assert.deepEqual(deliveries, ["https://homolog-api.lectum.com.br/api/public/video-stream/webhook"]);
});

test("recusa assinatura invalida ou expirada sem encaminhar", async () => {
  let called = false;
  const router = createWebhookRouter({
    now: () => now,
    fetchImpl: async () => {
      called = true;
      return new Response(null, { status: 204 });
    },
  });

  const invalid = await router.fetch(
    await request({ signature: `time=${timestamp},sig1=${"0".repeat(64)}` }),
    environment(),
  );
  const expired = await router.fetch(
    await request({ signature: await hmacHeader(payload, timestamp - 301) }),
    environment(),
  );

  assert.equal(invalid.status, 401);
  assert.equal(expired.status, 401);
  assert.equal(called, false);
});

test("falha fechada para configuracao fora da allowlist e para destino sem sucesso", async () => {
  let called = false;
  const router = createWebhookRouter({
    now: () => now,
    fetchImpl: async () => {
      called = true;
      return new Response(null, { status: 500 });
    },
  });

  const invalidConfiguration = await router.fetch(
    await request(),
    environment({ PRODUCTION_WEBHOOK_URL: "https://example.com/webhook" }),
  );
  const rejectedTarget = await router.fetch(await request(), environment());

  assert.equal(invalidConfiguration.status, 503);
  assert.equal(rejectedTarget.status, 502);
  assert.equal(called, true);
});

test("recusa metodos diferentes de POST", async () => {
  const router = createWebhookRouter({ now: () => now });
  const result = await router.fetch(await request({ method: "GET" }), environment());

  assert.equal(result.status, 405);
  assert.equal(result.headers.get("allow"), "POST");
});
