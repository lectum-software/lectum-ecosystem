import cors from "cors";
import type { RequestHandler } from "express";
import { getPublicWebOrigins } from "@/utils/public-origin";

// Contrato HTTP usado pelo servidor e pelos testes reais de preflight.
// Não refletir headers/origens arbitrários: apenas os clientes configurados.
export const createApiCors = (options: { preflightContinue?: boolean } = {}) =>
  cors({
    preflightContinue: options.preflightContinue ?? false,
    origin: getPublicWebOrigins(),
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
      "X-Lectum-Video-Upload-Methods",
    ],
  });

/** End preflight only after the shared limiter; OPTIONS retains the same request budget. */
export const finishApiPreflight: RequestHandler = (req, res, next) => {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
};
