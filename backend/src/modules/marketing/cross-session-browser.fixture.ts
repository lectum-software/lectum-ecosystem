// Isolated test harness only: production browser controller and HTTP capture route,
// no production sessions, deployment, ad platform or external network access.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import express from "express";
import ts from "typescript";
import { createAttributionRouter } from "@/modules/api/public/marketing/attribution";
import type { MarketingConsentPolicy } from "./consent-policy";

export async function browserGuestReturn(policy: MarketingConsentPolicy, firstAt: Date) {
  const require = createRequire(path.resolve("package.json"));
  const { webkit } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
  const source = await readFile(
    path.resolve("../frontend/src/components/privacy/campaign-attribution.ts"),
    "utf8",
  );
  const javascript = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  let clock = firstAt;
  let requests = 0;
  const app = express();
  app.use(express.json({ limit: "8kb" }));
  app.get("/", (_req, res) =>
    res.type("html").send("<!doctype html><title>Isolated acquisition test</title>"),
  );
  app.get("/client.js", (_req, res) => res.type("js").send(javascript));
  app.use(
    "/api/public/marketing/attribution",
    (_req, _res, next) => {
      requests++;
      next();
    },
    createAttributionRouter(policy, () => clock),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await webkit.launch({ headless: true });
  const external: string[] = [];
  const init = async (page: { evaluate: (script: string) => Promise<unknown> }, enabled = true) => {
    await page.evaluate(`(async () => {
      const m = await import('/client.js');
      window.clock = ${clock.getTime()};
      window.choice = { version: ${JSON.stringify(policy.documentVersion)}, campaigns: true,
        savedAt: ${firstAt.getTime()}, expiresAt: ${firstAt.getTime() + 90 * 86_400_000} };
      const post = async (action, body) => {
        const response = await fetch('/api/public/marketing/attribution/' + action, {
          method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error('request_failed');
        const json = await response.json();
        window.lastResponseShape = {status: response.status, dataKeys: Object.keys(json.data || {}), enabled: json.data?.enabled, hasExpiry: Boolean(json.data?.expires_at)};
        return json.data;
      };
      window.client = new m.BrowserAttribution({ enabled: ${enabled}, version: window.choice.version,
        storage: () => localStorage, now: () => window.clock,
        newToken: () => [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2,'0')).join(''),
        transport: { capture: body => post('capture', body), revoke: token => post('revoke', {token}) }
      });
      window.campaigns = m.permittedBrowserCampaigns(location.search, ${JSON.stringify(policy.campaigns)});
    })()`);
  };
  try {
    let context = await browser.newContext();
    const protect = async (ctx: typeof context) => {
      await ctx.route(
        "**/*",
        async (route: {
          request: () => { url: () => string };
          abort: () => Promise<void>;
          continue: () => Promise<void>;
        }) => {
          if (!route.request().url().startsWith(`${origin}/`)) {
            external.push(route.request().url());
            return route.abort();
          }
          return route.continue();
        },
      );
    };
    await protect(context);
    let page = await context.newPage();
    await page.goto(`${origin}/?utm_source=meta&utm_campaign=campaign_a`);
    assert.ok(
      page.url().includes("utm_campaign=campaign_a"),
      `Test navigation lost query: ${page.url()}`,
    );
    await init(page, false);
    await page.evaluate("client.capture(choice, campaigns)");
    assert.equal(requests, 0, "Disabled build makes no capture requests");
    assert.equal(await page.evaluate("localStorage.length"), 0);
    await init(page);
    await page.evaluate("client.capture({...choice, campaigns:false}, campaigns)");
    assert.equal(requests, 0, "Refusal makes no capture requests and creates no identity");
    await page.evaluate("window.clock += 1; choice.savedAt = window.clock");
    await page.evaluate("client.capture(choice, campaigns)");
    const token = (await page.evaluate("client.tokenForTransfer(choice)")) as string;
    assert.match(
      token,
      /^[a-f0-9]{64}$/,
      JSON.stringify(
        await page.evaluate(
          "({response:window.lastResponseShape, search:location.search, campaigns: window.campaigns, stored:localStorage.length})",
        ),
      ),
    );
    const state = await context.storageState();
    await context.close();
    clock = new Date(firstAt.getTime() + 7 * 86_400_000);
    context = await browser.newContext({ storageState: state });
    await protect(context);
    page = await context.newPage();
    await page.goto(origin);
    await init(page);
    await page.evaluate("client.capture(choice, campaigns)");
    assert.equal(
      await page.evaluate("client.tokenForTransfer(choice)"),
      token,
      "Same permitted identity in a new browser session on day 7",
    );
    await page.goto(`${origin}/?utm_source=meta&utm_campaign=campaign_b`);
    await init(page);
    await page.evaluate("client.capture(choice, campaigns)");
    assert.equal(await page.evaluate("client.tokenForTransfer(choice)"), token);
    // A separate context exercises expiration without modifying the valid day-7 record.
    const expired = await browser.newContext({ storageState: state });
    await protect(expired);
    const expiredPage = await expired.newPage();
    await expiredPage.goto(origin);
    await init(expiredPage);
    await expiredPage.evaluate(`window.clock = ${firstAt.getTime() + 30 * 86_400_000}`);
    assert.equal(await expiredPage.evaluate("client.tokenForTransfer(choice)"), null);
    assert.equal(await expiredPage.evaluate("localStorage.length"), 0);
    await expired.close();
    assert.deepEqual(external, []);
    return { token, registeredAt: clock };
  } finally {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}
