import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { getShareRenderBrowserPageHtml } from "./share-render/browser-page";
import { resolveShareChromiumConfig } from "./share-render/config";
import { toShareRenderFileName } from "./share-render/file-name";
import { shareRenderSourceKeyFromUrl } from "./share-render/source";

test("renderizacao social no backend mantem Chromium opcional e com limites seguros", () => {
  const config = resolveShareChromiumConfig({
    LECTUM_SHARE_CHROMIUM_CONCURRENCY: "2",
    LECTUM_SHARE_CHROMIUM_ENABLED: "false",
    LECTUM_SHARE_CHROMIUM_EXECUTABLE_PATH: "/opt/chromium/chrome",
    LECTUM_SHARE_CHROMIUM_QUEUE_SIZE: "4",
    LECTUM_SHARE_CHROMIUM_SOURCE_MAX_MB: "25",
    LECTUM_SHARE_CHROMIUM_TIMEOUT_MS: "260000",
  } as NodeJS.ProcessEnv);

  assert.equal(config.enabled, false);
  assert.equal(config.executablePath, "/opt/chromium/chrome");
  assert.equal(config.timeoutMs, 260_000);
  assert.equal(config.sourceMaxBytes, 25 * 1024 * 1024);
  assert.equal(config.concurrency, 2);
  assert.equal(config.queueSize, 4);

  assert.equal(resolveShareChromiumConfig({} as NodeJS.ProcessEnv).timeoutMs, 240_000);
  assert.equal(
    resolveShareChromiumConfig({
      LECTUM_SHARE_CHROMIUM_TIMEOUT_MS: "45000",
    } as NodeJS.ProcessEnv).timeoutMs,
    240_000,
  );
});

test("renderizacao social aceita somente objetos publicos de midia da comunidade", () => {
  assert.equal(
    shareRenderSourceKeyFromUrl("https://api.example.com/public/files/posts/media/video.mp4"),
    "posts/media/video.mp4",
  );
  assert.equal(
    shareRenderSourceKeyFromUrl("/public/files/posts/media/video%20um.mp4"),
    "posts/media/video um.mp4",
  );
  assert.equal(
    shareRenderSourceKeyFromUrl(
      "https://api.example.com/public/files/posts/share-artifacts/video.mp4",
    ),
    null,
  );
  assert.equal(shareRenderSourceKeyFromUrl("https://example.com/private/video.mp4"), null);
});

test("pagina interna do Chromium usa MediaBunny para mp4 fast start com AVC/AAC", () => {
  const html = getShareRenderBrowserPageHtml();

  assert.match(html, /mediabunny/);
  assert.match(html, /registerAacEncoder/);
  assert.match(html, /canEncodeVideo\("avc"/);
  assert.match(html, /new Mp4OutputFormat\(\{ fastStart: "in-memory" \}\)/);
  assert.match(html, /codec: "aac"/);
  assert.match(html, /codec: "avc"/);
  assert.match(html, /fit: "fill"/);
  assert.match(html, /frameRate: 30/);
  assert.match(html, /videoBitrate: 1_200_000/);
  assert.match(html, /return canvas;/);
  assert.doesNotMatch(html, /processedFrameIndex/);
  assert.doesNotMatch(html, /frameDurationSeconds/);
});

test("renderizacao social no backend deduplica e reaproveita resultado em memoria", () => {
  const rendererSource = readFileSync(path.join(__dirname, "share-render", "renderer.ts"), "utf8");

  assert.match(
    rendererSource,
    /SHARE_RENDER_RESULT_CACHE_VERSION = "share-render-v3-cfr30-quality-server"/,
  );
  assert.match(rendererSource, /SHARE_RENDER_RESULT_CACHE_TTL_MS = 30 \* 60_000/);
  assert.match(rendererSource, /SHARE_RENDER_RESULT_CACHE_MAX_ENTRIES = 4/);
  assert.match(rendererSource, /renderWithResultCache/);
  assert.match(rendererSource, /createShareRenderResultCacheKey\(target\)/);
});

test("renderizacao social publicada usa job assincrono para evitar resposta longa", () => {
  const jobsSource = readFileSync(path.join(__dirname, "share-render", "jobs.ts"), "utf8");
  const routesSource = readFileSync(path.join(__dirname, "..", "..", "index.ts"), "utf8");

  assert.match(jobsSource, /SHARE_RENDER_JOB_VERSION = "share-render-job-v1-cf-safe-cfr30"/);
  assert.match(jobsSource, /SHARE_RENDER_JOB_TTL_MS = 30 \* 60_000/);
  assert.match(jobsSource, /startShareRenderJob/);
  assert.match(jobsSource, /getShareRenderJobSnapshot/);
  assert.match(jobsSource, /getShareRenderJobResult/);
  assert.match(routesSource, /share-artifact\/render-jobs/);
  assert.match(routesSource, /share-artifact\/render-jobs\/:jobId\/file/);
  assert.match(routesSource, /shareRenderJobValidator/);
});

test("nome do arquivo de renderizacao social nao expoe texto arbitrario", () => {
  assert.equal(
    toShareRenderFileName({
      postId: "post_1234567890abcdef",
      replyId: null,
      shareTitle: "Dra. Júlia / Lectum",
    }),
    "dra-julia-lectum-post-1234567.mp4",
  );
});
