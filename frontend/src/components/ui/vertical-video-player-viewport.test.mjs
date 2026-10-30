import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { VerticalVideoPlayerBottomOverlay } = await import(
  "./vertical-video-player-bottom-overlay.tsx"
);
const { observeExpandedVideoViewport } = await import(
  "./vertical-video-player-content-expansion.ts"
);
const { VerticalVideoPlayerShell } = await import("./vertical-video-player-shell.tsx");

const require = createRequire(import.meta.url);

test("expanded viewport tracks visible bounds, coalesces events and cleans up", () => {
  const originalWindow = globalThis.window;
  const windowEvents = new EventTarget();
  const visual = Object.assign(new EventTarget(), {
    offsetTop: 12,
    offsetLeft: 0,
    width: 390,
    height: 690,
  });
  let pending;
  let cleanup;
  let current = null;
  let scheduled = 0;
  let updates = 0;
  globalThis.window = Object.assign(windowEvents, {
    visualViewport: visual,
    innerWidth: 390,
    innerHeight: 844,
    requestAnimationFrame(callback) {
      pending = callback;
      return ++scheduled;
    },
    cancelAnimationFrame() {
      pending = undefined;
    },
  });
  const flush = () => {
    const callback = pending;
    pending = undefined;
    callback?.();
  };
  try {
    const setViewport = (update) => {
      current = update(current);
      updates++;
    };
    cleanup = observeExpandedVideoViewport(true, setViewport);
    assert.equal(current, null);
    flush();
    assert.deepEqual(current, { top: 12, left: 0, width: 390, height: 690 });
    const previous = current;
    visual.dispatchEvent(new Event("resize"));
    flush();
    assert.equal(current, previous, "unchanged dimensions retain state identity");
    Object.assign(visual, { offsetTop: 20, offsetLeft: 4, width: 844, height: 350 });
    visual.dispatchEvent(new Event("resize"));
    visual.dispatchEvent(new Event("scroll"));
    const before = updates;
    flush();
    assert.equal(updates, before + 1);
    assert.deepEqual(current, { top: 20, left: 4, width: 844, height: 350 });
    visual.height = 0;
    windowEvents.dispatchEvent(new Event("resize"));
    flush();
    assert.equal(current.height, 350, "transient empty viewport must not collapse the player");
    visual.dispatchEvent(new Event("resize"));
    cleanup();
    assert.equal(pending, undefined);
    const stoppedAt = scheduled;
    visual.dispatchEvent(new Event("scroll"));
    visual.dispatchEvent(new Event("resize"));
    windowEvents.dispatchEvent(new Event("resize"));
    assert.equal(scheduled, stoppedAt);
    assert.equal(observeExpandedVideoViewport(false, setViewport), undefined);
    assert.equal(scheduled, stoppedAt, "disabled observation must not schedule a frame");
    window.visualViewport = undefined;
    cleanup = observeExpandedVideoViewport(true, setViewport);
    flush();
    assert.deepEqual(current, { top: 0, left: 0, width: 390, height: 844 });
    cleanup();
  } finally {
    cleanup?.();
    globalThis.window = originalWindow;
  }
});

function markup(expanded, controlsVisible) {
  return renderToStaticMarkup(
    React.createElement(
      VerticalVideoPlayerShell,
      {
        isContentExpanded: expanded,
        style: { minHeight: "900px", maxHeight: "300px", width: "200px" },
      },
      React.createElement("video", {
        className: "h-full w-full object-contain",
        "data-test-video": true,
      }),
      React.createElement(
        VerticalVideoPlayerBottomOverlay,
        { controlsVisible },
        React.createElement(
          "button",
          { type: "button", style: { height: 44, width: "100%" } },
          "Fale com Ana",
        ),
      ),
    ),
  );
}

