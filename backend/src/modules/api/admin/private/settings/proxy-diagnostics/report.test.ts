import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import express from "express";
import adminAuth from "@/modules/api/admin/middlewares/_auth";
import routes from "./index";
import type { proxyDiagnosticReport } from "./report";

async function start(trust: number, protectedRoute = false) {
  const app = express();
  app.set("trust proxy", trust);
  if (protectedRoute) app.use(adminAuth);
  app.use(routes);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/` };
}

for (const trust of [1, 2]) {
  test(`real HTTP reports proxy selection with trust=${trust} without leaking headers`, async () => {
    const { server, url } = await start(trust);
    try {
      const response = await fetch(url, {
        headers: {
          "x-forwarded-for": "198.51.100.7, 173.245.48.1",
          "cf-connecting-ip": "198.51.100.7",
          "user-agent": "private-browser-value",
          cookie: "private-cookie-value",
        },
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      const text = await response.text();
      for (const secret of [
        "198.51.100.7",
        "173.245.48.1",
        "private-browser-value",
        "private-cookie-value",
      ]) {
        assert.equal(text.includes(secret), false);
      }
      const report = JSON.parse(text);
      assert.equal(report.forwarded_hops, 2);
      assert.equal(report.resolved_matches_cloudflare_header, trust === 2);
      assert.equal(report.resolved_matches_nearest_forwarded, trust === 1);
      assert.equal(report.verification, "requires_controlled_external_probe");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
}

test("invalid and absent forwarding headers do not count as a verified match", async () => {
  const { server, url } = await start(1);
  try {
    const malformed = await fetch(url, {
      headers: {
        "x-forwarded-for": "invalid, also-invalid",
        "cf-connecting-ip": "invalid",
      },
    });
    const report = (await malformed.json()) as ReturnType<typeof proxyDiagnosticReport>;
    assert.equal(report.forwarded_chain_valid, false);
    assert.equal(report.cloudflare_header_valid, false);
    assert.equal(report.resolved_matches_cloudflare_header, null);
    const scoped = await fetch(url, { headers: { "cf-connecting-ip": "fe80::1%eth0" } });
    assert.equal(scoped.status, 200);
    assert.equal(
      ((await scoped.json()) as ReturnType<typeof proxyDiagnosticReport>).cloudflare_header_valid,
      false,
    );
    const absent = (await (await fetch(url)).json()) as ReturnType<typeof proxyDiagnosticReport>;
    assert.equal(absent.forwarded_hops, 0);
    assert.equal(absent.resolved_matches_cloudflare_header, null);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("existing admin middleware denies unauthenticated diagnostics", async () => {
  const { server, url } = await start(1, true);
  try {
    const response = await fetch(url);
    assert.equal(response.status, 401);
    assert.equal((await response.text()).includes("forwarded_hops"), false);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
