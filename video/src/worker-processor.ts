import { stat } from "node:fs/promises";
import { type Job, UnrecoverableError } from "bullmq";
import type { Redis } from "ioredis";
import type { VideoServiceConfig } from "./config/env.js";
import {
  type VideoJobData,
  type VideoJobResult,
  VideoProcessingError,
} from "./domain/jobs/contracts.js";
import { logWarning } from "./http/logging.js";
import { compressVideo } from "./infra/ffmpeg/compress.js";
import {
  probeRemoteVideo,
  probeVideo,
  validateInputProbe,
  validateOutputProbe,
  validatePublishedOutput,
} from "./infra/ffmpeg/probe.js";
import { ManagedProcessError, managedProcessDiagnosticCode } from "./infra/ffmpeg/process.js";
import { downloadRemoteVideoSourceFile } from "./infra/ffmpeg/remote-source.js";
import { renderSocialShareVideo } from "./infra/ffmpeg/social-share.js";
import {
  assertSafeRemoteVideoSourceUrl,
  isRemoteVideoHlsSource,
} from "./infra/ffmpeg/source-url.js";
import {
  clearVideoJobCancellation,
  isVideoJobCancellationRequested,
} from "./infra/queue/cancellation.js";
import { createVideoProgressWriter } from "./infra/queue/progress.js";
import { videoStoragePaths } from "./infra/storage/paths.js";
import { releaseVideoStorageReservation } from "./infra/storage/reservations.js";
import { readSupportedVideoSignature } from "./infra/storage/signature.js";
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

const safeJobProgress = (job: Job<VideoJobData, VideoJobResult, string>): number | undefined =>
  typeof job.progress === "number" ? job.progress : undefined;

const safeJobOperation = (job: Job<VideoJobData, VideoJobResult, string>) => {
  const operation = job.data.operation;
  return operation === "compress" || operation === "social_share" ? operation : "unknown";
};

const safeFailureStage = (job: Job<VideoJobData, VideoJobResult, string>) => {
  const operation = safeJobOperation(job);
  const progress = safeJobProgress(job);

  if (progress === undefined) return "unknown";
  if (operation === "social_share") {
    if (progress < 1) return "queued";
    if (progress < 2) return "source_validation";
    if (progress < 3) return "source_download";
    if (progress < 4) return "render_initialization";
    if (progress < 100) return "render_processing";
    return "publishing";
  }

  if (operation === "compress") {
    if (progress < 1) return "queued";
    if (progress < 3) return "source_validation";
    if (progress < 100) return "processing";
    return "publishing";
  }

  return "unknown";
};

const processCompressionJob = async (input: {
  config: VideoServiceConfig;
  job: Job<VideoJobData, VideoJobResult, string>;
  jobId: string;
  paths: ReturnType<typeof videoStoragePaths>;
  signal: AbortSignal;
}) => {
  if (!(await videoInputExists(input.config, input.jobId))) {
    throw new VideoProcessingError("invalid_video");
  }

  const inputInformation = await stat(input.paths.inputPath);
  if (
    !inputInformation.isFile() ||
    inputInformation.size <= 0 ||
    inputInformation.size > input.config.maxInputBytes
  ) {
    throw new VideoProcessingError("invalid_video");
  }

  await input.job.updateProgress(1);
  const source = await probeVideo(input.config, input.paths.inputPath, input.signal);
  validateInputProbe(input.config, source);
  await input.job.updateProgress(3);
  await prepareVideoOutput(input.config, input.jobId);

  const progress = createVideoProgressWriter(input.job);
  await compressVideo({
    config: input.config,
    durationSeconds: source.durationSeconds,
    inputPath: input.paths.inputPath,
    onProgress: progress.write,
    outputPath: input.paths.temporaryOutputPath,
    signal: input.signal,
  });
  await progress.flush();

  return validateOutputProbe({
    config: input.config,
    filePath: input.paths.temporaryOutputPath,
    signal: input.signal,
    source,
  });
};

const ensureDownloadedSocialShareInput = async (input: {
  config: VideoServiceConfig;
  job: Job<VideoJobData, VideoJobResult, string>;
  jobId: string;
  paths: ReturnType<typeof videoStoragePaths>;
  requestOrigin?: string | null;
  signal: AbortSignal;
  sourceUrl: string;
}) => {
  if (!(await videoInputExists(input.config, input.jobId))) {
    await downloadRemoteVideoSourceFile({
      config: input.config,
      outputPath: input.paths.inputPath,
      requestOrigin: input.requestOrigin,
      signal: input.signal,
      sourceUrl: input.sourceUrl,
    });
  }

  const inputInformation = await stat(input.paths.inputPath);
  const signature = await readSupportedVideoSignature(input.paths.inputPath);
  if (
    !signature ||
    !inputInformation.isFile() ||
    inputInformation.size <= 0 ||
    inputInformation.size > input.config.maxInputBytes
  ) {
    throw new VideoProcessingError("invalid_video");
  }

  await input.job.updateProgress(2);

  return probeVideo(input.config, input.paths.inputPath, input.signal);
};

