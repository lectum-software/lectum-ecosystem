import type { Redis } from "ioredis";
import type { VideoServiceConfig } from "../config/env.js";
import { runManagedProcess } from "../infra/ffmpeg/process.js";
import type { VideoQueue } from "../infra/queue/client.js";
import { assertStorageCapacity, ensureVideoStorage } from "../infra/storage/storage.js";

const READINESS_TIMEOUT_MS = 5_000;

const withTimeout = async <T>(operation: Promise<T>): Promise<T> => {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("readiness_timeout")), READINESS_TIMEOUT_MS);
        timeout.unref();
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const validateBinary = (command: string) =>
  runManagedProcess({ args: ["-version"], command, maxStdoutBytes: 65_536, timeoutMs: 5_000 });

export const assertVideoApiReady = async (input: {
  config: VideoServiceConfig;
  connection: Redis;
  queue: VideoQueue;
}) => {
  await withTimeout(ensureVideoStorage(input.config));
  await withTimeout(
    Promise.all([
      input.connection.ping(),
      assertStorageCapacity(input.config),
      validateBinary(input.config.ffmpegPath),
      validateBinary(input.config.ffprobePath),
    ]),
  );

  if (input.config.requireWorkerReady && (await withTimeout(input.queue.getWorkersCount())) < 1) {
    throw new Error("video_worker_unavailable");
  }
};
