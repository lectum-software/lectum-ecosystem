import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { afterEach, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";

const { observeVideoContact } = await import("./use-video-contact-reveal.ts");

test("video contact initially shows its full action with an unfilled background", async () => {
  const imageUrl = import.meta.resolve("next/image.js");
  const bridge = `data:text/javascript,${encodeURIComponent(`import Image from ${JSON.stringify(imageUrl)}; export default Image.default ?? Image;`)}`;
  registerHooks({
    resolve(s, c, next) {
      return next(
        s === "next/image" ? bridge : ["next/link", "next/navigation"].includes(s) ? `${s}.js` : s,
        c,
      );
    },
  });
  const { CommunityWhatsAppCta } = await import("./community-whatsapp-cta.tsx");
  const { renderRelations } = await import("./community-relations-test-renderer.mjs");
  const html = renderRelations({
    children: createElement(CommunityWhatsAppCta, {
      overVideo: true,
      videoLabelExpanded: false,
      psychologist: { id: "psi", name: "Ana", whatsappUrl: "https://wa.me/15555550100" },
    }),
  });
  assert.match(html, /aria-label="Fale com Ana pelo WhatsApp"/);
  assert.match(html, /data-contact-expanded="false"/);
  assert.match(html, />Fale com Ana</);
  assert.match(html, /bg-media-background\/10/);
  assert.match(html, /origin-left bg-whatsapp-contact/);
  assert.match(html, /scale-x-0/);
  assert.match(html, /lucide-chevron-right/);
  assert.doesNotMatch(html, /max-w-0|opacity-0|rounded-full/);
  assert.doesNotMatch(html, /disabled=""/);
});

test("video bar fills left to right without shifting content and honors reduced motion", {
  skip: !process.env.PLAYWRIGHT_MODULE && "Set PLAYWRIGHT_MODULE to run browser coverage",
}, async () => {
  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
  const { compile } = require("tailwindcss");
  const screenshotDirectory = new URL("../../../../.tmp/video-cta-qa/", import.meta.url);
  mkdirSync(screenshotDirectory, { recursive: true });
  const screenshotPath = (state, width) =>
    fileURLToPath(new URL(`${state}-${width}.png`, screenshotDirectory));
  const { CommunityWhatsAppCta } = await import("./community-whatsapp-cta.tsx");
  const { VerticalVideoPlayerBottomOverlay } = await import(
    "../ui/vertical-video-player-bottom-overlay.tsx"
  );
  const { renderRelations } = await import("./community-relations-test-renderer.mjs");
  const render = (expanded) =>
    renderRelations({
      children: createElement(
        VerticalVideoPlayerBottomOverlay,
        { controlsVisible: false },
        createElement(CommunityWhatsAppCta, {
          overVideo: true,
          videoLabelExpanded: expanded,
          psychologist: { id: "psi", name: "Ana", whatsappUrl: "https://wa.me/15555550100" },
        }),
      ),
    });
  const initial = render(false);
  const candidates = [...(initial + render(true)).matchAll(/class="([^"]+)"/g)].flatMap((match) =>
    match[1].split(" "),
  );
  const tokens = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const theme = ["media-background", "media-foreground", "whatsapp-contact"]
    .map((name) => {
      const value = tokens.match(new RegExp(`--lectum-${name}:\\s*([^;]+);`))[1];
      return `--color-${name}: ${value};`;
    })
    .join(" ");
  const css = (await compile(`@theme { --spacing: 0.25rem; ${theme} } @tailwind utilities;`)).build(
    candidates,
  );
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of [320, 390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.setContent(`<style>
        body{margin:0}*{box-sizing:border-box}button{font:inherit;border:0}
        #player{position:relative;width:100%;height:600px;background:var(--color-media-background)}
        ${css}</style><div id="player">${initial}</div>`);
      const button = page.locator("[data-community-video-contact]");
      const fill = button.locator("span").first();
      const label = button.locator("span").last();
      const colors = await page.evaluate(() => {
        const probe = document.createElement("span");
        probe.style.color = "var(--color-media-foreground)";
        probe.style.background =
          "color-mix(in oklab, var(--color-media-background) 10%, transparent)";
        document.body.append(probe);
        const foreground = getComputedStyle(probe).color;
        const background = getComputedStyle(probe).backgroundColor;
        probe.style.background = "var(--color-whatsapp-contact)";
        const green = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return { foreground, background, green };
      });
      const before = await label.boundingBox();
      await button.screenshot({ path: screenshotPath("initial", width) });
      assert.equal((await button.boundingBox()).width, width);
      assert.equal((await button.boundingBox()).height, 48);
      assert.equal(await button.evaluate((el) => getComputedStyle(el).color), colors.foreground);
      assert.equal(
        await button.evaluate((el) => getComputedStyle(el).backgroundColor),
        colors.background,
      );
      assert.equal(await label.evaluate((el) => getComputedStyle(el).fontWeight), "400");
      assert.equal(await fill.evaluate((el) => getComputedStyle(el).scale), "0 1");
      const middle = await fill.evaluate((el) => {
        el.classList.replace("scale-x-0", "scale-x-100");
        getComputedStyle(el).getPropertyValue("scale");
        const animation = el.getAnimations()[0];
        animation.pause();
        animation.currentTime = 450;
        return {
          duration: animation.effect.getTiming().duration,
          scale: Number.parseFloat(getComputedStyle(el).scale),
          origin: getComputedStyle(el).transformOrigin,
        };
      });
      assert.equal(middle.duration, 900);
      assert.ok(middle.scale > 0 && middle.scale < 1);
      assert.ok(middle.origin.startsWith("0px "));
      assert.deepEqual(await label.boundingBox(), before);
      await button.screenshot({ path: screenshotPath("filling", width) });
      await fill.evaluate((el) => el.getAnimations()[0].finish());
      assert.equal(await fill.evaluate((el) => getComputedStyle(el).backgroundColor), colors.green);
      assert.equal(await fill.evaluate((el) => getComputedStyle(el).scale), "1");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await button.screenshot({ path: screenshotPath("filled", width) });
      assert.equal(await fill.evaluate((el) => getComputedStyle(el).transitionProperty), "none");
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

describe("visible playback contact reveal", () => {
  let video, progress, timers, observer, clock, calls, cleanup;
  const originals = new Map();
  beforeEach((t) => {
    clock = 0;
    calls = 0;
    timers = new Map();
    progress = { watchedMs: 0, revealed: false };
    for (const key of ["window", "document", "IntersectionObserver"]) {
      originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    }
    t.mock.method(performance, "now", () => clock);
    globalThis.window = Object.assign(new EventTarget(), {
      setInterval: (callback) => {
        timers.set(1, callback);
        return 1;
      },
      clearInterval: (id) => timers.delete(id),
    });
    globalThis.document = Object.assign(new EventTarget(), {
      visibilityState: "visible",
      hasFocus: () => true,
      documentElement: { getAttribute: () => null },
    });
    globalThis.IntersectionObserver = class {
      constructor(callback) {
        observer = { callback, disconnected: false };
      }
      observe() {}
      disconnect() {
        observer.disconnected = true;
      }
    };
    video = Object.assign(new EventTarget(), {
      paused: false,
      ended: false,
      seeking: false,
      readyState: 4,
      playbackRate: 1,
      currentTime: 0,
      ownerDocument: document,
    });
    cleanup = observeVideoContact(video, progress, () => calls++);
    show(true);
  });
  afterEach(() => {
    cleanup();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  function show(visible) {
    observer.callback([{ isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }]);
  }
  function advance(ms, playing = true) {
    for (let elapsed = 0; elapsed < ms; elapsed += 100) {
      clock += 100;
      if (playing && !video.paused) video.currentTime += video.playbackRate / 10;
      for (const callback of [...timers.values()]) callback();
    }
  }

  test("reveals once after three watched seconds and disposes observers and timers", () => {
    advance(2900);
    assert.equal(calls, 0);
    advance(200);
    assert.equal(calls, 1);
    assert.equal(progress.revealed, true);
    assert.equal(timers.size, 0);
    assert.equal(observer.disconnected, true);
    advance(5000);
    assert.equal(calls, 1);
  });
  test("pauses and stalled playback do not consume the remaining delay", () => {
    advance(1000);
    video.paused = true;
    video.dispatchEvent(new Event("pause"));
    advance(5000);
    video.paused = false;
    video.dispatchEvent(new Event("playing"));
    advance(5000, false);
    assert.equal(calls, 0);
    advance(1900);
    assert.equal(calls, 0);
    advance(200);
    assert.equal(calls, 1);
  });
  test("offscreen and hidden-tab playback never count", () => {
    show(false);
    advance(5000);
    show(true);
    document.visibilityState = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));
    advance(5000);
    assert.equal(progress.watchedMs, 0);
    document.visibilityState = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
    advance(3100);
    assert.equal(calls, 1);
  });
  test("focus loss and modal-blocked media do not count", () => {
    document.hasFocus = () => false;
    window.dispatchEvent(new Event("blur"));
    advance(5000);
    document.hasFocus = () => true;
    document.documentElement.getAttribute = () => "true";
    advance(5000);
    assert.equal(progress.watchedMs, 0);
    document.documentElement.getAttribute = () => null;
    window.dispatchEvent(new Event("focus"));
    advance(3100);
    assert.equal(calls, 1);
  });
  test("seeking past three seconds cannot instantly reveal the label", () => {
    advance(1000);
    video.seeking = true;
    video.dispatchEvent(new Event("seeking"));
    video.currentTime = 50;
    advance(5000);
    video.seeking = false;
    video.dispatchEvent(new Event("seeked"));
    advance(1900);
    assert.equal(calls, 0);
    advance(200);
    assert.equal(calls, 1);
  });
  test("double speed still requires three seconds of viewer attention", () => {
    video.playbackRate = 2;
    advance(1600);
    assert.equal(calls, 0);
    advance(1500);
    assert.equal(calls, 1);
  });
  test("less than half visible and buffering cannot fill the contact bar", () => {
    observer.callback([{ isIntersecting: true, intersectionRatio: 0.49 }]);
    advance(5000);
    assert.equal(progress.watchedMs, 0);
    show(true);
    video.readyState = 1;
    video.dispatchEvent(new Event("waiting"));
    advance(5000);
    assert.equal(progress.watchedMs, 0);
    video.readyState = 4;
    video.dispatchEvent(new Event("playing"));
    advance(2900);
    assert.equal(calls, 0);
    advance(200);
    assert.equal(calls, 1);
  });
  test("cleanup prevents late updates and reconnection retains already watched time", () => {
    advance(1500);
    cleanup();
    advance(5000);
    assert.equal(calls, 0);
    cleanup = observeVideoContact(video, progress, () => calls++);
    show(true);
    advance(1600);
    assert.equal(calls, 1);
    cleanup = observeVideoContact(video, progress, () => calls++);
    assert.equal(timers.size, 0);
    assert.equal(calls, 1);
  });
});
