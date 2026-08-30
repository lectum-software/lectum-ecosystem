import type { Browser, BrowserContext, Page } from "playwright-core";
import { toSafeErrorLog } from "@/utils/safe-error-log";
import { resolveShareChromiumConfig, type ShareChromiumConfig } from "./config";
import { toShareRenderFileName } from "./file-name";
import { createShareRenderConcurrencyGate, ShareRenderQueueFullError } from "./gate";
import { createShareRenderLocalServer, type ShareRenderLocalServer } from "./local-server";
import { loadShareRenderSource, ShareRenderSourceTooLargeError } from "./source";
import type { ShareRenderPayload, ShareRenderResult, ShareRenderTarget } from "./types";

export class ShareRenderUnavailableError extends Error {
  constructor() {
    super("SHARE_RENDER_UNAVAILABLE");
    this.name = "ShareRenderUnavailableError";
  }
}

export class ShareRenderDisabledError extends ShareRenderUnavailableError {
  constructor() {
    super();
    this.name = "ShareRenderDisabledError";
  }
}

type BrowserRenderResult = {
  contentType: string;
  sizeBytes: number;
};

type RenderOperationDependencies = {
  config?: ShareChromiumConfig;
};

const DEFAULT_CONFIG = resolveShareChromiumConfig();
const defaultGate = createShareRenderConcurrencyGate(
  DEFAULT_CONFIG.concurrency,
  DEFAULT_CONFIG.queueSize,
);

const SHARE_RENDER_VIEWPORT = {
  height: 960,
  width: 540,
} as const;
const SHARE_RENDER_CLOSE_TIMEOUT_MS = 3_000;
const SHARE_RENDER_RESULT_CACHE_VERSION = "share-render-v5-local-result-cfr30-quality-server";
const SHARE_RENDER_RESULT_CACHE_TTL_MS = 30 * 60_000;
const SHARE_RENDER_RESULT_CACHE_MAX_ENTRIES = 4;
const SHARE_RENDER_RESULT_CACHE_MAX_BYTES = 80 * 1024 * 1024;
const SHARE_RENDER_RESULT_UPLOAD_MAX_BYTES = 120 * 1024 * 1024;

type ShareRenderResultCacheEntry =
  | {
      createdAt: number;
      promise: Promise<ShareRenderResult>;
      sizeBytes: 0;
    }
  | {
      createdAt: number;
      result: ShareRenderResult;
      sizeBytes: number;
    };

const shareRenderResultCache = new Map<string, ShareRenderResultCacheEntry>();

const createShareRenderResultCacheKey = (target: ShareRenderTarget) =>
  JSON.stringify([
    SHARE_RENDER_RESULT_CACHE_VERSION,
    target.postId,
    target.replyId,
    target.mediaUrl,
    target.cardLabel,
    target.sourceText,
    target.responseText,
    target.shareTitle,
    target.professional.name,
    target.professional.roleLabel,
    target.professional.verified,
  ]);

const pruneShareRenderResultCache = (now = Date.now()) => {
  let totalBytes = 0;

  for (const [key, entry] of shareRenderResultCache) {
    if (now - entry.createdAt > SHARE_RENDER_RESULT_CACHE_TTL_MS) {
      shareRenderResultCache.delete(key);
      continue;
    }

    totalBytes += entry.sizeBytes;
  }

  while (
    shareRenderResultCache.size > SHARE_RENDER_RESULT_CACHE_MAX_ENTRIES ||
    totalBytes > SHARE_RENDER_RESULT_CACHE_MAX_BYTES
  ) {
    const oldest = shareRenderResultCache.entries().next().value as
      | [string, ShareRenderResultCacheEntry]
      | undefined;
    if (!oldest) break;

    shareRenderResultCache.delete(oldest[0]);
    totalBytes -= oldest[1].sizeBytes;
  }
};

const getCachedShareRenderResult = (cacheKey: string) => {
  pruneShareRenderResultCache();

  const entry = shareRenderResultCache.get(cacheKey);
  if (!entry) return null;

  shareRenderResultCache.delete(cacheKey);
  shareRenderResultCache.set(cacheKey, entry);

  return "result" in entry ? Promise.resolve(entry.result) : entry.promise;
};

const renderWithResultCache = async (
  cacheKey: string,
  renderOperation: () => Promise<ShareRenderResult>,
) => {
  const cached = getCachedShareRenderResult(cacheKey);
  if (cached) return cached;

  const promise = renderOperation().then(
    (result) => {
      if (result.sizeBytes <= SHARE_RENDER_RESULT_CACHE_MAX_BYTES) {
        shareRenderResultCache.set(cacheKey, {
          createdAt: Date.now(),
          result,
          sizeBytes: result.sizeBytes,
        });
        pruneShareRenderResultCache();
      } else {
        shareRenderResultCache.delete(cacheKey);
      }

      return result;
    },
    (error: unknown) => {
      const entry = shareRenderResultCache.get(cacheKey);
      if (entry && "promise" in entry && entry.promise === promise) {
        shareRenderResultCache.delete(cacheKey);
      }

      throw error;
    },
  );

  shareRenderResultCache.set(cacheKey, {
    createdAt: Date.now(),
    promise,
    sizeBytes: 0,
  });

  return promise;
};

const launchChromium = async (config: ShareChromiumConfig, timeoutMs: number) => {
  if (!config.enabled) throw new ShareRenderDisabledError();
  if (!config.executablePath) throw new ShareRenderUnavailableError();

  const { chromium } = await import("playwright-core");

  return chromium.launch({
    args: [
      "--autoplay-policy=no-user-gesture-required",
      "--disable-background-timer-throttling",
      "--disable-dev-shm-usage",
      "--disable-renderer-backgrounding",
      "--mute-audio",
      "--no-sandbox",
    ],
    executablePath: config.executablePath,
    headless: true,
    timeout: timeoutMs,
  });
};

