import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);

export function registerStartupCoverTests(getPage) {
  test("startup cover waits for a presented frame and rejects stale promotion callbacks", async () => {
    const page = getPage();
    await page.evaluate(() => {
      const React = require("react");
      const { VideoStartupCover } = require("@/components/ui/video-startup-cover");
      const video = document.createElement("video");
      window.coverVideo = video;
      window.coverEvent = (type) => video.dispatchEvent(new Event(type));
      video.requestVideoFrameCallback = (callback) => {
        window.presentFrame = (mediaTime = coverTime) => callback(0, { mediaTime });
        return 1;
      };
      video.cancelVideoFrameCallback = () => {};
      window.frameReady = 1;
      window.coverPaused = true;
      window.coverTime = 0;
      window.coverFrames = 0;
      window.coverDroppedFrames = 0;
      video.getVideoPlaybackQuality = () => ({
        totalVideoFrames: coverFrames,
        droppedVideoFrames: coverDroppedFrames,
      });
      Object.defineProperty(video, "paused", { configurable: true, get: () => coverPaused });
      Object.defineProperty(video, "currentTime", { configurable: true, get: () => coverTime });
      Object.defineProperty(video, "readyState", {
        configurable: true,
        get: () => window.frameReady,
      });
      const host = document.createElement("div");
      document.body.appendChild(host);
      const root = require("react-dom/client").createRoot(host);
      const videoRef = { current: video };
      window.renderCover = (active = true, version = 0) =>
        require("react-dom").flushSync(() =>
          root.render(
            React.createElement(VideoStartupCover, {
              poster: "/incoming.jpg",
              src: "/video",
              videoRef,
              active,
              version,
            }),
          ),
        );
      renderCover();
    });
    assert.equal(await page.locator("[data-video-startup-cover]").count(), 1);
    await page.evaluate(() => coverEvent("loadedmetadata"));
    assert.equal(await page.locator("[data-video-startup-cover]").count(), 1);
    await page.evaluate(() => {
      window.frameReady = 2;
      coverEvent("loadeddata");
    });
    assert.equal(await page.locator("[data-video-startup-cover]").count(), 1);
    await page.evaluate(() => require("react-dom").flushSync(() => presentFrame()));
    assert.equal(await page.locator("[data-video-startup-cover]").count(), 1);
    await page.evaluate(() => {
      window.coverPaused = false;
      coverEvent("playing");
      require("react-dom").flushSync(() => presentFrame());
    });
    // The prepared frame at time zero is still not foreground playback.
    assert.equal(await page.locator("[data-video-startup-cover]").count(), 1);
    await page.evaluate(() => {
      window.coverTime = 0.04;
      presentFrame(0);
    });
    // A queued standby callback stays stale even when currentTime has advanced.
    assert.equal(await page.locator("[data-video-startup-cover]").count(), 1);
    await page.evaluate(() => {
      presentFrame();
    });
    await page.waitForFunction(() => !document.querySelector("[data-video-startup-cover]"));
    await page.evaluate(() => {
      renderCover(false, 0);
      coverEvent("loadeddata");
      renderCover(true, 1);
      window.oldFrame = presentFrame;
      renderCover(false, 0);
      renderCover(true, 2);
      require("react-dom").flushSync(() => oldFrame());
    });
    assert.equal(await page.locator("[data-video-startup-cover]").count(), 1);
    await page.evaluate(() => {
      window.coverTime = 0.08;
      presentFrame();
    });
    await page.waitForFunction(() => !document.querySelector("[data-video-startup-cover]"));
    await page.evaluate(() => {
      window.frameReady = 0;
      coverEvent("emptied");
    });
    assert.equal(await page.locator("[data-video-startup-cover]").count(), 1);
    assert.equal(
      await page.locator("[data-video-startup-cover]").getAttribute("data-poster"),
      "/incoming.jpg",
    );
    await page.evaluate(() => {
      coverVideo.requestVideoFrameCallback = undefined;
      window.frameReady = 4;
      window.coverPaused = true;
      window.coverTime = 0;
      Object.defineProperty(coverVideo, "currentTime", { get: () => coverTime });
      Object.defineProperty(coverVideo, "paused", { get: () => coverPaused });
      renderCover(true, 3);
      coverEvent("loadeddata");
    });
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    assert.equal(await page.locator("[data-video-startup-cover]").count(), 1);
    await page.evaluate(() => {
      window.coverPaused = false;
      coverEvent("playing");
      window.coverTime = 0.2;
    });
    await page.waitForTimeout(200);
    assert.equal(await page.locator("[data-video-startup-cover]").count(), 1);
    await page.evaluate(() => {
      window.coverFrames += 1;
    });
    await page.waitForFunction(() => !document.querySelector("[data-video-startup-cover]"));
    await page.evaluate(() => {
      coverVideo.requestVideoFrameCallback = (callback) => {
        window.missingFrame = callback;
        return 2;
      };
      renderCover(true, 4);
      coverEvent("playing");
    });
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    assert.equal(await page.locator("[data-video-startup-cover]").count(), 1);
    await page.evaluate(() => {
      coverEvent("seeking");
      window.coverTime = 20;
      coverEvent("seeked");
    });
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    assert.equal(await page.locator("[data-video-startup-cover]").count(), 1);
    await page.evaluate(() => {
      window.coverTime = 20.2;
    });
    await page.waitForTimeout(200);
    assert.equal(await page.locator("[data-video-startup-cover]").count(), 1);
    await page.evaluate(() => {
      window.coverFrames += 3;
      window.coverDroppedFrames += 3;
    });
    await page.waitForTimeout(200);
    assert.equal(await page.locator("[data-video-startup-cover]").count(), 1);
    await page.evaluate(() => {
      window.coverFrames += 1;
    });
    await page.waitForFunction(() => !document.querySelector("[data-video-startup-cover]"));
    await page.evaluate(() => {
      renderCover(false, 0);
      require("react-dom").flushSync(() => missingFrame());
    });
    assert.equal(await page.locator("[data-video-startup-cover]").count(), 1);
  });

  test("prepared metadata keeps a poster in the incoming slot before promotion", async () => {
    const page = getPage();
    await page.evaluate(() => {
      window.prewarm = true;
      window.mediaSources = ["/video", "/api/public/video-assets/asset12345/playback"];
      select(0);
      mediaEvent("playing");
    });
    await page.waitForFunction(() =>
      document.querySelector('[data-video-slot-cover][data-poster="/prepared.jpg"]'),
    );
    assert.equal(await page.locator("video").count(), 2);
    await page.evaluate(() => select(1));
    assert.equal(
      await page.locator('[data-video-slot-cover][data-poster="/prepared.jpg"]').count(),
      1,
    );
  });
}
