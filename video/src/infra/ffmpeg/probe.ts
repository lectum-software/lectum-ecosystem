import { stat } from "node:fs/promises";
import { z } from "zod";
import type { VideoServiceConfig } from "../../config/env.js";
import { VideoProcessingError } from "../../domain/jobs/contracts.js";
import { ManagedProcessError, runManagedProcess } from "./process.js";

const probePayloadSchema = z.object({
  format: z
    .object({
      duration: z.string().optional(),
      format_name: z.string().optional(),
    })
    .optional(),
  streams: z.array(
    z.object({
      codec_name: z.string().optional(),
      codec_type: z.string().optional(),
      duration: z.string().optional(),
      height: z.number().int().positive().optional(),
      width: z.number().int().positive().optional(),
    }),
  ),
});

export type VideoProbe = {
  audioCodec: string | null;
  durationSeconds: number;
  formatNames: ReadonlySet<string>;
  hasAudio: boolean;
  height: number;
  videoCodec: string;
  width: number;
};

const durationFrom = (payload: z.infer<typeof probePayloadSchema>) => {
  const formatDuration = Number(payload.format?.duration);
  if (Number.isFinite(formatDuration) && formatDuration > 0) return formatDuration;

  const streamDuration = payload.streams
    .map((stream) => Number(stream.duration))
    .find((duration) => Number.isFinite(duration) && duration > 0);
  return streamDuration ?? Number.NaN;
};

const parseProbe = (stdout: string): VideoProbe => {
  const payload = probePayloadSchema.parse(JSON.parse(stdout));
  const video = payload.streams.find((stream) => stream.codec_type === "video");
  const audio = payload.streams.find((stream) => stream.codec_type === "audio");
  const durationSeconds = durationFrom(payload);
  if (
    !video?.codec_name ||
    !video.width ||
    !video.height ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    throw new Error("video_probe_invalid");
  }

  return {
    audioCodec: audio?.codec_name?.toLowerCase() ?? null,
    durationSeconds,
    formatNames: new Set(
      (payload.format?.format_name ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
    hasAudio: Boolean(audio),
    height: video.height,
    videoCodec: video.codec_name.toLowerCase(),
    width: video.width,
  };
};

export const probeVideo = async (
  config: VideoServiceConfig,
  filePath: string,
  signal?: AbortSignal,
): Promise<VideoProbe> => {
  try {
    const stdout = await runManagedProcess({
      args: [
        "-v",
        "error",
        "-protocol_whitelist",
        "file,pipe",
        "-show_entries",
        "format=format_name,duration:stream=codec_type,codec_name,width,height,duration",
        "-of",
        "json",
        filePath,
      ],
      command: config.ffprobePath,
      maxStdoutBytes: 1_048_576,
      ...(signal ? { signal } : {}),
      timeoutMs: Math.min(60_000, config.jobTimeoutMs),
    });
    return parseProbe(stdout);
  } catch (error) {
    if (error instanceof ManagedProcessError && error.kind === "aborted") {
      throw new VideoProcessingError("canceled", { cause: error });
    }
    throw new VideoProcessingError("invalid_video", { cause: error });
  }
};

export const validateInputProbe = (config: VideoServiceConfig, probe: VideoProbe) => {
  const supportedContainer =
    probe.formatNames.has("mov") ||
    probe.formatNames.has("mp4") ||
    probe.formatNames.has("matroska") ||
    probe.formatNames.has("webm");
  const sourcePixels = probe.width * probe.height;

  if (
    !supportedContainer ||
    probe.durationSeconds > config.maxDurationSeconds ||
    probe.width > 8_192 ||
    probe.height > 8_192 ||
    sourcePixels > 40_000_000
  ) {
    throw new VideoProcessingError("invalid_video");
  }
};

export const validateOutputProbe = async (input: {
  config: VideoServiceConfig;
  filePath: string;
  source: VideoProbe;
  signal?: AbortSignal;
}) => {
  let output: VideoProbe;
  let information: Awaited<ReturnType<typeof stat>>;
  try {
    [output, information] = await Promise.all([
      probeVideo(input.config, input.filePath, input.signal),
      stat(input.filePath),
    ]);
  } catch (error) {
    if (error instanceof VideoProcessingError && error.code === "canceled") throw error;
    throw new VideoProcessingError("processing_failed", { cause: error });
  }
  const durationDelta = Math.abs(output.durationSeconds - input.source.durationSeconds);
  const durationTolerance = Math.max(2, input.source.durationSeconds * 0.03);

  if (!output.formatNames.has("mov") && !output.formatNames.has("mp4")) {
    throw new VideoProcessingError("processing_failed");
  }
  if (
    output.videoCodec !== "h264" ||
    (input.source.hasAudio && (!output.hasAudio || output.audioCodec !== "aac")) ||
    (!input.source.hasAudio && output.hasAudio) ||
    output.width > input.config.maxWidth ||
    output.height > input.config.maxHeight ||
    durationDelta > durationTolerance ||
    information.size <= 0 ||
    information.size > input.config.maxOutputBytes
  ) {
    throw new VideoProcessingError("processing_failed");
  }

  return { output, outputSizeBytes: information.size };
};

export const validatePublishedOutput = async (
  config: VideoServiceConfig,
  filePath: string,
  signal?: AbortSignal,
) => {
  let output: VideoProbe;
  let information: Awaited<ReturnType<typeof stat>>;
  try {
    [output, information] = await Promise.all([
      probeVideo(config, filePath, signal),
      stat(filePath),
    ]);
  } catch (error) {
    if (error instanceof VideoProcessingError && error.code === "canceled") throw error;
    throw new VideoProcessingError("processing_failed", { cause: error });
  }

  if (
    (!output.formatNames.has("mov") && !output.formatNames.has("mp4")) ||
    output.videoCodec !== "h264" ||
    (output.hasAudio && output.audioCodec !== "aac") ||
    output.width > config.maxWidth ||
    output.height > config.maxHeight ||
    information.size <= 0 ||
    information.size > config.maxOutputBytes
  ) {
    throw new VideoProcessingError("processing_failed");
  }

  return { durationSeconds: output.durationSeconds, outputSizeBytes: information.size };
};
