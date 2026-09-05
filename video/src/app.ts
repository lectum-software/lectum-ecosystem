import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import type { Redis } from "ioredis";
import multer from "multer";
import type { VideoServiceConfig } from "./config/env.js";
import { VIDEO_SERVICE_VERSION } from "./config/version.js";
import { logError } from "./http/logging.js";
import { assertVideoApiReady } from "./http/readiness.js";
import { disableCaching, sendPublicError, sendSuccess } from "./http/responses.js";
import type { VideoQueue } from "./infra/queue/client.js";
import { releaseVideoStorageReservation } from "./infra/storage/reservations.js";
import { removeVideoJobStorage } from "./infra/storage/storage.js";
import { createServiceAuthentication } from "./middleware/auth.js";
import { attachRequestTrace } from "./middleware/trace.js";
import { createVideoJobsRouter } from "./modules/jobs/router.js";

export type VideoApiDependencies = {
  config: VideoServiceConfig;
  connection: Redis;
  queue: VideoQueue;
};

const multerErrorResponse = (error: multer.MulterError) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    return { code: "video_too_large", message: "O vídeo excede o limite permitido.", status: 413 };
  }

  return { code: "invalid_upload", message: "Envie um único vídeo válido.", status: 400 };
};

export const createVideoApi = (dependencies: VideoApiDependencies) => {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );
  app.use(attachRequestTrace);

  app.get("/health", (_request, response) => {
    disableCaching(response);
    sendSuccess(response, 200, { status: "healthy" });
  });

  app.get("/version", (_request, response) => {
    disableCaching(response);
    sendSuccess(response, 200, { version: VIDEO_SERVICE_VERSION });
  });

  app.get("/ready", async (_request, response) => {
    disableCaching(response);
    try {
      await assertVideoApiReady(dependencies);
      sendSuccess(response, 200, { status: "ready" });
    } catch {
      sendPublicError(
        response,
        503,
        "service_unavailable",
        "Serviço temporariamente indisponível.",
      );
    }
  });

  app.use(
    "/api/private/jobs",
    (_request, response, next) => {
      disableCaching(response);
      next();
    },
    createServiceAuthentication(dependencies.config),
    createVideoJobsRouter(dependencies),
  );

  app.use((_request, response) => {
    sendPublicError(response, 404, "route_not_found", "Rota não encontrada.");
  });

  const errorHandler: ErrorRequestHandler = async (error, request, response, _next) => {
    if (request.videoJobId && !request.videoUploadAccepted) {
      await removeVideoJobStorage(dependencies.config, request.videoJobId);
      if (request.videoStorageReserved) {
        await releaseVideoStorageReservation(dependencies.connection, request.videoJobId).catch(
          () => undefined,
        );
        request.videoStorageReserved = false;
      }
    }

    if (error instanceof multer.MulterError) {
      const publicError = multerErrorResponse(error);
      sendPublicError(response, publicError.status, publicError.code, publicError.message);
      return;
    }

    if (error instanceof SyntaxError) {
      sendPublicError(response, 400, "invalid_request", "Envie dados válidos.");
      return;
    }

    if (error instanceof Error && error.message === "video_storage_capacity_exhausted") {
      sendPublicError(
        response,
        507,
        "storage_full",
        "Não há espaço disponível para processar o vídeo.",
      );
      return;
    }

    if (error instanceof Error && error.message === "video_queue_capacity_exhausted") {
      sendPublicError(response, 429, "queue_full", "O serviço está ocupado. Tente novamente.");
      return;
    }

    logError("video_api_request_failed", {
      error_code: "internal_error",
      operation: request.method,
      trace_id: request.videoTraceId,
    });
    if (response.headersSent) {
      response.end();
      return;
    }
    sendPublicError(response, 500, "internal_error", "Não foi possível concluir a operação.");
  };

  app.use(errorHandler);
  return app;
};
