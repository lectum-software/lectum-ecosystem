import "dotenv/config";
import { pathToFileURL } from "node:url";
import { Worker } from "bullmq";
import { parseVideoServiceConfig } from "./config/env.js";
import {
  type VIDEO_JOB_NAME,
  VIDEO_QUEUE_NAME,
  type VideoJobData,
  type VideoJobResult,
} from "./domain/jobs/contracts.js";
import { logError, logInfo, logWarning } from "./http/logging.js";
import { createRedisConnection, createVideoQueue } from "./infra/queue/client.js";
import { activeVideoJobIds } from "./infra/queue/jobs.js";
import { cleanupExpiredVideoStorage, ensureVideoStorage } from "./infra/storage/storage.js";
import { createVideoJobProcessor } from "./worker-processor.js";

const safeJobOperation = (job: { data?: Partial<VideoJobData> } | null | undefined) => {
  const operation = job?.data?.operation;
  return operation === "compress" || operation === "social_share" ? operation : "unknown";
};

const safeJobProgress = (job: { progress?: unknown } | null | undefined): number | undefined =>
  typeof job?.progress === "number" ? job.progress : undefined;

const safeFailureStage = (job: { data?: Partial<VideoJobData>; progress?: unknown }) => {
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

export type StartedVideoWorkerRuntime = {
  shutdown: () => Promise<void>;
};

type StartVideoWorkerRuntimeOptions = {
  registerSignals?: boolean;
};

const isDirectEntrypoint = () => {
  const entrypoint = process.argv[1];
  return entrypoint ? import.meta.url === pathToFileURL(entrypoint).href : false;
};

export const startVideoWorkerRuntime = async (
  options: StartVideoWorkerRuntimeOptions = {},
): Promise<StartedVideoWorkerRuntime> => {
  const config = parseVideoServiceConfig(process.env);
  const workerConnection = createRedisConnection(config, "worker");
  const controlConnection = createRedisConnection(config, "worker");
  const queueConnection = createRedisConnection(config, "api");
  await Promise.all([
    workerConnection.connect(),
    controlConnection.connect(),
    queueConnection.connect(),
  ]);
  const queue = createVideoQueue(config, queueConnection);
  await queue.waitUntilReady();
  await ensureVideoStorage(config);

  const worker = new Worker<VideoJobData, VideoJobResult, typeof VIDEO_JOB_NAME>(
    VIDEO_QUEUE_NAME,
    createVideoJobProcessor({ config, controlConnection }),
    {
      concurrency: config.workerConcurrency,
      connection: workerConnection,
      lockDuration: 60_000,
      maxStalledCount: 1,
      stalledInterval: 30_000,
    },
  );

  worker.on("completed", (job) => {
    logInfo("video_job_completed", { job_id: String(job.id), operation: safeJobOperation(job) });
  });
  worker.on("active", (job) => {
    logInfo("video_job_started", { job_id: String(job.id), operation: safeJobOperation(job) });
  });
  worker.on("failed", (job) => {
    logWarning("video_job_failed", {
      error_code:
        job?.failedReason === "canceled" || job?.failedReason === "invalid_video"
          ? job.failedReason
          : "processing_failed",
      job_id: job?.id ? String(job.id) : undefined,
      operation: safeJobOperation(job),
      progress: safeJobProgress(job),
      stage: job ? safeFailureStage(job) : undefined,
    });
  });
  worker.on("error", () => {
    logError("video_worker_error", { error_code: "worker_error" });
  });

  await worker.waitUntilReady();

  let cleanupRunning = false;
  const runCleanup = async () => {
    if (cleanupRunning) return;
    cleanupRunning = true;
    try {
      const active = await activeVideoJobIds(queue);
      const removed = await cleanupExpiredVideoStorage({ activeJobIds: active, config });
      if (removed.incoming + removed.outputs > 0) {
        logInfo("video_storage_cleanup_completed", {
          operation: "cleanup",
          status: "removed",
        });
      }
    } catch {
      logWarning("video_storage_cleanup_failed", {
        error_code: "cleanup_failed",
        operation: "cleanup",
      });
    } finally {
      cleanupRunning = false;
    }
  };

  await runCleanup();
  const cleanupInterval = setInterval(
    () => void runCleanup(),
    config.cleanupIntervalSeconds * 1000,
  );
  cleanupInterval.unref();

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearInterval(cleanupInterval);
    logInfo("video_worker_shutdown_started");

    const forceExit = setTimeout(() => {
      logError("video_worker_shutdown_timeout", { error_code: "shutdown_timeout" });
      process.exit(1);
    }, config.gracefulShutdownMs);
    forceExit.unref();

    await worker.close().catch(() => undefined);
    await Promise.allSettled([
      queue.close(),
      controlConnection.quit(),
      queueConnection.quit(),
      workerConnection.quit(),
    ]);
    clearTimeout(forceExit);
    logInfo("video_worker_shutdown_completed");
  };

  if (options.registerSignals ?? true) {
    process.once("SIGINT", () => void shutdown());
    process.once("SIGTERM", () => void shutdown());
  }
  logInfo("video_worker_started", { operation: "worker", status: "ready" });

  return { shutdown };
};

if (isDirectEntrypoint()) {
  startVideoWorkerRuntime().catch(() => {
    logError("video_worker_start_failed", { error_code: "startup_failed" });
    process.exitCode = 1;
  });
}