const toBrowserTarget = (target: ShareRenderTarget): ShareRenderPayload => ({
  cardLabel: target.cardLabel,
  professional: target.professional,
  sourceText: target.sourceText,
});

const renderInPage = (page: Page, target: ShareRenderPayload) =>
  page.evaluate(async (browserTarget) => {
    const renderer = (
      globalThis as unknown as {
        renderLectumShare?: (target: ShareRenderPayload) => Promise<BrowserRenderResult>;
      }
    ).renderLectumShare;

    if (!renderer) throw new Error("SHARE_RENDERER_NOT_READY");

    return renderer(browserTarget);
  }, target);

const withRenderTimeout = async <T>(promise: Promise<T>, timeoutMs: number) =>
  new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      const error = new ShareRenderUnavailableError();
      error.name = "ShareRenderTimeoutError";
      reject(error);
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });

const closeWithTimeout = async (promise?: Promise<unknown>) =>
  new Promise<void>((resolve) => {
    if (!promise) {
      resolve();
      return;
    }

    const timeout = setTimeout(resolve, SHARE_RENDER_CLOSE_TIMEOUT_MS);
    promise.then(
      () => {
        clearTimeout(timeout);
        resolve();
      },
      () => {
        clearTimeout(timeout);
        resolve();
      },
    );
  });

const closeBrowserResources = async (
  page: Page | null,
  browser: Browser | null,
  context: BrowserContext | null,
  server: ShareRenderLocalServer | null,
) => {
  await closeWithTimeout(page?.close({ runBeforeUnload: false }));
  await closeWithTimeout(context?.close());
  await closeWithTimeout(browser?.close());
  await closeWithTimeout(server?.close());
};

const isExpectedCapacityError = (error: unknown) =>
  error instanceof ShareRenderQueueFullError || error instanceof ShareRenderSourceTooLargeError;

const isVideoMp4ContentType = (contentType: string) =>
  contentType.split(";")[0]?.trim().toLowerCase() === "video/mp4";

const renderShareVideo = async (
  target: ShareRenderTarget,
  config: ShareChromiumConfig,
): Promise<ShareRenderResult> => {
  const startedAt = Date.now();
  const remainingTimeoutMs = () => Math.max(1, config.timeoutMs - (Date.now() - startedAt));
  const operationAbortController = new AbortController();
  const operationTimeout = setTimeout(() => operationAbortController.abort(), config.timeoutMs);
  let server: ShareRenderLocalServer | null = null;
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    const source = await loadShareRenderSource(target.mediaUrl, {
      maxBytes: config.sourceMaxBytes,
      signal: operationAbortController.signal,
    });
    server = await createShareRenderLocalServer({
      resultMaxBytes: SHARE_RENDER_RESULT_UPLOAD_MAX_BYTES,
      sourceBuffer: source.buffer,
      sourceContentType: source.contentType,
    });
    browser = await launchChromium(config, remainingTimeoutMs());
    context = await browser.newContext({
      deviceScaleFactor: 1,
      locale: "pt-BR",
      viewport: SHARE_RENDER_VIEWPORT,
    });
    page = await context.newPage();
    page.setDefaultTimeout(remainingTimeoutMs());
    page.setDefaultNavigationTimeout(remainingTimeoutMs());
    await page.goto(server.origin, { timeout: remainingTimeoutMs(), waitUntil: "load" });
    await page.waitForFunction(
      () => Boolean((globalThis as unknown as { __lectumReady?: boolean }).__lectumReady),
      undefined,
      {
        timeout: remainingTimeoutMs(),
      },
    );

    const rendered = await withRenderTimeout(
      renderInPage(page, toBrowserTarget(target)),
      remainingTimeoutMs(),
    );
    const postedResult = await withRenderTimeout(
      server.getResult(),
      Math.max(1_000, remainingTimeoutMs()),
    );

    if (
      !postedResult.buffer.length ||
      postedResult.sizeBytes !== rendered.sizeBytes ||
      !isVideoMp4ContentType(rendered.contentType) ||
      !isVideoMp4ContentType(postedResult.contentType)
    ) {
      throw new ShareRenderUnavailableError();
    }

    return {
      buffer: postedResult.buffer,
      contentType: "video/mp4",
      fileName: toShareRenderFileName(target),
      sizeBytes: postedResult.buffer.length,
    };
  } finally {
    clearTimeout(operationTimeout);
    await closeBrowserResources(page, browser, context, server);
  }
};

export const renderShareVideoWithChromium = async (
  target: ShareRenderTarget,
  dependencies: RenderOperationDependencies = {},
): Promise<ShareRenderResult> => {
  const config = dependencies.config ?? DEFAULT_CONFIG;
  const gate = dependencies.config
    ? createShareRenderConcurrencyGate(config.concurrency, config.queueSize)
    : defaultGate;
  const renderOperation = async () => {
    await gate.acquire();
    try {
      return await renderShareVideo(target, config);
    } finally {
      gate.release();
    }
  };

  try {
    const cacheKey = dependencies.config ? null : createShareRenderResultCacheKey(target);

    return cacheKey
      ? await renderWithResultCache(cacheKey, renderOperation)
      : await renderOperation();
  } catch (error) {
    if (error instanceof ShareRenderDisabledError) throw error;
    if (isExpectedCapacityError(error)) throw error;

    console.warn("[SHARE_RENDER] Renderizacao indisponivel; fluxo chamador tratara fallback.", {
      ...toSafeErrorLog(error),
    });
    throw new ShareRenderUnavailableError();
  }
};
