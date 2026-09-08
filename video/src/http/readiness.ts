import type { Redis } from "ioredis";
import type { VideoServiceConfig } from "../config/env.js";
import {
  type ManagedProcessDiagnosticCode,
  ManagedProcessError,
  runManagedProcess,
} from "../infra/ffmpeg/process.js";
import type { VideoQueue } from "../infra/queue/client.js";
import { assertStorageCapacity, ensureVideoStorage } from "../infra/storage/storage.js";

const READINESS_TIMEOUT_MS = 5_000;
const FFMPEG_CAPABILITY_STDOUT_LIMIT_BYTES = 2_097_152;
let ffmpegSocialRenderCapabilityCheck: Promise<void> | null = null;

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

const hasCapability = (output: string, capability: string) =>
  new RegExp(`(^|\\s)${capability}(\\s|$)`, "imu").test(output);

const assertCapability = (
  output: string,
  capability: string,
  diagnosticCode: ManagedProcessDiagnosticCode,
) => {
  if (!hasCapability(output, capability)) {
    throw new ManagedProcessError("failed", { diagnosticCode });
  }
};

const assertSocialRenderFilterCapabilities = (filters: string) => {
  assertCapability(filters, "drawtext", "ffmpeg_filter_drawtext_unavailable");
  assertCapability(filters, "scale", "ffmpeg_filter_scale_unavailable");
  assertCapability(filters, "drawbox", "ffmpeg_filter_drawbox_unavailable");

  const hasStandardBackground = hasCapability(filters, "crop") && hasCapability(filters, "overlay");
  const hasPortableBackground = hasCapability(filters, "pad");
  if (hasStandardBackground || hasPortableBackground) return;

  throw new ManagedProcessError("failed", {
    diagnosticCode: hasCapability(filters, "crop")
      ? "ffmpeg_filter_overlay_unavailable"
      : "ffmpeg_filter_pad_unavailable",
  });
};

const validateFfmpegSocialRenderCapabilities = (command: string) => {
  if (!ffmpegSocialRenderCapabilityCheck) {
    ffmpegSocialRenderCapabilityCheck = (async () => {
      const [filters, encoders] = await Promise.all([
        runManagedProcess({
          args: ["-hide_banner", "-filters"],
          command,
          maxStdoutBytes: FFMPEG_CAPABILITY_STDOUT_LIMIT_BYTES,
          timeoutMs: 5_000,
        }),
        runManagedProcess({
          args: ["-hide_banner", "-encoders"],
          command,
          maxStdoutBytes: FFMPEG_CAPABILITY_STDOUT_LIMIT_BYTES,
          timeoutMs: 5_000,
        }),
      ]);

      assertSocialRenderFilterCapabilities(filters);
      assertCapability(encoders, "libx264", "ffmpeg_encoder_h264_unavailable");
      assertCapability(encoders, "aac", "ffmpeg_encoder_aac_unavailable");
    })().catch((error) => {
      ffmpegSocialRenderCapabilityCheck = null;
      throw error;
    });
  }

  return ffmpegSocialRenderCapabilityCheck;
};

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
      validateFfmpegSocialRenderCapabilities(input.config.ffmpegPath),
    ]),
  );

  if (input.config.requireWorkerReady && (await withTimeout(input.queue.getWorkersCount())) < 1) {
    throw new Error("video_worker_unavailable");
  }
};
