import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import express from "express";
import { getLimiter } from "@/external/limiter";
import { createApiCors, finishApiPreflight } from "./cors";

const allowedOrigin = "https://homolog.lectum.com.br";

const withTransport = async (verify: (base: string) => Promise<void>) => {
  const previous = process.env.WEB_URL;
  let server: Server | undefined;
  try {
    process.env.WEB_URL = allowedOrigin;
    // Real HTTP, CORS and limiter only. No product route, auth or provider is simulated.
    const app = express();
    app.use(createApiCors({ preflightContinue: true }));
    app.use(getLimiter({ max: 1, window: 1 }));
    app.use(finishApiPreflight);
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    await verify(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    if (previous === undefined) delete process.env.WEB_URL;
    else process.env.WEB_URL = previous;
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server!.close((error) => (error ? reject(error) : resolve())),
      );
    }
  }
};

const request = (base: string, origin: string, method = "POST") =>
  fetch(`${base}/api/private/psychologist/billing/stripe/checkout`, {
    method,
    headers: {
      Origin: origin,
      ...(method === "OPTIONS"
        ? {
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-device",
          }
        : {}),
    },
    signal: AbortSignal.timeout(5_000),
  });

test("allowed browser receives a readable safe 429 without changing the limiter", async () => {
  await withTransport(async (base) => {
    assert.equal((await request(base, allowedOrigin)).status, 404);
    const response = await request(base, allowedOrigin);
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("access-control-allow-origin"), allowedOrigin);
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
    assert.ok(response.headers.get("vary")?.includes("Origin"));
    assert.equal(response.headers.get("ratelimit-limit"), "1");
    assert.equal(response.headers.get("ratelimit-remaining"), "0");
    assert.ok(Number(response.headers.get("retry-after")) > 0);
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(body.status, 429);
    assert.equal(body.success, false);
    assert.equal(body.code, "too_many_requests");
  });
});

test("untrusted origins do not gain access to rate-limit responses", async () => {
  await withTransport(async (base) => {
    await request(base, allowedOrigin);
    for (const origin of [
      "https://untrusted.example",
      `${allowedOrigin}.untrusted.example`,
      "null",
    ]) {
      const response = await request(base, origin);
      assert.equal(response.status, 429);
      assert.equal(response.headers.get("access-control-allow-origin"), null);
    }
  });
});

test("preflight is still counted and limited rather than bypassing the request budget", async () => {
  await withTransport(async (base) => {
    const first = await request(base, allowedOrigin, "OPTIONS");
    assert.equal(first.status, 204);
    assert.equal(first.headers.get("ratelimit-remaining"), "0");
    assert.equal(first.headers.get("access-control-allow-origin"), allowedOrigin);
    const limited = await request(base, allowedOrigin, "OPTIONS");
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("access-control-allow-origin"), allowedOrigin);
    assert.equal((await request(base, allowedOrigin)).status, 429);
  });
});

test("server installs CORS before the limiter and ends preflight only afterwards", () => {
  const source = readFileSync(`${__dirname}/app.ts`, "utf8");
  const cors = source.indexOf("server.use(createApiCors({ preflightContinue: true }));");
  const limiter = source.indexOf("server.use(getLimiter({}));");
  const preflight = source.indexOf("server.use(finishApiPreflight);");
  assert.ok(cors >= 0 && limiter > cors && preflight > limiter);
  assert.ok(preflight < source.indexOf("server.use(routes);"));
});
