import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express, { type Application, type Express } from "express";
import helmet from "helmet";
import * as i18nextMiddleware from "i18next-http-middleware";

import { filesRoute } from "@/config/multer/filesRoute";
import { getLimiter } from "@/external/limiter";
import prisma from "@/infra/database/prisma";
import { errorHandler, errorRoute } from "@/main/server/error";
import { socket } from "@/main/socket";
import { toSafeErrorLog } from "@/utils/safe-error-log";

import swagger from "./documents";
import i18next from "./i18n";
import routes from "./routes";

dotenv.config();

const server: Application = express();

const getBodyLimit = () => {
  const configured = process.env.HTTP_BODY_LIMIT?.trim().toLowerCase();

  return configured && /^\d+(?:kb|mb)$/.test(configured) ? configured : "1mb";
};

const getTrustProxy = () => {
  const rawTrustProxy = process.env.TRUST_PROXY?.trim();

  if (!rawTrustProxy) return false;
  if (rawTrustProxy === "true") return true;
  if (rawTrustProxy === "false") return false;

  const parsedTrustProxy = Number(rawTrustProxy);

  return Number.isInteger(parsedTrustProxy) && parsedTrustProxy >= 0 ? parsedTrustProxy : false;
};

server.set("trust proxy", getTrustProxy());
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
  ];

  if (sensitivePrefixes.some((prefix) => req.path.startsWith(prefix))) {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Pragma", "no-cache");
  }

  next();
});

server.use(getLimiter({}));
server.use(swagger);
server.use(express.static(path.resolve(process.cwd(), "public")));
server.use(cookieParser());

server.use(
  i18nextMiddleware.handle(i18next, {
    removeLngFromUrl: false,
    ignoreRoutes: ["/swagger-ui", "/files"],
  }),
);

server.use(
  cors({
    origin: process.env.WEB_URL?.split(",").map((url) => url.trim()) || [],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept-Language",
      "X-Requested-With",
      "Accept",
      "Origin",
      "ngrok-skip-browser-warning",
      "x-device",
    ],
  }),
);

const bodyLimit = getBodyLimit();
server.use(express.json({ limit: bodyLimit }));
server.use(express.urlencoded({ limit: bodyLimit, extended: true }));

const { httpServer } = socket(server as Express);

server.use((req, _res, next) => {
  req.uploads = {};
  return next();
});

server.use(routes);
filesRoute(server);
server.use(errorRoute);
server.use(errorHandler);

export default httpServer;
