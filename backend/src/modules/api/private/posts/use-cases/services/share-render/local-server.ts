import { readFile } from "node:fs/promises";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { createRequire } from "node:module";
import type { Socket } from "node:net";
import path from "node:path";
import { getShareRenderBrowserPageHtml } from "./browser-page";

const requireFromHere = createRequire(__filename);

export type ShareRenderLocalServer = {
  close: () => Promise<void>;
  getResult: () => Promise<ShareRenderPostedResult>;
  origin: string;
};

export type ShareRenderPostedResult = {
  buffer: Buffer;
  contentType: string;
  sizeBytes: number;
};

type ShareRenderLocalServerInput = {
  resultMaxBytes?: number;
  sourceBuffer: Buffer;
  sourceContentType: string;
};

const BUNDLE_CACHE = new Map<string, Promise<Buffer>>();
const DEFAULT_SHARE_RENDER_RESULT_MAX_BYTES = 120 * 1024 * 1024;

class ShareRenderResultTooLargeError extends Error {
  constructor() {
    super("SHARE_RENDER_RESULT_TOO_LARGE");
    this.name = "ShareRenderResultTooLargeError";
  }
}

const resolveBundlePath = (packageName: string, bundleFileName: string) => {
  const packageEntry = requireFromHere.resolve(packageName);

  return path.join(path.dirname(packageEntry), bundleFileName);
};

const readBundle = (packageName: string, bundleFileName: string) => {
  const cacheKey = `${packageName}:${bundleFileName}`;
  const cached = BUNDLE_CACHE.get(cacheKey);
  if (cached) return cached;

  const bundle = readFile(resolveBundlePath(packageName, bundleFileName));
  BUNDLE_CACHE.set(cacheKey, bundle);
  return bundle;
};

const readMediabunnyBundle = () => readBundle("mediabunny", "mediabunny.min.mjs");

const readAacEncoderBundle = () =>
  readBundle("@mediabunny/aac-encoder", "mediabunny-aac-encoder.min.mjs");

const iconPath = () => path.resolve(process.cwd(), "public", "icon.png");

const sendBuffer = (
  res: ServerResponse,
  status: number,
  body: Buffer | string,
  contentType: string,
) => {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
  res.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Length": String(buffer.length),
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  });
  res.end(buffer);
};

const notFound = (res: ServerResponse) => sendBuffer(res, 404, "Not found", "text/plain");

const normalizeResultContentType = (value: unknown) => {
  if (typeof value !== "string") return "application/octet-stream";

  return value.split(";")[0]?.trim().toLowerCase() || "application/octet-stream";
};

const readRequestBody = (req: IncomingMessage, maxBytes: number) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let exceededMaxBytes = false;

    req.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;
      if (totalBytes > maxBytes) {
        exceededMaxBytes = true;
        return;
      }

      chunks.push(buffer);
    });
    req.on("end", () => {
      if (exceededMaxBytes) {
        reject(new ShareRenderResultTooLargeError());
        return;
      }

      resolve(Buffer.concat(chunks, totalBytes));
    });
    req.on("error", reject);
  });

type ShareRenderResultState = {
  hasResult: boolean;
  resolveResult: (result: ShareRenderPostedResult) => void;
  result: Promise<ShareRenderPostedResult>;
};

const createResultState = (): ShareRenderResultState => {
  let resolveResult!: (result: ShareRenderPostedResult) => void;
  const result = new Promise<ShareRenderPostedResult>((resolve) => {
    resolveResult = resolve;
  });

  return {
    hasResult: false,
    resolveResult,
    result,
  };
};

const receiveRenderResult = async (
  input: ShareRenderLocalServerInput,
  state: ShareRenderResultState,
  req: IncomingMessage,
  res: ServerResponse,
) => {
  if (normalizeResultContentType(req.headers["content-type"]) !== "video/mp4") {
    sendBuffer(res, 415, "Unsupported media type", "text/plain");
    return;
  }

  if (state.hasResult) {
    sendBuffer(res, 409, "Result already received", "text/plain");
    return;
  }

  try {
    const buffer = await readRequestBody(
      req,
      input.resultMaxBytes ?? DEFAULT_SHARE_RENDER_RESULT_MAX_BYTES,
    );
    if (!buffer.length) {
      sendBuffer(res, 422, "Empty result", "text/plain");
      return;
    }

    state.hasResult = true;
    state.resolveResult({
      buffer,
      contentType: "video/mp4",
      sizeBytes: buffer.length,
    });
    sendBuffer(res, 204, "", "text/plain");
  } catch (error) {
    sendBuffer(
      res,
      error instanceof ShareRenderResultTooLargeError ? 413 : 500,
      "Result unavailable",
      "text/plain",
    );
  }
};

const routeRequest = async (
  input: ShareRenderLocalServerInput,
  state: ShareRenderResultState,
  req: IncomingMessage,
  res: ServerResponse,
) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");

  if (url.pathname === "/result") {
    if (req.method !== "POST") {
      notFound(res);
      return;
    }

    await receiveRenderResult(input, state, req, res);
    return;
  }

  if (req.method !== "GET") {
    notFound(res);
    return;
  }

  if (url.pathname === "/") {
    sendBuffer(res, 200, getShareRenderBrowserPageHtml(), "text/html; charset=utf-8");
    return;
  }

  if (url.pathname === "/source") {
    sendBuffer(res, 200, input.sourceBuffer, input.sourceContentType);
    return;
  }

  if (url.pathname === "/vendor/mediabunny.mjs") {
    sendBuffer(res, 200, await readMediabunnyBundle(), "text/javascript; charset=utf-8");
    return;
  }

  if (url.pathname === "/vendor/aac-encoder.mjs") {
    sendBuffer(res, 200, await readAacEncoderBundle(), "text/javascript; charset=utf-8");
    return;
  }

  if (url.pathname === "/icon.png") {
    sendBuffer(res, 200, await readFile(iconPath()), "image/png");
    return;
  }

  notFound(res);
};

export const createShareRenderLocalServer = (input: ShareRenderLocalServerInput) =>
  new Promise<ShareRenderLocalServer>((resolve, reject) => {
    const sockets = new Set<Socket>();
    const resultState = createResultState();
    const server = http.createServer((req, res) => {
      void routeRequest(input, resultState, req, res).catch(() => {
        if (!res.headersSent) {
          sendBuffer(res, 500, "Internal error", "text/plain");
        } else {
          res.destroy();
        }
      });
    });

    server.on("connection", (socket) => {
      sockets.add(socket);
      socket.once("close", () => sockets.delete(socket));
    });

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("SHARE_RENDER_SERVER_UNAVAILABLE"));
        return;
      }

      server.unref();
      resolve({
        close: () =>
          new Promise<void>((closeResolve) => {
            const fallback = setTimeout(closeResolve, 1_000);
            server.close(() => {
              clearTimeout(fallback);
              closeResolve();
            });
            server.closeAllConnections?.();
            for (const socket of sockets) {
              socket.destroy();
            }
          }),
        getResult: () => resultState.result,
        origin: `http://127.0.0.1:${address.port}`,
      });
    });
  });
