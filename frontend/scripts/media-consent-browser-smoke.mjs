import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const domRequire = createRequire(require.resolve("react-dom/client"));
const prod = (name, file, resolver = require) =>
  readFileSync(path.join(path.dirname(resolver.resolve(name)), "cjs", file), "utf8");
const source = (file) =>
  ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
const code = (fn) => `(${fn.toString()})(require,exports);`;
const modules = {
  react: prod("react", "react.production.js"),
  "react-dom": prod("react-dom", "react-dom.production.js"),
  "react-dom/client": prod("react-dom", "react-dom-client.production.js"),
  scheduler: prod("scheduler", "scheduler.production.js", domRequire),
  "@/components/privacy/internal-measurement": source(
    "../src/components/privacy/internal-measurement.ts",
  ),
  "@/hooks/cookies/token": "exports.getToken=()=>null;",
  "@/store": "exports.store={getState:()=>({})};",
  "./use-choice":
    "exports.localCampaignConsentScope=()=>window.allowed ? 'guest:'+window.revision : null;",
  "@/components/privacy/measurement-boundary": code((require, exports) => {
    exports.useMeasurementScope = () =>
      require("react").useSyncExternalStore(
        (cb) => {
          window.addEventListener("consent", cb);
          return () => window.removeEventListener("consent", cb);
        },
        () => (window.allowed ? `guest:${window.revision}` : null),
        () => null,
      );
  }),
  "@/components/analytics/attention": "exports.documentHasUserAttention=()=>true;",
  "@/components/analytics/storage": code((_require, exports) => {
    exports.getOrCreateAnalyticsIdentity = () => {
      window.identityCalls++;
      return { visitorId: "test-visitor", sessionId: "test-session" };
    };
  }),
  "@/utils/analytics-path": "exports.getCurrentAnalyticsPath=()=>'/';",
  "@/api/req/analytics": code((_require, exports) => {
    exports.trackContentVideoWatch = exports.trackContentAttention = async (p) => {
      window.sent.push(p);
    };
    exports.sendContentVideoWatchBeacon = exports.sendContentAttentionBeacon = (p) =>
      window.sent.push(p);
  }),
  video: source("../src/components/analytics/content-video-watch-tracker.ts"),
  attention: source("../src/components/analytics/content-attention-tracker.ts"),
};
function boot(modules) {
  window.allowed = false;
  window.revision = 0;
  window.identityCalls = 0;
  window.sent = [];
  const cache = {};
  function require(n) {
    if (cache[n]) return cache[n].exports;
    const m = { exports: {} };
    cache[n] = m;
    new Function("require", "module", "exports", "process", modules[n])(require, m, m.exports, {
      env: { NODE_ENV: "production" },
    });
    return m.exports;
  }
  const React = require("react");
  function App() {
    const video = require("video").useContentVideoWatchTracking({
      targetId: "local-test",
      targetType: "post",
    });
    const attention = require("attention").useContentAttentionTracking({
      targetId: "local-test",
      targetType: "post",
    });
    return React.createElement(
      "div",
      { ref: attention, style: { height: 300 } },
      React.createElement("video", { ref: video }),
    );
  }
  require("react-dom/client")
    .createRoot(document.getElementById("root"))
    .render(React.createElement(App));
  window.setConsent = (value) =>
    require("react-dom").flushSync(() => {
      window.allowed = value;
      if (value) window.revision++;
      window.dispatchEvent(new Event("consent"));
    });
}
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage();
  await page.route("**/*", (r) =>
    r.fulfill({ contentType: "text/html", body: '<div id="root"></div>' }),
  );
  await page.goto("http://localhost:3199");
  await page.addScriptTag({ content: `(${boot.toString()})(${JSON.stringify(modules)});` });
  await page.locator("video").waitFor({ state: "attached" });
  const tick = (position) =>
    page.evaluate((position) => {
      const v = document.querySelector("video");
      Object.defineProperty(v, "paused", { configurable: true, value: false });
      Object.defineProperty(v, "duration", { configurable: true, value: 120 });
      v.currentTime = position;
      v.dispatchEvent(new Event("timeupdate"));
      v.dispatchEvent(new Event("pause"));
    }, position);
  await tick(30);
  assert.equal(await page.evaluate(() => window.identityCalls), 0);
  assert.equal(await page.evaluate(() => window.sent.length), 0);
  await page.evaluate(() => window.setConsent(true));
  await page.waitForTimeout(100);
  await tick(31);
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  let sent = await page.evaluate(() => window.sent);
  assert.ok(
    sent.some((x) => x.watched_seconds === 1),
    "Only playback after consent counted",
  );
  assert.ok(
    sent.some((x) => x.attention_seconds > 0),
    "Attention starts after consent",
  );
  await page.evaluate(() => window.setConsent(false));
  await page.waitForTimeout(100);
  const count = await page.evaluate(() => window.sent.length);
  await tick(80);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("pagehide"));
    window.dispatchEvent(new Event("blur"));
  });
  assert.equal(
    await page.evaluate(() => window.sent.length),
    count,
    "No cleanup or keepalive after refusal",
  );
  await page.evaluate(() => window.setConsent(true));
  await page.waitForTimeout(100);
  await tick(81);
  sent = await page.evaluate(() => window.sent);
  assert.equal(
    sent.filter((x) => x.watched_seconds).at(-1).watched_seconds,
    1,
    "Denied interval is not recovered",
  );
  const beforeRenewal = sent.length;
  await page.evaluate(() => window.setConsent(true));
  assert.equal(
    await page.evaluate(() => window.sent.length),
    beforeRenewal,
    "Old scope cannot flush during renewal",
  );
  await tick(82);
  sent = await page.evaluate(() => window.sent);
  assert.equal(
    sent.filter((x) => x.watched_seconds).at(-1).watched_seconds,
    1,
    "Renewal starts a new interval",
  );
  await page.evaluate(() => window.setConsent(false));
  console.log(
    "Media consent: identifiers, acceptance, refusal, keepalive, reacceptance and renewal passed.",
  );
} finally {
  await browser.close();
}
