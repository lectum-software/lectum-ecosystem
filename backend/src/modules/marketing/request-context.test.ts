import assert from "node:assert/strict";
import { once } from "node:events";
import { get } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import express from "express";
import { buildMetaCapiPayload } from "./meta-capi";
import { marketingRequestContext, readMarketingRequestContext } from "./request-context";

test("HTTP context isolates concurrent browsers, ignores forwarded IP without verified proxy, and never reuses later visits", async () => {
  const previous = process.env.META_CLIENT_IP_VERIFIED;
  process.env.META_CLIENT_IP_VERIFIED = "false";
  const app = express();
  app.set("trust proxy", false);
  app.use(marketingRequestContext);
  app.get("/capture", async (_req, res) => {
    const time = new Date();
    await new Promise((resolve) => setTimeout(resolve, 15));
    res.json({
      current: readMarketingRequestContext(time),
      old: readMarketingRequestContext(new Date(time.getTime() - 10000)),
    });
  });
  app.get("/webhook", (_req, res) => res.json(readMarketingRequestContext(new Date())));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as AddressInfo).port;
  const request = (agent: string, path = "/capture") =>
    new Promise<{
      current: { client_user_agent?: string; client_ip_address?: string };
      old: object;
    }>((resolve, reject) => {
      get(
        {
          host: "127.0.0.1",
          port,
          path,
          headers: { "user-agent": agent, "x-forwarded-for": "1.2.3.4" },
        },
        (response) => {
          let body = "";
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () => resolve(JSON.parse(body)));
        },
      ).on("error", reject);
    });
  try {
    const results = await Promise.all([request("Browser-A"), request("Browser-B")]);
    assert.deepEqual(
      results.map((row) => row.current),
      [{ client_user_agent: "Browser-A" }, { client_user_agent: "Browser-B" }],
    );
    assert.deepEqual(
      results.map((row) => row.old),
      [{}, {}],
    );
    assert.deepEqual(await request("Payment-Service", "/webhook"), {});
    process.env.META_CLIENT_IP_VERIFIED = "true";
    const direct = await request("Browser-C");
    assert.equal(direct.current.client_ip_address, "127.0.0.1");
    app.set("trust proxy", true);
    assert.equal((await request("Browser-D")).current.client_ip_address, undefined);
    assert.deepEqual(readMarketingRequestContext(new Date()), {});
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (previous === undefined) delete process.env.META_CLIENT_IP_VERIFIED;
    else process.env.META_CLIENT_IP_VERIFIED = previous;
  }
});

test("serializer allows only bounded network context, keeps personal contact data excluded", () => {
  const now = 1795287600;
  const url = "https://example.test/signup";
  const input = {
    conversion: "professional_registration",
    eventId: "a".repeat(64),
    occurredAt: now,
    sourceUrl: url,
    fbp: "fb.1.1795287600000.123456",
    clientUserAgent: "Mozilla/5.0",
    clientIpAddress: "2001:db8::1",
  };
  const payload = buildMetaCapiPayload(input, [url], now);
  assert.deepEqual(payload?.data[0].user_data, {
    fbp: input.fbp,
    client_user_agent: input.clientUserAgent,
    client_ip_address: input.clientIpAddress,
  });
  for (const extra of [
    { clientUserAgent: "x\r\nsecret" },
    { clientUserAgent: "x".repeat(1025) },
    { clientIpAddress: "1.2.3.4, 5.6.7.8" },
    { email: "x@example.test" },
    { name: "Example" },
  ])
    assert.equal(buildMetaCapiPayload({ ...input, ...extra }, [url], now), null);
});
