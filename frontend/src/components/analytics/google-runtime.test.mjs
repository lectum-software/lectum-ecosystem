import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as policy from "./google-policy.ts";

function browser({ scope = "grant", hostname = "www.lectum.com.br", enabled = "true" } = {}) {
  let consent = scope;
  const scripts = [];
  const cookies = [];
  const host = {
    location: {
      hostname,
      href:
        "https://" +
        hostname +
        "/comunidades/private-topic?email=private@example.com&gclid=Abc_123",
    },
    setTimeout,
    clearTimeout,
  };
  const exports = {};
  const doc = {
    createElement: () => ({ remove() {} }),
    head: { appendChild: (script) => scripts.push(script) },
  };
  Object.defineProperty(doc, "cookie", {
    get: () => "_ga=old; _gcl_au=old; session=keep",
    set: (v) => cookies.push(v),
  });
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL("./google-runtime.ts", import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      require: (name) =>
        name === "./google-choice" ? { googleConsentScope: () => consent } : policy,
      window: host,
      document: doc,
      URL,
      Date,
      Set,
      process: {
        env: {
          NEXT_PUBLIC_GOOGLE_ANALYTICS_ENABLED: enabled,
          NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: "G-Q6FX22KLND",
        },
      },
    },
  );
  return {
    api: exports,
    host,
    scripts,
    cookies,
    setConsent: (v) => (consent = v),
    commands: () => (host.dataLayer || []).map((v) => Array.from(v)),
    load: () => scripts.at(-1).onload(),
  };
}
test("disabled, preview and missing consent do not load Google or queue events", async () => {
  for (const options of [
    { scope: null },
    { enabled: "false" },
    { hostname: "homolog.lectum.com.br" },
    { hostname: "localhost" },
  ]) {
    const f = browser(options);
    await f.api.trackGoogleEvent("forum_post", f.api.googleActionScope(), "local-id");
    assert.equal(f.scripts.length, 0);
    assert.deepEqual(f.commands(), []);
  }
});
test("revocation while downloading cancels conversion and config; consent change cannot replay it", async () => {
  const f = browser();
  const pending = f.api.trackGoogleEvent("forum_post", "grant", "private-id");
  f.setConsent(null);
  f.api.stopGoogleMeasurement();
  f.load();
  await pending;
  assert.equal(f.commands().filter((v) => v[0] === "event" || v[0] === "config").length, 0);
  f.setConsent("new-grant");
  await f.api.trackGoogleEvent("forum_post", "grant", "private-id");
  assert.equal(f.commands().filter((v) => v[0] === "event").length, 0);
});
test("confirmed actions send once with no source content, IDs or private URLs", async () => {
  const f = browser();
  const pending = f.api.trackGoogleEvent("forum_post", "grant", "private-id");
  f.load();
  await pending;
  await f.api.trackGoogleEvent("forum_post", "grant", "private-id");
  const events = f.commands().filter((v) => v[0] === "event");
  assert.equal(events.length, 1);
  assert.equal(events[0][1], "forum_post");
  assert.doesNotMatch(JSON.stringify(f.commands()), /private-topic|private-id|private@example/);
  assert.equal(f.commands().find((v) => v[0] === "config")[2].send_page_view, false);
  assert.match(f.commands().find((v) => v[0] === "config")[2].page_location, /gclid=Abc_123/);
  f.setConsent(null);
  f.api.stopGoogleMeasurement();
  assert.equal(f.host["ga-disable-G-Q6FX22KLND"], true);
  assert.ok(f.cookies.some((v) => v.startsWith("_ga=")));
  assert.ok(!f.cookies.some((v) => v.startsWith("session=")));
  await f.api.trackGoogleEvent("whatsapp_click", "grant");
  assert.equal(f.commands().filter((v) => v[0] === "event").length, 1);
});
test("broken SDK fails closed without throwing into the product", async () => {
  const f = browser();
  const pending = f.api.trackGoogleEvent("whatsapp_click", "grant");
  f.scripts[0].onerror();
  assert.equal(await pending, false);
  assert.equal(f.commands().filter((v) => v[0] === "event").length, 0);
});
test("old Meta grants, malformed, expired and future choices never authorize Google", () => {
  const now = Date.now();
  for (const choice of [
    null,
    {},
    { campaigns: true },
    { version: 1, allowed: true, savedAt: now + 1, expiresAt: now + 1000 },
    { version: 1, allowed: true, savedAt: now - 100, expiresAt: now - 1 },
  ]) {
    assert.equal(policy.parseGoogleChoice(JSON.stringify(choice), now), null);
  }
  assert.equal(
    policy.parseGoogleChoice(
      JSON.stringify({ version: 1, allowed: true, savedAt: now, expiresAt: now + 1000 }),
      now,
    )?.allowed,
    true,
  );
  assert.equal(
    policy.googlePageLocation("https://www.lectum.com.br/private/id?q=sensitive&gclid=ABC_123"),
    "https://www.lectum.com.br/?gclid=ABC_123",
  );
  assert.equal(policy.googleMeasurementId("GTM-123456"), null);
  assert.equal(policy.googleEventParams("unknown"), null);
  assert.deepEqual(policy.googleEventParams("sign_up", "email@example.com"), {});
});

test("a newer consent remains active when an old async action finishes", async () => {
  const f = browser();
  const old = f.api.trackGoogleEvent("forum_post", "grant", "old");
  f.setConsent("new-grant");
  const current = f.api.trackGoogleEvent("whatsapp_click", "new-grant");
  f.load();
  await Promise.all([old, current]);
  assert.equal(f.host["ga-disable-G-Q6FX22KLND"], false);
  assert.equal(
    f
      .commands()
      .filter((v) => v[0] === "event")
      .map((v) => v[1])
      .join(","),
    "whatsapp_click",
  );
});

test("subscription confirmation rejects historical, invalid and revoked proof and consumes a valid receipt once", async () => {
  const storage = new Map();
  let scope = "grant";
  const events = [];
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL("./google-billing.ts", import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      Date,
      require: (name) =>
        name === "./google-runtime"
          ? {
              googleActionScope: () => scope,
              trackGoogleEvent: async (...args) => {
                events.push(args);
                return true;
              },
            }
          : {
              getBrowserStorage: () => storage,
              readStorageItem: (s, k) => s.get(k),
              writeStorageItem: (s, k, v) => {
                s.set(k, v);
                return true;
              },
              removeStorageItem: (s, k) => s.delete(k),
            },
    },
  );
  exports.rememberGoogleCheckout("operation-123456789", scope);
  const pending = exports.pendingGoogleCheckout();
  for (const paid_at of [
    "invalid",
    new Date(pending.startedAt - 1000).toISOString(),
    new Date(Date.now() + 60000).toISOString(),
  ]) {
    await exports.sendGoogleSubscription({ event_id: "receipt-123456789", paid_at }, pending);
  }
  assert.equal(events.length, 0);
  scope = null;
  await exports.sendGoogleSubscription(
    { event_id: "receipt-123456789", paid_at: new Date(pending.startedAt).toISOString() },
    pending,
  );
  assert.equal(events.length, 0);
  scope = "grant";
  const proof = {
    event_id: "receipt-123456789",
    paid_at: new Date(pending.startedAt).toISOString(),
  };
  await exports.sendGoogleSubscription(proof, pending);
  await exports.sendGoogleSubscription(proof, pending);
  assert.equal(events.length, 1);
  assert.equal(exports.pendingGoogleCheckout(), null);
});
