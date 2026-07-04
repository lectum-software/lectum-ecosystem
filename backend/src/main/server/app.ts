import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express, { type Application, type Express } from "express";
import helmet from "helmet";
import type { TFunction } from "i18next";
import * as i18nextMiddleware from "i18next-http-middleware";

import { filesRoute } from "@/config/multer/filesRoute";
import { getLimiter } from "@/external/limiter";
import { errorHandler, errorRoute } from "@/main/server/error";
import { socket } from "@/main/socket";

import swagger from "./documents";
import i18next from "./i18n";
import routes from "./routes";

dotenv.config();

export let translate: TFunction<"translation", undefined>;

const server: Application = express();

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
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
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
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "x-device",
    ],
  }),
);

server.use(express.json({ limit: "10mb" }));
server.use(express.urlencoded({ limit: "10mb", extended: true }));

const { httpServer } = socket(server as Express);

server.use((req, _res, next) => {
  translate = req.t;
  req.uploads = {};
  return next();
});

server.use(routes);
filesRoute(server);
server.use(errorRoute);
server.use(errorHandler);

export default httpServer;
