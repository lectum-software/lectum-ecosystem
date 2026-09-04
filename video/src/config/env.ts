import path from "node:path";
import { z } from "zod";

const PRESETS = ["veryslow", "slower", "slow", "medium", "fast", "faster", "veryfast"] as const;
const MEBIBYTE = 1024 * 1024;

const booleanFromEnvironment = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");

const integerFromEnvironment = (minimum: number, maximum: number, fallback: number) =>
  z.coerce.number().int().min(minimum).max(maximum).default(fallback);

const binaryPath = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .regex(/^[a-zA-Z0-9_./-]+$/, "caminho de binário inválido");

const environmentSchema = z
  .object({
    HOST: z.string().trim().min(1).max(253).default("0.0.0.0"),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: integerFromEnvironment(1, 65_535, 3003),
    REDIS_URL: z
      .string()
      .trim()
      .url()
      .refine((value) => value.startsWith("redis://") || value.startsWith("rediss://"), {
        message: "REDIS_URL deve usar redis:// ou rediss://",
      }),
    VIDEO_AUDIO_BITRATE_KBPS: integerFromEnvironment(64, 320, 128),
    VIDEO_CANCELLATION_POLL_MS: integerFromEnvironment(250, 5_000, 750),
    VIDEO_CLEANUP_INTERVAL_SECONDS: integerFromEnvironment(60, 86_400, 900),
    VIDEO_FFMPEG_CRF: integerFromEnvironment(18, 32, 23),
    VIDEO_FFMPEG_PATH: binaryPath.default("ffmpeg"),
    VIDEO_FFMPEG_PRESET: z.enum(PRESETS).default("medium"),
    VIDEO_FFPROBE_PATH: binaryPath.default("ffprobe"),
    VIDEO_GRACEFUL_SHUTDOWN_MS: integerFromEnvironment(5_000, 120_000, 30_000),
    VIDEO_JOB_ATTEMPTS: integerFromEnvironment(1, 5, 3),
    VIDEO_JOB_TIMEOUT_MS: integerFromEnvironment(60_000, 14_400_000, 7_200_000),
    VIDEO_MAX_DURATION_SECONDS: integerFromEnvironment(1, 21_600, 1_800),
    VIDEO_MAX_FPS: integerFromEnvironment(12, 60, 30),
    VIDEO_MAX_HEIGHT: integerFromEnvironment(240, 4_320, 1_920),
    VIDEO_MAX_INPUT_MB: integerFromEnvironment(1, 2_048, 500),
    VIDEO_MAX_OUTPUT_MB: integerFromEnvironment(1, 2_048, 500),
    VIDEO_MAX_QUEUED_JOBS: integerFromEnvironment(1, 10_000, 100),
    VIDEO_MAX_WIDTH: integerFromEnvironment(240, 4_320, 1_080),
    VIDEO_MIN_FREE_SPACE_MB: integerFromEnvironment(128, 1_048_576, 1_024),
    VIDEO_OUTPUT_TTL_SECONDS: integerFromEnvironment(300, 2_592_000, 86_400),
    VIDEO_REQUIRE_WORKER_READY: booleanFromEnvironment,
    VIDEO_SERVICE_API_KEY: z.string().min(32).max(512),
    VIDEO_STALE_INPUT_TTL_SECONDS: integerFromEnvironment(300, 604_800, 21_600),
    VIDEO_STORAGE_RESERVATION_TTL_SECONDS: integerFromEnvironment(3_600, 2_592_000, 604_800),
    VIDEO_STORAGE_ROOT: z.string().trim().min(1).max(1_024).optional(),
    VIDEO_UPLOAD_REQUEST_TIMEOUT_MS: integerFromEnvironment(60_000, 7_200_000, 1_800_000),
    VIDEO_WORKER_CONCURRENCY: integerFromEnvironment(1, 16, 1),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === "production") {
      if (!environment.VIDEO_STORAGE_ROOT || !path.isAbsolute(environment.VIDEO_STORAGE_ROOT)) {
        context.addIssue({
          code: "custom",
          message: "VIDEO_STORAGE_ROOT absoluta é obrigatória em produção",
          path: ["VIDEO_STORAGE_ROOT"],
        });
      } else if (
        path.resolve(environment.VIDEO_STORAGE_ROOT) ===
        path.parse(path.resolve(environment.VIDEO_STORAGE_ROOT)).root
      ) {
        context.addIssue({
          code: "custom",
          message: "VIDEO_STORAGE_ROOT não pode ser a raiz do filesystem",
          path: ["VIDEO_STORAGE_ROOT"],
        });
      }

      try {
        const redisUrl = new URL(environment.REDIS_URL);
        if (!redisUrl.password) {
          context.addIssue({
            code: "custom",
            message: "REDIS_URL deve possuir autenticação em produção",
            path: ["REDIS_URL"],
          });
        }
      } catch {
        // A validação base já relata URL ou protocolo inválido sem repetir detalhes.
      }
    }

    const minimumReservationSeconds =
      Math.ceil(environment.VIDEO_UPLOAD_REQUEST_TIMEOUT_MS / 1_000) +
      Math.ceil(environment.VIDEO_JOB_TIMEOUT_MS / 1_000) * environment.VIDEO_JOB_ATTEMPTS +
      300;
    if (environment.VIDEO_STORAGE_RESERVATION_TTL_SECONDS < minimumReservationSeconds) {
      context.addIssue({
        code: "custom",
        message: "a reserva de storage deve cobrir todas as tentativas do job",
        path: ["VIDEO_STORAGE_RESERVATION_TTL_SECONDS"],
      });
    }
  });

