import { readFile } from "node:fs/promises";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { createRequire } from "node:module";
import type { Socket } from "node:net";
import path from "node:path";
import { getShareRenderBrowserPageHtml } from "./browser-page";

const requireFromHere = createRequire(__filename);

export type ShareRenderLocalServer = {
  close: () => Promise<void>;
  origin: string;
};

type ShareRenderLocalServerInput = {
  sourceBuffer: Buffer;
  sourceContentType: string;
};

const BUNDLE_CACHE = new Map<string, Promise<Buffer>>();

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

const routeRequest = async (
  input: ShareRenderLocalServerInput,
  req: IncomingMessage,
  res: ServerResponse,
) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");

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
    const server = http.createServer((req, res) => {
      void routeRequest(input, req, res).catch(() => {
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
        origin: `http://127.0.0.1:${address.port}`,
      });
    });
  });