const processSocialShareJob = async (input: {
  config: VideoServiceConfig;
  job: Job<VideoJobData, VideoJobResult, string>;
  jobId: string;
  paths: ReturnType<typeof videoStoragePaths>;
  signal: AbortSignal;
}) => {
  if (input.job.data.operation !== "social_share") {
    throw new VideoProcessingError("processing_failed");
  }

  let sourceUrl: string;
  try {
    sourceUrl = await assertSafeRemoteVideoSourceUrl(input.job.data.sourceUrl);
  } catch (error) {
    throw new VideoProcessingError("invalid_video", { cause: error });
  }
  const sourceOrigin = input.job.data.sourceOrigin ?? null;

  await input.job.updateProgress(1);
  const sourceIsHls = isRemoteVideoHlsSource(sourceUrl);
  const source = sourceIsHls
    ? await probeRemoteVideo(input.config, { requestOrigin: sourceOrigin, sourceUrl }, input.signal)
    : await ensureDownloadedSocialShareInput({
        config: input.config,
        job: input.job,
        jobId: input.jobId,
        paths: input.paths,
        requestOrigin: sourceOrigin,
        signal: input.signal,
        sourceUrl,
      });
  validateInputProbe(input.config, source);
  await input.job.updateProgress(3);
  await prepareVideoOutput(input.config, input.jobId);

  const progress = createVideoProgressWriter(input.job);
  await renderSocialShareVideo({
    config: input.config,
    durationSeconds: source.durationSeconds,
    metadata: input.job.data.metadata,
    onProgress: progress.write,
    outputPath: input.paths.temporaryOutputPath,
    signal: input.signal,
    source: sourceIsHls
      ? { kind: "remote", requestOrigin: sourceOrigin, sourceUrl }
      : { inputPath: input.paths.inputPath, kind: "file" },
  });
  await progress.flush();

  return validateOutputProbe({
    config: input.config,
    filePath: input.paths.temporaryOutputPath,
    signal: input.signal,
    source,
  });
};

export const createVideoJobProcessor =
  (dependencies: VideoProcessorDependencies) =>
  async (job: Job<VideoJobData, VideoJobResult, string>): Promise<VideoJobResult> => {
    const jobId = String(job.id);
    const controller = new AbortController();
    let cancellationCheckRunning = false;
    let cancellationInterval: NodeJS.Timeout | null = null;
    let reachedTerminalState = false;
    let outputPublished = false;
    const attemptTimeout = setTimeout(
      () => controller.abort(new ManagedProcessError("timeout")),
      dependencies.config.jobTimeoutMs,
    );
    attemptTimeout.unref();

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
        outputPublished = true;
        await job.updateProgress(100);
        await removeVideoInput(dependencies.config, jobId);
        reachedTerminalState = true;
        return result;
      }

      const validated =
        job.data.operation === "social_share"
          ? await processSocialShareJob({
              config: dependencies.config,
              job,
              jobId,
              paths,
              signal: controller.signal,
            })
          : await processCompressionJob({
              config: dependencies.config,
              job,
              jobId,
              paths,
              signal: controller.signal,
            });

      await requestCancellation();
      if (controller.signal.aborted) throw new VideoProcessingError("canceled");
      await publishVideoOutput(dependencies.config, jobId);
      outputPublished = true;
      await job.updateProgress(100);
      await removeVideoInput(dependencies.config, jobId);
      reachedTerminalState = true;

      return {
        durationSeconds: validated.output.durationSeconds,
        outputSizeBytes: validated.outputSizeBytes,
      };
    } catch (error) {
      const processingError =
        controller.signal.reason instanceof ManagedProcessError &&
        controller.signal.reason.kind === "timeout"
          ? new VideoProcessingError("processing_failed", {
              cause: controller.signal.reason,
              retryable: true,
            })
          : normalizeProcessingError(error);
      const shouldRetry = processingError.retryable && attemptsRemaining(job);

      logWarning("video_job_processing_diagnostic", {
        attempt: job.attemptsMade + 1,
        diagnostic_code: managedProcessDiagnosticCode(processingError) ?? "processing_error",
        error_code: processingError.code,
        job_id: jobId,
        operation: safeJobOperation(job),
        progress: safeJobProgress(job),
        stage: safeFailureStage(job),
        will_retry: shouldRetry,
      });

      if (!outputPublished || !shouldRetry) await removeVideoOutput(dependencies.config, jobId);
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
      clearTimeout(attemptTimeout);
      if (cancellationInterval) clearInterval(cancellationInterval);
      if (reachedTerminalState) {
        await Promise.allSettled([
          clearVideoJobCancellation(dependencies.controlConnection, jobId),
          releaseVideoStorageReservation(dependencies.controlConnection, jobId),
        ]);
      }
    }
  };