export type VideoServiceConfig = {
  apiKey: string;
  audioBitrateKbps: number;
  cancellationPollMs: number;
  cleanupIntervalSeconds: number;
  ffmpegCrf: number;
  ffmpegPath: string;
  ffmpegPreset: (typeof PRESETS)[number];
  ffprobePath: string;
  gracefulShutdownMs: number;
  host: string;
  jobAttempts: number;
  jobTimeoutMs: number;
  maxDurationSeconds: number;
  maxFps: number;
  maxHeight: number;
  maxInputBytes: number;
  maxOutputBytes: number;
  maxQueuedJobs: number;
  maxWidth: number;
  minFreeSpaceBytes: number;
  nodeEnvironment: "development" | "test" | "production";
  outputTtlSeconds: number;
  port: number;
  redisUrl: string;
  requireWorkerReady: boolean;
  staleInputTtlSeconds: number;
  storageReservationTtlSeconds: number;
  storageRoot: string;
  uploadRequestTimeoutMs: number;
  workerConcurrency: number;
};

export const parseVideoServiceConfig = (
  environment: NodeJS.ProcessEnv,
  currentWorkingDirectory = process.cwd(),
): VideoServiceConfig => {
  const parsed = environmentSchema.parse(environment);
  const storageRoot = path.resolve(
    parsed.VIDEO_STORAGE_ROOT ?? path.join(currentWorkingDirectory, ".data"),
  );

  return {
    apiKey: parsed.VIDEO_SERVICE_API_KEY,
    audioBitrateKbps: parsed.VIDEO_AUDIO_BITRATE_KBPS,
    cancellationPollMs: parsed.VIDEO_CANCELLATION_POLL_MS,
    cleanupIntervalSeconds: parsed.VIDEO_CLEANUP_INTERVAL_SECONDS,
    ffmpegCrf: parsed.VIDEO_FFMPEG_CRF,
    ffmpegPath: parsed.VIDEO_FFMPEG_PATH,
    ffmpegPreset: parsed.VIDEO_FFMPEG_PRESET,
    ffprobePath: parsed.VIDEO_FFPROBE_PATH,
    gracefulShutdownMs: parsed.VIDEO_GRACEFUL_SHUTDOWN_MS,
    host: parsed.HOST,
    jobAttempts: parsed.VIDEO_JOB_ATTEMPTS,
    jobTimeoutMs: parsed.VIDEO_JOB_TIMEOUT_MS,
    maxDurationSeconds: parsed.VIDEO_MAX_DURATION_SECONDS,
    maxFps: parsed.VIDEO_MAX_FPS,
    maxHeight: parsed.VIDEO_MAX_HEIGHT,
    maxInputBytes: parsed.VIDEO_MAX_INPUT_MB * MEBIBYTE,
    maxOutputBytes: parsed.VIDEO_MAX_OUTPUT_MB * MEBIBYTE,
    maxQueuedJobs: parsed.VIDEO_MAX_QUEUED_JOBS,
    maxWidth: parsed.VIDEO_MAX_WIDTH,
    minFreeSpaceBytes: parsed.VIDEO_MIN_FREE_SPACE_MB * MEBIBYTE,
    nodeEnvironment: parsed.NODE_ENV,
    outputTtlSeconds: parsed.VIDEO_OUTPUT_TTL_SECONDS,
    port: parsed.PORT,
    redisUrl: parsed.REDIS_URL,
    requireWorkerReady: parsed.VIDEO_REQUIRE_WORKER_READY,
    staleInputTtlSeconds: parsed.VIDEO_STALE_INPUT_TTL_SECONDS,
    storageReservationTtlSeconds: parsed.VIDEO_STORAGE_RESERVATION_TTL_SECONDS,
    storageRoot,
    uploadRequestTimeoutMs: parsed.VIDEO_UPLOAD_REQUEST_TIMEOUT_MS,
    workerConcurrency: parsed.VIDEO_WORKER_CONCURRENCY,
  };
};
