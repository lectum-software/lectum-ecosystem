import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const domRequire = createRequire(require.resolve("react-dom/client"));
const production = (name, file, resolver = require) =>
  readFileSync(path.join(path.dirname(resolver.resolve(name)), "cjs", file), "utf8");
const source = (file) =>
  ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    fileName: file,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
const modules = {
  react: production("react", "react.production.js"),
  "react/jsx-runtime": production("react", "react-jsx-runtime.production.js"),
  "react-dom": production("react-dom", "react-dom.production.js"),
  "react-dom/client": production("react-dom", "react-dom-client.production.js"),
  scheduler: production("scheduler", "scheduler.production.js", domRequire),
  "@/lib/video-playback": source("../../lib/video-playback.ts"),
  "@/lib/video-sound-preference": source("../../lib/video-sound-preference.ts"),
  "@/components/analytics/attention": "exports.documentHasUserAttention = () => window.attention;",
  "@/lib/modal-media-scope": "exports.isVideoBlockedByModal = () => window.blocked;",
  "@tanstack/react-query": "exports.useQueryClient = () => ({});",
  "@/api/callers/posts":
    "exports.useVotePost = exports.useSavePost = exports.useSaveReply = () => ({});",
  "@/components/analytics/content-video-watch-tracker":
    "exports.useContentVideoWatchTracking = () => require('react').useCallback(() => {}, []);",
  "@/components/conversion/progressive-conversion-provider":
    "exports.useProgressiveConversion = () => ({});",
  "@/hooks/use-lectum-direct-share": "exports.useLectumDirectShare = () => ({});",
  "@/utils/community-display": "exports.getCommunityAuthorDisplayName = author => author.name;",
  "@/utils/media": "exports.resolvePublicMediaUrl = url => url;",
  "@/utils/public-routes":
    "exports.publicCommunityPostFocusedReplyHref = exports.publicCommunityPostHref = () => '/post';",
  "./community-whatsapp-cta": "exports.toCommunityWhatsAppIdentity = () => null;",
  "./content-video-interaction-refresh":
    "exports.refreshContentVideoInteraction = async () => ({});",
  "./content-video-comments-sheet": "exports.ContentVideoCommentsSheet = () => null;",
  "./feed-favorite-button": "exports.FeedFavoriteButton = () => null;",
  "./content-video-author": "exports.ContentVideoAuthor = () => null;",
  "@/components/psychologists/psychologist-whatsapp-redirect-button":
    "exports.PsychologistWhatsAppRedirectButton = () => null;",
  "@/components/ui/verified-badge": "exports.VerifiedBadgeIcon = () => null;",
  "@/components/ui/whatsapp-icon": "exports.WhatsAppIcon = () => null;",
  "lucide-react": "module.exports = new Proxy({}, { get: () => () => null });",
  "next/link":
    "exports.default = ({children}) => require('react').createElement('span', null, children);",
  "./content-video-viewer.module.css":
    "exports.default = new Proxy({}, { get: (_, name) => name });",
  "@/components/ui/vertical-video-player": `
    const React = require('react');
    exports.VerticalVideoPlayer = ({videoProps, onVideoElementReady, onContentClick}) => {
      const ready = React.useCallback(node => {
        if (node) window.prepareVideo(node);
        onVideoElementReady(node);
      }, [onVideoElementReady]);
      return React.createElement(React.Fragment, null,
        React.createElement('video', {...videoProps, ref: ready, preload: 'none'}),
        React.createElement('button', {onClick: onContentClick, 'data-surface': true}, 'surface'));
    };
  `,
  slide: source("./content-video-slide.tsx"),
};
const factories = Object.entries(modules)
  .map(
    ([name, value]) => `${JSON.stringify(name)}: function(require, module, exports) {\n${value}\n}`,
  )
  .join(",\n");
// Mount the actual slide, shared preference and guarded play helper. Only media outcomes,
// application services and unrelated visual children are controlled by this harness.
const harness = `
  const factories = {${factories}}, cache = {};
  function require(name) {
    if (cache[name]) return cache[name].exports;
    if (!factories[name]) throw new Error('Missing module ' + name);
    const module = cache[name] = {exports: {}};
    factories[name](require, module, module.exports);
    return module.exports;
  }
  const React = require('react'), {createRoot} = require('react-dom/client');
  const {flushSync} = require('react-dom');
  const {ContentVideoSlide} = require('slide');
  const sound = require('@/lib/video-sound-preference');
  window.attention = true; window.blocked = false;
  window.attempts = []; window.outcomes = []; window.pending = [];
  window.prepareVideo = video => {
    if (video.prepared) return;
    video.prepared = true; video.testPaused = true;
    Object.defineProperty(video, 'paused', {get: () => video.testPaused});
    Object.defineProperty(video, 'duration', {get: () => 60});
    video.pause = () => {
      if (video.testPaused) return;
      video.testPaused = true;
      video.dispatchEvent(new Event('pause'));
    };
    video.play = () => {
      attempts.push(video.muted);
      const outcome = outcomes.shift();
      if (outcome === 'pending') return new Promise((resolve, reject) => pending.push({resolve, reject, video}));
      if (outcome) return Promise.reject(new DOMException(outcome, outcome));
      video.testPaused = false; video.dispatchEvent(new Event('play'));
      return Promise.resolve();
    };
  };
  const item = {id:'v',post_id:'p',media_url:'/video',content:'caption',title:'title',
    author:{id:'a',name:'Author'},community:{slug:'c'},upvotes_count:0,replies_count:0,saved:false};
  let root; let active = true;
  const render = () => flushSync(() => root.render(React.createElement(ContentVideoSlide, {
    item,active,initialTime:0,changedDiscussion:false,closeRef:{current:null},
    onNext:()=>{},onPrevious:()=>{},onClose:()=>{},onInteraction:()=>{},onPanelChange:()=>{},onSeekingChange:()=>{}
  })));
  window.mount = (enabled, initialActive = true) => {
    sound.setVideoSoundEnabledByUser(enabled); active = initialActive;
    root = createRoot(document.getElementById('root')); render();
  };
  window.activate = value => {active = value; render();};
  window.chooseSound = value => flushSync(() => sound.setVideoSoundEnabledByUser(value));
  window.mediaEvent = name => flushSync(() => document.querySelector('video').dispatchEvent(new Event(name)));
  window.surface = () => flushSync(() => document.querySelector('[data-surface]').click());
  window.snapshot = () => ({muted:document.querySelector('video').muted,
    paused:document.querySelector('video').paused, preference:sound.getVideoSoundEnabled(),attempts:[...attempts]});
  window.finish = (index, error) => {
    const request = pending[index];
    if (error) request.reject(new DOMException(error, error));
    else {request.video.testPaused=false;request.video.dispatchEvent(new Event('play'));request.resolve();}
  };
`;

