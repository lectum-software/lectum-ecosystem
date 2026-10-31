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
  "@/components/analytics/attention":
    "exports.documentHasUserAttention = () => window.attention; exports.subscribeDocumentAttention = () => () => {};",
  "@/lib/modal-media-scope": "exports.isVideoBlockedByModal = () => window.blocked;",
  "@tanstack/react-query": "exports.useQueryClient = () => ({});",
  "@/api/callers/posts":
    "exports.useVotePost = exports.useSavePost = exports.useSaveReply = () => ({});",
  "@/components/analytics/content-video-watch-tracker": `exports.useContentVideoWatchTracking = () => {
      const React=require('react'), current=React.useRef(null);
      return React.useCallback(video => {
        if (!video && current.current) window.trackingDetached.push(current.current.getAttribute('src'));
        current.current=video;
      }, []);
    };`,
  "@/components/conversion/progressive-conversion-provider":
    "exports.useProgressiveConversion = () => ({});",
  "@/hooks/use-lectum-direct-share": "exports.useLectumDirectShare = () => ({});",
  "@/utils/community-display": "exports.getCommunityAuthorDisplayName = author => author.name;",
  "@/utils/media": "exports.resolvePublicMediaUrl = url => url;",
  "@/utils/public-routes":
    "exports.publicCommunityPostFocusedReplyHref = exports.publicCommunityPostHref = () => '/post';",
  "./community-whatsapp-cta": "exports.toCommunityWhatsAppIdentity = () => null;",
  "./content-video-interaction-refresh": `exports.refreshContentVideoInteraction = async () => ({});
     exports.isContentVideoInteractionBlocking = state => state === 'pending' || state === 'error';
     exports.useContentVideoInteractionSync = () => ({
       interactionSync: 'idle', refreshAfterSubmit: async () => {}, refreshInteractions: async () => {},
     });`,
  "./content-video-interaction-status": "exports.ContentVideoInteractionStatus = () => null;",
  "./content-video-comments-sheet": "exports.ContentVideoCommentsSheet = () => null;",
  "./content-video-header": source("./content-video-header.tsx"),
  "./use-content-video-progress": source("./use-content-video-progress.ts"),
  "./content-video-history": source("./content-video-history.ts"),
  "./content-video-reading-text": source("./content-video-reading-text.tsx"),
  "./content-video-inline-composer": `exports.ContentVideoInlineComposer = props => {
    window.setComposerBusy = busy => require('react-dom').flushSync(() => {
      props.onBusyChange(busy);
      props.onStateChange({busy, hasDraft:busy, submitting:false});
    });
    return null;
  };`,
  "@/app/app/community/[slug]/post/[id]/modules/reply-support":
    "exports.confirmDiscardReplyDraft = () => true;",
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
  "./content-video-controls.module.css":
    "exports.default = new Proxy({}, { get: (_, name) => name });",
  "./content-video-player": `
    const React = require('react');
    exports.ContentVideoPlayer = ({videoProps, onVideoElementReady, onContentClick}) => {
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
function createHarness(persistent = false) {
  const selectedModules = persistent
    ? {
        ...modules,
        "./content-video-player": source("./content-video-player.tsx"),
        "@/components/ui/vertical-video-player-stream":
          "exports.VerticalVideoStreamStatus = () => null;",
        "@/hooks/video-stream": source("../../hooks/video-stream/index.ts"),
        "@/utils/video-stream": source("../../utils/video-stream.ts"),
        "@/api/callers/video-assets": `
    exports.useVideoAssetPlayback = source => {
      require('react').useLayoutEffect(() => {
        document.querySelectorAll('video').forEach(window.prepareVideo);
      });
      return {data:source ? {hls_url:'/stream.m3u8',expires_at:'2099-01-01T00:00:00Z'} : undefined,refetch:()=>{}};
    };
  `,
        "hls.js": `exports.default = class Hls {
          static isSupported() { return true; }
          static Events = {MANIFEST_PARSED:'parsed', ERROR:'error'};
          static ErrorTypes = {};
          on() {} startLoad() {} stopLoad() {}
          loadSource(source) { this.source=source; }
          attachMedia(video) { this.video=video; video.src=this.source; window.hlsAttached=(window.hlsAttached||0)+1; }
          destroy() { window.hlsDestroyed=(window.hlsDestroyed||0)+1; }
        };`,
      }
    : modules;
  const factories = Object.entries(selectedModules)
    .map(
      ([name, value]) =>
        `${JSON.stringify(name)}: function(require, module, exports) {\n${value}\n}`,
    )
    .join(",\n");
  // Mount the actual slide, shared preference and guarded play helper. Only media outcomes,
  // application services and unrelated visual children are controlled by this harness.
  return `
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
  const {ContentVideoPlayerProvider} = require('./content-video-player');
  const persistent = ${persistent};
  if (persistent) window.IntersectionObserver = undefined;
  const sound = require('@/lib/video-sound-preference');
  window.attention = true; window.blocked = false;
  window.trackingDetached = [];
  window.attempts = []; window.outcomes = []; window.pending = [];
  window.prepareVideo = video => {
    if (video.prepared) return;
    video.prepared = true; video.testPaused = true; video.testEnded = false;
    video.load = () => { video.loads = (video.loads || 0) + 1; video.currentTime = 0; video.testEnded = false; };
    Object.defineProperty(video, 'paused', {get: () => video.testPaused});
    Object.defineProperty(video, 'ended', {get: () => video.testEnded});
    Object.defineProperty(video, 'currentSrc', {get: () => video.getAttribute('src') || ''});
    video.canPlayType = () => window.nativeHls ? 'probably' : '';
    Object.defineProperty(video, 'duration', {configurable: true, get: () => 60});
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
  let root; let active = true; let creating = false; let selected = 0;
  window.nextCalls = 0;
  window.historyTools = require('./content-video-history');
  const slide = index => React.createElement(ContentVideoSlide, {
    key:index,item:{...item,id:'v'+index,media_url:window.mediaSources?.[index] || item.media_url},active:active && index === selected,initialTime:0,changedDiscussion:false,closeRef:{current:null},
    createPostOpen:creating,onCreatePost:()=>{},
    onNext:()=>{window.nextCalls++},onNavigate:()=>{},onPrevious:()=>{},onClose:()=>{},onInteraction:()=>{},onPanelChange:()=>{},onSeekingChange:()=>{}
  });
  const render = () => flushSync(() => root.render(persistent
    ? React.createElement(ContentVideoPlayerProvider, null, [0,1,2].map(slide)) : slide(0)));
  window.select = index => {selected=index;render();};
  window.mount = (enabled, initialActive = true) => {
    sound.setVideoSoundEnabledByUser(enabled); active = initialActive;
    root = createRoot(document.getElementById('root')); render();
  };
  window.activate = value => {active = value; render();};
  window.openCreate = value => {creating = value; render();};
  window.chooseSound = value => flushSync(() => sound.setVideoSoundEnabledByUser(value));
  window.mediaEvent = name => flushSync(() => {
    const video = document.querySelector('video');
    if (name === 'ended') video.testEnded = true;
    video.dispatchEvent(new Event(name));
  });
  window.surface = () => flushSync(() => document.querySelector('[data-surface]').click());
  window.snapshot = () => ({muted:document.querySelector('video').muted,
    paused:document.querySelector('video').paused, preference:sound.getVideoSoundEnabled(),attempts:[...attempts]});
  window.finish = (index, error) => {
    const request = pending[index];
    if (error) request.reject(new DOMException(error, error));
    else {request.video.testPaused=false;request.video.dispatchEvent(new Event('play'));request.resolve();}
  };
`;
}
const harness = createHarness();

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

  test("advances on ended only for the active unobstructed video", async () => {
    await page.evaluate(() => mount(false));
    await page.evaluate(() => mediaEvent("ended"));
    assert.equal(await page.evaluate(() => nextCalls), 1);
    assert.equal(await page.locator("video").evaluate((video) => video.loop), false);
    await page.evaluate(() => {
      setComposerBusy(true);
      mediaEvent("ended");
    });
    await page.evaluate(() => {
      setComposerBusy(false);
      openCreate(true);
      mediaEvent("ended");
    });
    await page.evaluate(() => {
      openCreate(false);
      activate(false);
      mediaEvent("ended");
    });
    assert.equal(await page.evaluate(() => nextCalls), 1);
  });

  test("progress draws between timeupdate events and stays still while paused", async () => {
    await page.evaluate(() => {
      mount(false);
      const video = document.querySelector("video");
      Object.defineProperty(video, "duration", { configurable: true, value: 10 });
      video.currentTime = 2;
      mediaEvent("loadedmetadata");
    });
    await page.waitForFunction(
      () => document.querySelector(".progressFill").style.transform === "scaleX(0.2)",
    );
    await page.evaluate(() => {
      document.querySelector("video").currentTime = 4;
    });
    await page.waitForFunction(
      () => document.querySelector(".progressFill").style.transform === "scaleX(0.4)",
    );
    await page.evaluate(() => surface());
    await page.waitForFunction(() => snapshot().paused);
    await page.evaluate(() => {
      document.querySelector("video").currentTime = 7;
    });
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    assert.equal(
      await page.locator(".progressFill").evaluate((el) => el.style.transform),
      "scaleX(0.4)",
    );
    await page.evaluate(() => mediaEvent("timeupdate"));
    await page.waitForFunction(
      () => document.querySelector(".progressFill").style.transform === "scaleX(0.7)",
    );
  });

  test("history restores the same reel and time on Back, preserving Next state and account scope", async () => {
    await page.route("**/*", (route) =>
      route.fulfill({ contentType: "text/html", body: '<div id="root"></div>' }),
    );
    await page.goto("http://lectum.test/community");
    await page.addScriptTag({ content: harness });
    await page.evaluate(() => {
      history.replaceState({ __NA: true, tree: "preserved" }, "");
      historyTools.saveContentVideoHistory(
        { initial: { postId: "post", replyId: "reply", mediaUrl: "/clip" }, initialTime: 12.5 },
        "feed",
        "user",
      );
      history.pushState({}, "", "/profile");
    });
    assert.equal(
      await page.evaluate(() => historyTools.readContentVideoHistory("feed", "user")),
      null,
    );
    await page.goBack();
    await page.waitForFunction(() => location.pathname === "/community");
    const restored = await page.evaluate(() =>
      historyTools.readContentVideoHistory("feed", "user"),
    );
    assert.equal(restored.initial.replyId, "reply");
    assert.equal(restored.initialTime, 12.5);
    assert.equal(await page.evaluate(() => history.state.tree), "preserved");
    assert.equal(
      await page.evaluate(() => historyTools.readContentVideoHistory("root", "user")),
      null,
    );
    assert.equal(
      await page.evaluate(() => historyTools.readContentVideoHistory("feed", "other")),
      null,
    );
    await page.evaluate(() => historyTools.clearContentVideoHistory());
    assert.equal(
      await page.evaluate(() => historyTools.readContentVideoHistory("feed", "user")),
      null,
    );
    assert.equal(await page.evaluate(() => history.state.__NA), true);
  });

  test("editing and creating prevent late media events from restarting playback", async () => {
    await page.evaluate(() => mount(true));
    await page.waitForFunction(() => !snapshot().paused);
    await page.evaluate(() => setComposerBusy(true));
    await page.evaluate(() => mediaEvent("loadedmetadata"));
    assert.equal((await state()).paused, true);
    await page.evaluate(() => {
      setComposerBusy(false);
      openCreate(true);
      mediaEvent("canplay");
    });
    assert.equal((await state()).paused, true);
  });

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

describe("persistent reel media ownership", {
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
    await page.addScriptTag({ content: createHarness(true) });
    await page.evaluate(() => mount(false));
    await page.waitForFunction(() => document.querySelector("video")?.prepared);
  });
  afterEach(async () => {
    await page.close();
    assert.deepEqual(errors, []);
  });

  test("one activated media element survives forward, backward and identical-source reels", async () => {
    await page.evaluate(() => {
      window.originalVideo = document.querySelector("video");
      chooseSound(true);
    });
    for (const index of [1, 2, 1, 0, 2]) {
      await page.evaluate((index) => select(index), index);
      await page.evaluate(() => mediaEvent("loadedmetadata"));
      await page.waitForFunction(() => !snapshot().paused && !snapshot().muted);
      assert.equal(await page.locator("video").count(), 1);
      assert.equal(
        await page.evaluate(
          () => originalVideo === document.querySelector('[data-reels-active="true"] video'),
        ),
        true,
      );
      assert.equal(await page.evaluate(() => snapshot().preference), true);
    }
    assert.ok(await page.evaluate(() => originalVideo.loads >= 6));
  });

  test("late play from the previous owner cannot pause or mute the new owner", async () => {
    await page.evaluate(() => {
      outcomes.push("pending");
      chooseSound(true);
    });
    await page.evaluate(() => select(1));
    await page.evaluate(() => mediaEvent("loadedmetadata"));
    await page.waitForFunction(() => !snapshot().paused);
    await page.evaluate(() => finish(0, "NotAllowedError"));
    assert.equal(await page.evaluate(() => snapshot().paused), false);
    assert.equal(await page.evaluate(() => snapshot().muted), false);
    await page.evaluate(() => {
      chooseSound(false);
      select(2);
    });
    await page.evaluate(() => mediaEvent("loadedmetadata"));
    assert.equal(await page.evaluate(() => snapshot().muted), true);
    assert.equal(await page.evaluate(() => snapshot().preference), false);
  });

  test("temporary absence of an active slide parks rather than destroys the player", async () => {
    await page.evaluate(() => {
      window.originalVideo = document.querySelector("video");
      chooseSound(true);
    });
    await page.evaluate(() => activate(false));
    assert.equal(await page.evaluate(() => snapshot().paused), true);
    await page.evaluate(() => activate(true));
    await page.evaluate(() => mediaEvent("loadedmetadata"));
    assert.equal(
      await page.evaluate(() => document.querySelector("video") === originalVideo),
      true,
    );
    assert.equal(await page.evaluate(() => snapshot().muted), false);
  });

  test("queued ended from the previous source cannot skip the newly selected reel", async () => {
    await page.evaluate(() => select(1));
    await page.evaluate(() => document.querySelector("video").dispatchEvent(new Event("ended")));
    assert.equal(await page.evaluate(() => nextCalls), 0);
    await page.evaluate(() => mediaEvent("ended"));
    assert.equal(await page.evaluate(() => nextCalls), 1);
  });

  test("old tracking detaches before its source is cleared", async () => {
    await page.evaluate(() => select(1));
    assert.equal(await page.evaluate(() => trackingDetached[0]), "/video");
  });

  for (const native of [true, false]) {
    test(`MP4/HLS/MP4 keeps the element and sound with ${native ? "native" : "hls.js"} adapter`, async () => {
      await page.evaluate((native) => {
        window.nativeHls = native;
        window.mediaSources = [
          "/first.mp4",
          "/api/public/video-assets/asset12345/playback",
          "/last.mp4",
        ];
        window.originalVideo = document.querySelector("video");
        chooseSound(true);
        select(1);
      }, native);
      await page.waitForFunction(
        () => document.querySelector("video")?.getAttribute("src") === "/stream.m3u8",
      );
      await page.evaluate(() => mediaEvent("loadedmetadata"));
      assert.equal(await page.evaluate(() => snapshot().muted), false);
      await page.evaluate(() => select(2));
      await page.waitForFunction(
        () => document.querySelector("video")?.getAttribute("src") === "/last.mp4",
      );
      await page.evaluate(() => mediaEvent("loadedmetadata"));
      assert.equal(await page.evaluate(() => snapshot().muted || snapshot().paused), false);
      assert.equal(
        await page.evaluate(() => document.querySelector("video") === originalVideo),
        true,
      );
      if (!native) assert.equal(await page.evaluate(() => hlsDestroyed), 1);
    });
  }
});
