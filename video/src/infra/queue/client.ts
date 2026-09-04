import { Queue } from "bullmq";
import { Redis } from "ioredis";
import type { VideoServiceConfig } from "../../config/env.js";
import {
  type VIDEO_JOB_NAME,
  VIDEO_QUEUE_NAME,
  type VideoJobData,
  type VideoJobResult,
} from "../../domain/jobs/contracts.js";
import { logWarning } from "../../http/logging.js";

export type VideoQueue = Queue<VideoJobData, VideoJobResult, typeof VIDEO_JOB_NAME>;

export const createRedisConnection = (config: VideoServiceConfig, role: "api" | "worker") => {
  const connection = new Redis(config.redisUrl, {
    connectTimeout: 10_000,
    enableOfflineQueue: false,
    keepAlive: 10_000,
    lazyConnect: true,
    maxRetriesPerRequest: role === "worker" ? null : 1,
  });

  connection.on("error", () => {
    logWarning("video_redis_connection_error", { operation: role });
  });

  return connection;
};

export const createVideoQueue = (config: VideoServiceConfig, connection: Redis): VideoQueue =>
  new Queue<VideoJobData, VideoJobResult, typeof VIDEO_JOB_NAME>(VIDEO_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: config.jobAttempts,
      backoff: { delay: 5_000, type: "exponential" },
      keepLogs: 0,
      removeOnComplete: { age: config.outputTtlSeconds, count: 5_000 },
      removeOnFail: { age: config.outputTtlSeconds, count: 5_000 },
      sizeLimit: 4_096,
      stackTraceLimit: 1,
    },
  });