test("expanded shell overrides inline limits and isolates bottom navigation padding", () => {
  const expanded = markup(true, false);
  assert.match(expanded, /min-height:0/);
  assert.match(expanded, /height:100dvh/);
  assert.match(expanded, /background-color:var\(--lectum-media-background\)/);
  assert.match(
    expanded,
    /--lectum-bottom-fixed-padding:max\(1rem, calc\(env\(safe-area-inset-bottom/,
  );
  assert.match(expanded, /--lectum-video-safe-left:env\(safe-area-inset-left/);
  const inline = markup(false, false);
  assert.match(inline, /min-height:900px/);
  assert.match(inline, /max-height:300px/);
  assert.doesNotMatch(inline, /--lectum-video-safe-bottom:/);
  const player = readFileSync(new URL("./vertical-video-player.tsx", import.meta.url), "utf8");
  assert.match(player, /isContentExpanded && "object-contain"/);
});

test("expanded-only contact is absent inline and mounted in the expanded overlay", () => {
  for (const visible of [false, true]) {
    const html = renderToStaticMarkup(
      React.createElement(
        VerticalVideoPlayerBottomOverlay,
        { controlsVisible: false, visible },
        React.createElement("button", { type: "button" }, "Fale com Ana"),
      ),
    );
    if (visible) assert.match(html, /Fale com Ana/);
    else assert.equal(html, "");
  }
  const player = readFileSync(new URL("./vertical-video-player.tsx", import.meta.url), "utf8");
  assert.match(player, /bottomOverlayExpandedOnly = false/);
  assert.match(player, /visible=\{!bottomOverlayExpandedOnly \|\| isContentExpanded\}/);
});

test("profile presentation uses the existing contact identity and profile tracking only when expanded", () => {
  const profile = readFileSync(
    new URL("../../app/app/psychologist/[id]/components/presentation-video.tsx", import.meta.url),
    "utf8",
  );
  const fixed = readFileSync(
    new URL("../../app/app/psychologist/[id]/components/whatsapp-cta.tsx", import.meta.url),
    "utf8",
  );
  assert.match(profile, /!profile\.read_only && profile\.whatsapp_url/);
  assert.match(profile, /<CommunityWhatsAppCta\s+overVideo/);
  assert.match(profile, /videoLabelExpanded=\{contactExpanded\}/);
  assert.match(profile, /useVideoContactReveal\(/);
  assert.match(profile, /handleContactVideoReady\(video\)/);
  assert.match(profile, /bottomOverlayExpandedOnly/);
  assert.match(profile, /fullscreenVariant="content"/);
  assert.doesNotMatch(profile, /ContentVideoScope|ContentVideoHost|onContentClick=/);
  for (const contract of [
    /toPsychologistWhatsAppIdentity\(profile\)/,
    /pageKind: "psychologist_profile"/,
    /targetId: profile\.id/,
    /targetType: "psychologist"/,
  ]) {
    assert.match(profile, contract);
    assert.match(fixed, contract);
  }
});

test("CTA remains within visible mobile bounds with safe areas and controls", {
  skip:
    !process.env.PLAYWRIGHT_MODULE && "Set PLAYWRIGHT_MODULE to the installed Playwright module",
}, async () => {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
  const { compile } = require("tailwindcss");
  const html = markup(true, false) + markup(true, true);
  const candidates = [...html.matchAll(/class="([^"]+)"/g)].flatMap((match) => match[1].split(" "));
  const css = (
    await compile("@theme { --spacing: 0.25rem; --breakpoint-sm: 40rem; } @tailwind utilities;")
  ).build(candidates);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const size of [
      { width: 390, height: 844 },
      { width: 360, height: 740 },
      { width: 844, height: 390 },
    ]) {
      const page = await browser.newPage({ viewport: size });
      for (const controls of [false, true]) {
        // Desktop emulation cannot provide hardware insets; substitute only the env() values.
        const rendered = markup(true, controls)
          .replaceAll("env(safe-area-inset-bottom, 0px)", "34px")
          .replaceAll("env(safe-area-inset-left, 0px)", "24px")
          .replaceAll("env(safe-area-inset-right, 0px)", "24px");
        await page.setContent(
          `<style>html{font-size:15px;--lectum-bottom-fixed-padding:180px}body{margin:0}*{box-sizing:border-box}${css}</style>${rendered}`,
        );
        const bounds = await page.locator("[data-lectum-video-bottom-overlay]").boundingBox();
        assert.ok(bounds.x >= 24 && bounds.x + bounds.width <= size.width - 24);
        assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= size.height - 34);
        assert.equal(bounds.width, size.width - 48, "contact spans the entire safe video width");
        const expectedBottom = controls ? 34 + 11.25 + 67.5 : 34;
        assert.ok(Math.abs(size.height - bounds.y - bounds.height - expectedBottom) < 1);
        const root = await page.locator("[data-lectum-video-player-root]").boundingBox();
        assert.equal(root.height, size.height, "inline minHeight must not exceed viewport");
        await page.setViewportSize({ width: size.width, height: size.height - 100 });
        const smaller = await page.locator("[data-lectum-video-bottom-overlay]").boundingBox();
        assert.ok(smaller.y + smaller.height <= size.height - 134);
        await page.setViewportSize(size);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
