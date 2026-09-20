// Real-browser smoke, no fixtures or request interception. Supply an existing
// playwright-core module path and a running Lectum origin with real public videos.
// node scripts/video-focus-smoke.mjs <playwright-core-path> <origin> <expected-version>
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const [modulePath, origin, expectedVersion] = process.argv.slice(2);
if (!modulePath || !origin || !expectedVersion)
  throw new Error("Supply module, origin and version");
const { chromium } = createRequire(import.meta.url)(modulePath);
const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--window-position=0,0"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const release = await (await context.request.get(`${origin}/version`)).json();
  assert.equal(release.version, expectedVersion, "test the intended deployed artifact");
  console.log(`Testing frontend ${release.version}`);
  const cdp = await context.newCDPSession(page);
  await page.goto(`${origin}/psicologos`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.bringToFront();
  const state = () =>
    page.evaluate(() => ({
      focused: document.hasFocus(),
      videos: Array.from(document.querySelectorAll("video"), (v) => ({
        paused: v.paused,
        muted: v.muted,
        time: v.currentTime,
        index: v.dataset.psychologistsSlideIndex,
      })),
    }));
  const waitFor = async (predicate) => {
    for (let i = 0; i < 60; i++) {
      const current = await state();
      if (predicate(current)) return current;
      await page.waitForTimeout(500);
    }
    throw new Error("Real media did not reach the required state");
  };
  const initial = await waitFor((s) => s.videos.some((v) => !v.paused && v.time > 0));
  assert(
    initial.videos.every((v) => v.muted),
    "fresh browser starts muted",
  );
  console.log("PASS initial autoplay muted (real stream, 390px)");

  // A generic tap must not grant sound.
  const area = page.getByRole("button", { name: /^Ocultar interface de/ }).first();
  await area.click({ position: { x: 25, y: 180 } });
  await page.waitForTimeout(600);
  assert((await state()).videos.every((v) => v.muted));
  const reveal = page.getByRole("button", { name: /^Mostrar interface do/ }).first();
  if (await reveal.isVisible()) await reveal.click({ position: { x: 25, y: 180 } });
  await page.waitForTimeout(600);
  await page
    .getByRole("button", { name: /^Ativar som do/ })
    .first()
    .click();
  await waitFor((s) => s.videos.some((v) => !v.paused && !v.muted));
  console.log("PASS generic tap stays muted; volume control enables sound");

  await page.locator('section[data-psychologists-slide-index="1"]').scrollIntoViewIfNeeded();
  await waitFor((s) =>
    s.videos.some((v) => v.index === "1" && !v.paused && !v.muted && v.time > 0),
  );
  console.log("PASS next video inherits explicit sound choice");

  const other = await context.newPage();
  const otherCdp = await context.newCDPSession(other);
  await other.goto("about:blank");
  // Disable automation focus emulation before testing actual lifecycle boundaries.
  await otherCdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await other.bringToFront();
  await page.waitForTimeout(1_000);
  const hidden = await state();
  assert(!hidden.focused);
  assert(hidden.videos.every((v) => v.paused));
  await page.waitForTimeout(2_000);
  const after = await state();
  assert(after.videos.every((v, i) => v.paused && Math.abs(v.time - hidden.videos[i].time) < 0.05));
  // Real delayed play request: the guard must reject playback in background.
  await page.evaluate(() => {
    const video = document.querySelector('video[data-psychologists-slide-index="1"]');
    void video?.play().catch(() => {});
  });
  await page.waitForTimeout(700);
  assert((await state()).videos.every((v) => v.paused));
  console.log("PASS tab switch freezes time; late play is paused");

  await page.bringToFront();
  await waitFor((s) => s.videos.some((v) => !v.paused && !v.muted));
  const { windowId } = await cdp.send("Browser.getWindowForTarget");
  await cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "minimized" } });
  await page.waitForTimeout(1_000);
  const minimized = await state();
  assert(!minimized.focused);
  assert(minimized.videos.every((v) => v.paused));
  await page.waitForTimeout(2_000);
  assert(
    (await state()).videos.every(
      (v, i) => v.paused && Math.abs(v.time - minimized.videos[i].time) < 0.05,
    ),
  );
  console.log("PASS minimized browser freezes time");
  await cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal" } });
  await page.bringToFront();
  await waitFor((s) => s.videos.some((v) => !v.paused));
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitFor((s) => s.videos.some((v) => !v.paused && !v.muted));
  console.log("PASS explicit sound survives reload");
} finally {
  await browser.close();
}
