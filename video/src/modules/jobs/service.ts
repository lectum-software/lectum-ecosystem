import { createReadStream } from "node:fs";
import type { NextFunction, Request, Response } from "express";
import type { Redis } from "ioredis";
import type { VideoServiceConfig } from "../../config/env.js";
import { sendPublicError, sendSuccess } from "../../http/responses.js";
import type { VideoQueue } from "../../infra/queue/client.js";
import {
  countOpenVideoJobs,
  createVideoJobId,
  enqueueCompressionJob,
  removeOrCancelVideoJob,
} from "../../infra/queue/jobs.js";
import { toPublicVideoJob } from "../../infra/queue/snapshot.js";
import { isVideoJobId } from "../../infra/storage/paths.js";
import { parseSingleByteRange } from "../../infra/storage/range.js";
import {
  acquireVideoStorageReservation,
  releaseVideoStorageReservation,
  retainVideoOutputReservation,
} from "../../infra/storage/reservations.js";
import { readSupportedVideoSignature } from "../../infra/storage/signature.js";
import {
  lockDownUploadedFile,
  removeVideoJobStorage,
  videoOutputStat,
} from "../../infra/storage/storage.js";

export type VideoJobControllerDependencies = {
  config: VideoServiceConfig;
  connection: Redis;
  queue: VideoQueue;
};

const JOB_OUTPUT_FILE_NAME = "lectum-video-comprimido.mp4";

export const prepareCompressionUpload =
  (dependencies: VideoJobControllerDependencies) =>
  async (request: Request, response: Response, next: NextFunction) => {
    const contentLength = Number(request.header("content-length"));
    if (
      Number.isFinite(contentLength) &&
      contentLength > dependencies.config.maxInputBytes + 1_048_576
    ) {
      sendPublicError(response, 413, "video_too_large", "O vídeo excede o limite permitido.");
      return;
    }

    const openJobs = await countOpenVideoJobs(dependencies.queue);
    if (openJobs >= dependencies.config.maxQueuedJobs) {
      sendPublicError(response, 429, "queue_full", "O serviço está ocupado. Tente novamente.");
      return;
    }

    request.videoJobId = createVideoJobId();
    const expectedInputBytes =
      Number.isSafeInteger(contentLength) && contentLength > 0
        ? Math.min(contentLength, dependencies.config.maxInputBytes)
        : dependencies.config.maxInputBytes;
    await acquireVideoStorageReservation({
      config: dependencies.config,
      connection: dependencies.connection,
      expectedInputBytes,
      jobId: request.videoJobId,
    });
    request.videoStorageReserved = true;

    request.once("aborted", () => {
      if (!request.videoUploadAccepted && request.videoJobId) {
        void removeVideoJobStorage(dependencies.config, request.videoJobId);
        if (request.videoStorageReserved) {
          void releaseVideoStorageReservation(dependencies.connection, request.videoJobId).catch(
            () => undefined,
          );
        }
      }
    });

    next();
  };

export const finishCompressionUpload =
  (dependencies: VideoJobControllerDependencies) =>
  async (request: Request, response: Response) => {
    const jobId = request.videoJobId;
    const file = request.file;
    let enqueued = false;
    if (!jobId || !file) {
      if (jobId) await removeVideoJobStorage(dependencies.config, jobId);
      if (jobId && request.videoStorageReserved) {
        await releaseVideoStorageReservation(dependencies.connection, jobId);
        request.videoStorageReserved = false;
      }
      sendPublicError(response, 400, "video_required", "Envie um vídeo válido.");
      return;
    }

    try {
      await lockDownUploadedFile(file.path);
      const signature = await readSupportedVideoSignature(file.path);
      if (!signature || file.size <= 0 || file.size > dependencies.config.maxInputBytes) {
        await removeVideoJobStorage(dependencies.config, jobId);
        await releaseVideoStorageReservation(dependencies.connection, jobId);
        request.videoStorageReserved = false;
        sendPublicError(response, 422, "invalid_video", "O arquivo enviado não é um vídeo válido.");
        return;
      }

      await retainVideoOutputReservation(dependencies.connection, dependencies.config, jobId);
      const job = await enqueueCompressionJob(dependencies.queue, jobId);
      enqueued = true;
      request.videoUploadAccepted = true;
      sendSuccess(response, 202, await toPublicVideoJob(job));
    } catch (error) {
      if (enqueued) {
        await removeOrCancelVideoJob({
          config: dependencies.config,
          connection: dependencies.connection,
          jobId,
          queue: dependencies.queue,
        }).catch(() => undefined);
      } else {
        await removeVideoJobStorage(dependencies.config, jobId);
        await releaseVideoStorageReservation(dependencies.connection, jobId).catch(() => undefined);
        request.videoStorageReserved = false;
      }
      throw error;
    }
  };

export const showVideoJob =
  (dependencies: VideoJobControllerDependencies) =>
  async (request: Request, response: Response) => {
    const jobId = request.params.id;
    if (!isVideoJobId(jobId)) {
      sendPublicError(response, 404, "job_not_found", "Processamento não encontrado.");
      return;
    }

    const job = await dependencies.queue.getJob(jobId);
    if (!job) {
      sendPublicError(response, 404, "job_not_found", "Processamento não encontrado.");
      return;
    }

    sendSuccess(response, 200, await toPublicVideoJob(job));
  };

export const deleteVideoJob =
  (dependencies: VideoJobControllerDependencies) =>
  async (request: Request, response: Response) => {
    const jobId = request.params.id;
    if (!isVideoJobId(jobId)) {
      sendSuccess(response, 200, { status: "removed" });
      return;
    }

    const result = await removeOrCancelVideoJob({
      config: dependencies.config,
      connection: dependencies.connection,
      jobId,
      queue: dependencies.queue,
    });

    sendSuccess(response, result === "cancel_requested" ? 202 : 200, {
      status: result === "cancel_requested" ? "cancel_requested" : "removed",
    });
  };

export const downloadVideoJobOutput =
  (dependencies: VideoJobControllerDependencies) =>
  async (request: Request, response: Response) => {
    const jobId = request.params.id;
    if (!isVideoJobId(jobId)) {
      sendPublicError(response, 404, "job_not_found", "Processamento não encontrado.");
      return;
    }

    const job = await dependencies.queue.getJob(jobId);
    if (!job || (await job.getState()) !== "completed") {
      sendPublicError(response, 404, "output_not_found", "Vídeo processado não encontrado.");
      return;
    }

    const output = await videoOutputStat(dependencies.config, jobId).catch(() => null);
    if (!output) {
      sendPublicError(
        response,
        410,
        "output_expired",
        "O vídeo processado não está mais disponível.",
      );
      return;
    }

    const range = parseSingleByteRange(request.header("range"), output.size);
    response.setHeader("Accept-Ranges", "bytes");
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    response.setHeader("Content-Disposition", `attachment; filename="${JOB_OUTPUT_FILE_NAME}"`);
    response.setHeader("Content-Type", "video/mp4");
    response.setHeader("X-Content-Type-Options", "nosniff");

    if (range === "invalid") {
      response.setHeader("Content-Range", `bytes */${output.size}`);
      response.status(416).end();
      return;
    }

    const start = range?.start ?? 0;
    const end = range?.end ?? output.size - 1;
    const contentLength = end - start + 1;
    response.setHeader("Content-Length", String(contentLength));
    if (range) {
      response.setHeader("Content-Range", `bytes ${start}-${end}/${output.size}`);
      response.status(206);
    } else {
      response.status(200);
    }

    createReadStream(output.path, { end, start })
      .on("error", () => response.destroy())
      .pipe(response);
  };
