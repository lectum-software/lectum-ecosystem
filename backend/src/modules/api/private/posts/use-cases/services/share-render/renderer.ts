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
  base64: string;
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

const launchChromium = async (config: ShareChromiumConfig) => {
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

const renderShareVideo = async (
  target: ShareRenderTarget,
  config: ShareChromiumConfig,
): Promise<ShareRenderResult> => {
  const source = await loadShareRenderSource(target.mediaUrl, { maxBytes: config.sourceMaxBytes });
  let server: ShareRenderLocalServer | null = null;
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    server = await createShareRenderLocalServer({
      sourceBuffer: source.buffer,
      sourceContentType: source.contentType,
    });
    browser = await launchChromium(config);
    context = await browser.newContext({
      deviceScaleFactor: 1,
      locale: "pt-BR",
      viewport: SHARE_RENDER_VIEWPORT,
    });
    page = await context.newPage();
    page.setDefaultTimeout(config.timeoutMs);
    page.setDefaultNavigationTimeout(config.timeoutMs);
    await page.goto(server.origin, { timeout: config.timeoutMs, waitUntil: "load" });
    await page.waitForFunction(
      () => Boolean((globalThis as unknown as { __lectumReady?: boolean }).__lectumReady),
      undefined,
      {
        timeout: config.timeoutMs,
      },
    );

    const rendered = await withRenderTimeout(
      renderInPage(page, toBrowserTarget(target)),
      config.timeoutMs,
    );
    const buffer = Buffer.from(rendered.base64, "base64");

    if (!buffer.length) throw new ShareRenderUnavailableError();

    return {
      buffer,
      contentType: "video/mp4",
      fileName: toShareRenderFileName(target),
      sizeBytes: buffer.length,
    };
  } finally {
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

  try {
    await gate.acquire();
    try {
      return await renderShareVideo(target, config);
    } finally {
      gate.release();
    }
  } catch (error) {
    if (error instanceof ShareRenderDisabledError) throw error;
    if (isExpectedCapacityError(error)) throw error;

    console.warn("[SHARE_RENDER] Renderizacao indisponivel; fallback no cliente sera usado.", {
      ...toSafeErrorLog(error),
    });
    throw new ShareRenderUnavailableError();
  }
};