describe("reels audio with the actual mounted slide", {
  skip: !process.env.PLAYWRIGHT_MODULE && "Set PLAYWRIGHT_MODULE to an installed Playwright module",
}, () => {
  let browser, page, errors;
  before(async () => {
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
    browser = await chromium.launch({ channel: "chrome", headless: true });
  });
  after(async () => browser?.close());
  beforeEach(async () => {
    page = await browser.newPage();
    errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: harness });
  });
  afterEach(async () => {
    await page.close();
    assert.deepEqual(errors, []);
  });
  const state = () => page.evaluate(() => snapshot());

  for (const error of ["AbortError", "NotSupportedError"]) {
    test(`${error} during source attachment never revokes sound`, async () => {
      await page.evaluate((error) => {
        outcomes.push(error, error);
        mount(true);
      }, error);
      await page.evaluate(() => mediaEvent("loadedmetadata"));
      const result = await state();
      assert.equal(result.muted, false);
      assert.equal(result.preference, true);
      assert.ok(result.attempts.length > 0);
      assert.ok(result.attempts.every((muted) => !muted));
    });
  }
  test("known policy denial uses only local mute and new activation restores preference", async () => {
    await page.evaluate(() => {
      outcomes.push("NotAllowedError", "NotAllowedError");
      mount(true);
    });
    await page.waitForFunction(() => snapshot().muted && !snapshot().paused);
    assert.equal((await state()).preference, true);
    await page.evaluate(() => {
      activate(false);
      activate(true);
    });
    await page.waitForFunction(() => !snapshot().muted && !snapshot().paused);
  });
  test("stale denied attempt cannot mute a newer successful attempt", async () => {
    await page.evaluate(() => {
      outcomes.push("pending");
      mount(true);
    });
    await page.evaluate(() => mediaEvent("loadedmetadata"));
    await page.evaluate(() => finish(0, "NotAllowedError"));
    assert.equal((await state()).muted, false);
  });
  test("explicit mute wins over pending rejection and future readiness", async () => {
    await page.evaluate(() => {
      outcomes.push("pending");
      mount(true);
      chooseSound(false);
    });
    await page.evaluate(() => finish(0, "NotAllowedError"));
    await page.evaluate(() => mediaEvent("loadedmetadata"));
    const result = await state();
    assert.equal(result.muted, true);
    assert.equal(result.preference, false);
  });
  test("readiness and sound changes do not resume manual pause", async () => {
    await page.evaluate(() => mount(true));
    await page.evaluate(() => surface());
    const count = (await state()).attempts.length;
    await page.evaluate(() => {
      mediaEvent("canplay");
      mediaEvent("loadedmetadata");
      chooseSound(true);
    });
    assert.equal((await state()).paused, true);
    assert.equal((await state()).attempts.length, count);
    await page.evaluate(() => surface());
    assert.equal((await state()).paused, false);
  });
  test("inactive and reading slides cannot play on late readiness", async () => {
    await page.evaluate(() => mount(true, false));
    assert.deepEqual((await state()).attempts, []);
    await page.evaluate(() => activate(true));
    await page.locator(".caption").click();
    const count = (await state()).attempts.length;
    await page.evaluate(() => {
      mediaEvent("loadedmetadata");
      mediaEvent("canplay");
      chooseSound(true);
    });
    assert.equal((await state()).paused, true);
    assert.equal((await state()).attempts.length, count);
    await page.evaluate(() => activate(false));
    await page.evaluate(() => mediaEvent("loadedmetadata"));
    assert.equal((await state()).paused, true);
  });
  test("document or modal denial does not become a sound-policy fallback", async () => {
    await page.evaluate(() => {
      attention = false;
      mount(true);
    });
    assert.deepEqual((await state()).attempts, []);
    assert.equal((await state()).muted, false);
    await page.evaluate(() => {
      attention = true;
      blocked = true;
      mediaEvent("loadedmetadata");
    });
    assert.deepEqual((await state()).attempts, []);
    assert.equal((await state()).muted, false);
  });
});
