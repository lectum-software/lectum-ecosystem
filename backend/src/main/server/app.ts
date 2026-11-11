import "@/config/dotenv";
import path from "node:path";
import cookieParser from "cookie-parser";
import express, { type Application, type Express, type Request } from "express";
import helmet from "helmet";
import * as i18nextMiddleware from "i18next-http-middleware";

import { filesRoute } from "@/config/multer/filesRoute";
import { getLimiter } from "@/external/limiter";
import prisma from "@/infra/database/prisma";
import { setupSentryExpressErrorHandler } from "@/infra/observability/sentry";
import { getVideoStreamConfig, isVideoStreamEnabled } from "@/infra/video-stream";
import { errorHandler, errorRoute } from "@/main/server/error";
import { socket } from "@/main/socket";
import { getTrustProxySetting } from "@/utils/runtime-config";
import { toSafeErrorLog } from "@/utils/safe-error-log";

import { createApiCors, finishApiPreflight } from "./cors";
import swagger from "./documents";
import i18next from "./i18n";
import routes from "./routes";

const server: Application = express();

const getBodyLimit = () => {
  const configured = process.env.HTTP_BODY_LIMIT?.trim().toLowerCase();

  return configured && /^\d+(?:kb|mb)$/.test(configured) ? configured : "1mb";
};

server.set("trust proxy", getTrustProxySetting());
server.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

server.get("/health", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

server.get("/ready", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");

  try {
    await prisma.$queryRaw`SELECT 1`;
    if (isVideoStreamEnabled() && !getVideoStreamConfig()) {
      return res.status(503).json({ status: "unavailable" });
    }
    return res.status(200).json({ status: "ready" });
  } catch (error) {
    console.error("[READINESS] Banco de dados indisponível.", {
      ...toSafeErrorLog(error, "UnknownDatabaseError"),
    });
    return res.status(503).json({ status: "unavailable" });
  }
});

server.use((req, res, next) => {
  const sensitivePrefixes = [
    "/api/private/",
    "/api/admin/",
    "/api/public/auth/",
    "/api/public/google/",
    "/api/public/user",
    "/api/public/video-assets/",
    "/api/public/video-stream/",
    "/api/public/billing/stripe/",
  ];

  if (sensitivePrefixes.some((prefix) => req.path.startsWith(prefix))) {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Pragma", "no-cache");
  }

  if (req.path.startsWith("/api/public/video-assets/")) {
    res.setHeader("CDN-Cache-Control", "no-store");
    res.setHeader("Cloudflare-CDN-Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  next();
});

// Allowed browser clients must read a rate-limit response instead of a CORS/network error.
server.use(createApiCors({ preflightContinue: true }));
server.use(getLimiter({}));
server.use(finishApiPreflight);
server.use(swagger);
server.use(express.static(path.resolve(process.cwd(), "public")));
server.use(cookieParser());

server.use(
  i18nextMiddleware.handle(i18next, {
    removeLngFromUrl: false,
    ignoreRoutes: ["/swagger-ui", "/files"],
  }),
);

// Stripe signatures require the exact byte sequence, independently bounded from general JSON limits.
server.use(
  "/api/public/billing/stripe/webhook",
  express.raw({ type: "application/json", limit: "256kb" }),
  (req, _res, next) => {
    if (Buffer.isBuffer(req.body)) req.rawBody = Buffer.from(req.body);
    next();
  },
);

const bodyLimit = getBodyLimit();
server.use(
  express.json({
    limit: bodyLimit,
    verify: (request, _response, body) => {
      const expressRequest = request as Request;
      if (expressRequest.originalUrl.startsWith("/api/public/video-stream/webhook")) {
        expressRequest.rawBody = Buffer.from(body);
      }
    },
  }),
);
server.use(express.urlencoded({ limit: bodyLimit, extended: true }));

const { httpServer } = socket(server as Express);

server.use((req, _res, next) => {
  req.uploads = {};
  return next();
});

server.use(routes);
filesRoute(server);
server.use(errorRoute);
setupSentryExpressErrorHandler(server);
server.use(errorHandler);

export default httpServer;
