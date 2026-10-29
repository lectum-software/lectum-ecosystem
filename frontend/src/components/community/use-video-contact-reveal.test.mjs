import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { afterEach, beforeEach, describe, test } from "node:test";
import { createElement } from "react";

const { observeVideoContact } = await import("./use-video-contact-reveal.ts");

test("collapsed video contact keeps full accessible action without a visible label", async () => {
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
  assert.match(html, /max-w-0 opacity-0/);
  assert.match(html, /min-w-\[44px\]/);
  assert.doesNotMatch(html, /disabled=""/);
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
