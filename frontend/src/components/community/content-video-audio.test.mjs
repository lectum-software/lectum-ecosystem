import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import { createHarness } from "./content-video-browser-harness.mjs";
import { registerStartupCoverTests } from "./content-video-cover.test.mjs";

const require = createRequire(import.meta.url);
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

  test("technical pause does not become user intent and readiness may resume it", async () => {
    await page.evaluate(() => mount(false));
    await page.waitForFunction(() => !snapshot().paused);
    await page.evaluate(() => document.querySelector("video").pause());
    await page.waitForFunction(() => snapshot().paused);
    await page.evaluate(() => mediaEvent("canplay"));
    await page.waitForFunction(() => !snapshot().paused);
    await page.evaluate(() => surface());
    await page.waitForFunction(() => snapshot().paused);
    await page.evaluate(() => mediaEvent("canplay"));
    assert.equal((await state()).paused, true);
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

describe("standby with real decoded local media", {
  skip:
    (!process.env.PLAYWRIGHT_MODULE || !process.env.VIDEO_TEST_FILE) &&
    "Set Playwright and a real local MP4",
}, () => {
  let browser, server, origin;
  before(async () => {
    const bytes = readFileSync(process.env.VIDEO_TEST_FILE);
    server = createServer((request, response) => {
      if (!request.url.endsWith(".mp4")) {
        response.writeHead(200, { "Content-Type": "text/html" });
        response.end('<div id="root"></div>');
        return;
      }
      const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range || "");
      const start = range ? Number(range[1]) : 0;
      const end = range?.[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
      response.writeHead(range ? 206 : 200, {
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        ...(range ? { "Content-Range": `bytes ${start}-${end}/${bytes.length}` } : {}),
      });
      response.end(bytes.subarray(start, end + 1));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
    browser = await require(process.env.PLAYWRIGHT_MODULE).chromium.launch({
      channel: "chrome",
      headless: true,
    });
  });
  after(async () => {
    await browser?.close();
    await new Promise((resolve) => server?.close(resolve));
  });
  for (const width of [390, 1440])
    test(`actual playback and promotion at ${width}px`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      try {
        await page.goto(origin);
        await page.addScriptTag({ content: createHarness(true, true) });
        await page.evaluate(() => {
          window.prewarm = true;
          window.mediaSources = ["/first.mp4", "/second.mp4", "/third.mp4"];
          mount(false);
        });
        await page.waitForFunction(
          () => document.querySelector('[data-reels-active="true"] video')?.currentTime > 0.1,
        );
        await page.waitForFunction(
          () => document.querySelector("[data-reels-prepared-player]")?.readyState >= 2,
        );
        await page.evaluate(() => {
          window.standby = document.querySelector("[data-reels-prepared-player]");
          window.standbyLoads = standby.loads;
        });
        assert.equal(await page.evaluate(() => standby.paused && standby.currentTime === 0), true);
        await page.evaluate(() => select(1));
        await page.waitForFunction(
          () =>
            document.querySelector('[data-reels-active="true"] video') === standby &&
            standby.currentTime > 0.1,
        );
        assert.equal(
          await page.evaluate(() => standby.loads),
          await page.evaluate(() => standbyLoads),
        );
        assert.ok(await page.evaluate(() => standby.videoWidth > 0 && standby.videoHeight > 0));
        assert.equal(await page.locator("video").count(), 2);
        await page.evaluate(() => select(0));
        await page.waitForFunction(
          () => document.querySelector('[data-reels-active="true"] video')?.currentTime > 0.1,
        );
        assert.equal(
          await page.evaluate(() =>
            [...document.querySelectorAll("[data-reels-prepared-player]")].every((v) => v.paused),
          ),
          true,
        );
      } finally {
        await page.close();
      }
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
    assert.deepEqual(errors, []);
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
    assert.equal(await page.evaluate(() => originalVideo.loads), 2);
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

  registerStartupCoverTests(() => page);

  test("one standby starts only after playing and is promoted without loading again", async () => {
    await page.evaluate(() => {
      window.prewarm = true;
      window.mediaSources = ["/video", "/next.mp4", "/third.mp4"];
      select(0);
    });
    assert.equal(await page.locator("video").count(), 1);
    await page.evaluate(() => mediaEvent("playing"));
    await page.waitForFunction(
      () =>
        document.querySelector("[data-reels-prepared-player]")?.getAttribute("src") === "/next.mp4",
    );
    await page.evaluate(() => {
      window.standby = document.querySelector("[data-reels-prepared-player]");
      window.standbyLoads = standby.loads;
    });
    assert.equal(await page.evaluate(() => standby.paused && standby.muted), true);
    await page.evaluate(() => select(1));
    await page.waitForFunction(
      () => document.querySelector('[data-reels-active="true"] video') === standby,
    );
    assert.equal(await page.evaluate(() => standby.loads), await page.evaluate(() => standbyLoads));
    await page.evaluate(() => mediaEvent("playing"));
    await page.waitForFunction(
      () =>
        document.querySelector("[data-reels-prepared-player]")?.getAttribute("src") ===
        "/third.mp4",
    );
    assert.equal(await page.locator("video").count(), 2);
    assert.equal(
      await page.evaluate(() => document.querySelector("[data-reels-prepared-player]").paused),
      true,
    );
    assert.equal(
      await page.evaluate(() => {
        const media = [...document.querySelectorAll("video")];
        unmount();
        return media.every((video) => video.paused && !video.hasAttribute("src"));
      }),
      true,
    );
  });

  test("failed standby metadata is retried once on activation", async () => {
    await page.evaluate(() => {
      window.prewarm = true;
      window.nativeHls = true;
      window.playbackFailure = "/api/public/video-assets/asset12345/playback";
      window.mediaSources = ["/video", window.playbackFailure];
      select(0);
      mediaEvent("playing");
    });
    await page.waitForFunction(() => document.querySelector("[data-reels-prepared-player]"));
    assert.equal(await page.evaluate(() => window.playbackRetries || 0), 0);
    await page.evaluate(() => select(1));
    await page.waitForFunction(
      () =>
        document.querySelector('[data-reels-active="true"] video')?.getAttribute("src") ===
        "/stream.m3u8",
    );
    assert.equal(await page.evaluate(() => window.playbackRetries), 1);
    await page.evaluate(() => select(1));
    assert.equal(await page.evaluate(() => window.playbackRetries), 1);
  });

  test("failed native standby media reloads once on activation", async () => {
    await page.evaluate(() => {
      window.prewarm = true;
      window.mediaSources = ["/video", "/next.mp4"];
      select(0);
      mediaEvent("playing");
    });
    await page.waitForFunction(
      () =>
        document.querySelector("[data-reels-prepared-player]")?.getAttribute("src") === "/next.mp4",
    );
    await page.evaluate(() => {
      window.standby = document.querySelector("[data-reels-prepared-player]");
      window.beforeRetry = standby.loads;
      Object.defineProperty(standby, "error", { configurable: true, get: () => ({ code: 2 }) });
      select(1);
    });
    await page.waitForFunction(() => standby.loads === beforeRetry + 1);
    await page.evaluate(() => select(1));
    assert.equal(
      await page.evaluate(() => standby.loads),
      await page.evaluate(() => beforeRetry + 1),
    );
  });

  test("failed hls.js standby adapter restarts once on activation", async () => {
    await page.evaluate(() => {
      window.prewarm = true;
      window.nativeHls = false;
      window.mediaSources = ["/video", "/api/public/video-assets/asset12345/playback"];
      select(0);
      mediaEvent("playing");
    });
    await page.waitForFunction(
      () => document.querySelector("[data-reels-prepared-player]")?.testHls,
    );
    await page.evaluate(() => {
      window.standby = document.querySelector("[data-reels-prepared-player]");
      window.beforeRetry = window.hlsAttached;
      standby.testHls.handlers.error("error", { fatal: true, type: "fatal" });
    });
    await page.waitForFunction(() => window.hlsDestroyed >= 1);
    await page.evaluate(() => select(1));
    await page.waitForFunction(() => window.hlsAttached === beforeRetry + 1);
    await page.evaluate(() => select(1));
    assert.equal(
      await page.evaluate(() => window.hlsAttached),
      await page.evaluate(() => beforeRetry + 1),
    );
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
