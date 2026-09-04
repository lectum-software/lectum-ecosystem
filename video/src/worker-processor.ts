import { stat } from "node:fs/promises";
import { type Job, UnrecoverableError } from "bullmq";
import type { Redis } from "ioredis";
import type { VideoServiceConfig } from "./config/env.js";
import {
  type VideoJobData,
  type VideoJobResult,
  VideoProcessingError,
} from "./domain/jobs/contracts.js";
import { compressVideo } from "./infra/ffmpeg/compress.js";
import {
  probeVideo,
  validateInputProbe,
  validateOutputProbe,
  validatePublishedOutput,
} from "./infra/ffmpeg/probe.js";
import {
  clearVideoJobCancellation,
  isVideoJobCancellationRequested,
} from "./infra/queue/cancellation.js";
import { videoStoragePaths } from "./infra/storage/paths.js";
import { releaseVideoStorageReservation } from "./infra/storage/reservations.js";
import {
  prepareVideoOutput,
  publishVideoOutput,
  removeVideoInput,
  removeVideoOutput,
  videoInputExists,
  videoOutputStat,
} from "./infra/storage/storage.js";

export type VideoProcessorDependencies = {
  config: VideoServiceConfig;
  controlConnection: Redis;
};

const normalizeProcessingError = (error: unknown) =>
  error instanceof VideoProcessingError
    ? error
    : new VideoProcessingError("processing_failed", { cause: error, retryable: true });

const attemptsRemaining = (job: Job<VideoJobData, VideoJobResult, string>) => {
  const attempts = typeof job.opts.attempts === "number" ? job.opts.attempts : 1;
  return job.attemptsMade + 1 < attempts;
};

export const createVideoJobProcessor =
  (dependencies: VideoProcessorDependencies) =>
  async (job: Job<VideoJobData, VideoJobResult, string>): Promise<VideoJobResult> => {
    const jobId = String(job.id);
    const controller = new AbortController();
    let cancellationCheckRunning = false;
    let cancellationInterval: NodeJS.Timeout | null = null;
    let reachedTerminalState = false;

    const requestCancellation = async () => {
      if (cancellationCheckRunning || controller.signal.aborted) return;
      cancellationCheckRunning = true;
      try {
        if (
          job.data.cancelRequested ||
          (await isVideoJobCancellationRequested(dependencies.controlConnection, jobId))
        ) {
          controller.abort();
        }
      } finally {
        cancellationCheckRunning = false;
      }
    };

    try {
      await requestCancellation();
      cancellationInterval = setInterval(
        () => void requestCancellation().catch(() => undefined),
        dependencies.config.cancellationPollMs,
      );
      cancellationInterval.unref();

      const paths = videoStoragePaths(dependencies.config.storageRoot, jobId);
      const existingOutput = await videoOutputStat(dependencies.config, jobId).catch(() => null);
      if (existingOutput) {
        const result = await validatePublishedOutput(
          dependencies.config,
          existingOutput.path,
          controller.signal,
        );
        await removeVideoInput(dependencies.config, jobId);
        await job.updateProgress(100);
        reachedTerminalState = true;
        return result;
      }

      if (!(await videoInputExists(dependencies.config, jobId))) {
        throw new VideoProcessingError("invalid_video");
      }

      const inputInformation = await stat(paths.inputPath);
      if (
        !inputInformation.isFile() ||
        inputInformation.size <= 0 ||
        inputInformation.size > dependencies.config.maxInputBytes
      ) {
        throw new VideoProcessingError("invalid_video");
      }

      await job.updateProgress(1);
      const source = await probeVideo(dependencies.config, paths.inputPath, controller.signal);
      validateInputProbe(dependencies.config, source);
      await job.updateProgress(3);
      await prepareVideoOutput(dependencies.config, jobId);

      let progressPromise = Promise.resolve();
      await compressVideo({
        config: dependencies.config,
        durationSeconds: source.durationSeconds,
        inputPath: paths.inputPath,
        onProgress: (percentage) => {
          progressPromise = progressPromise.then(() => job.updateProgress(Math.max(3, percentage)));
        },
        outputPath: paths.temporaryOutputPath,
        signal: controller.signal,
      });
      await progressPromise;

      const validated = await validateOutputProbe({
        config: dependencies.config,
        filePath: paths.temporaryOutputPath,
        signal: controller.signal,
        source,
      });
      await publishVideoOutput(dependencies.config, jobId);
      await removeVideoInput(dependencies.config, jobId);
      await job.updateProgress(100);
      reachedTerminalState = true;

      return {
        durationSeconds: validated.output.durationSeconds,
        outputSizeBytes: validated.outputSizeBytes,
      };
    } catch (error) {
      const processingError = normalizeProcessingError(error);
      const shouldRetry = processingError.retryable && attemptsRemaining(job);

      await removeVideoOutput(dependencies.config, jobId);
      if (!shouldRetry) {
        reachedTerminalState = true;
        await removeVideoInput(dependencies.config, jobId);
      }

      if (processingError.code === "canceled") {
        await job.updateData({ ...job.data, cancelRequested: true });
      }

      if (!processingError.retryable || !shouldRetry) {
        throw new UnrecoverableError(processingError.code);
      }
      throw new Error("processing_failed");
    } finally {
      if (cancellationInterval) clearInterval(cancellationInterval);
      if (reachedTerminalState) {
        await Promise.allSettled([
          clearVideoJobCancellation(dependencies.controlConnection, jobId),
          releaseVideoStorageReservation(dependencies.controlConnection, jobId),
        ]);
      }
    }
  };
