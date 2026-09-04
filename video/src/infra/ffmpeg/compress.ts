import { stat } from "node:fs/promises";
import type { VideoServiceConfig } from "../../config/env.js";
import { VideoProcessingError } from "../../domain/jobs/contracts.js";
import { ManagedProcessError, runManagedProcess } from "./process.js";

export const buildCompressionArguments = (input: {
  config: VideoServiceConfig;
  inputPath: string;
  outputPath: string;
}) =>
  [
    "-hide_banner",
    "-nostdin",
    "-loglevel",
    "error",
    "-protocol_whitelist",
    "file,pipe",
    "-y",
    "-i",
    input.inputPath,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-map_metadata",
    "-1",
    "-map_chapters",
    "-1",
    "-vf",
    `scale=w='min(iw,${input.config.maxWidth})':h='min(ih,${input.config.maxHeight})':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1`,
    "-fpsmax",
    String(input.config.maxFps),
    "-c:v",
    "libx264",
    "-preset",
    input.config.ffmpegPreset,
    "-crf",
    String(input.config.ffmpegCrf),
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    `${input.config.audioBitrateKbps}k`,
    "-ar",
    "48000",
    "-ac",
    "2",
    "-movflags",
    "+faststart",
    "-max_muxing_queue_size",
    "1024",
    "-progress",
    "pipe:1",
    "-nostats",
    input.outputPath,
  ] as const;

const createProgressParser = (
  durationSeconds: number,
  onProgress: (percentage: number) => void,
) => {
  let pending = "";
  let lastProgress = 0;

  return (chunk: string) => {
    pending += chunk;
    const lines = pending.split(/\r?\n/u);
    pending = lines.pop() ?? "";

    for (const line of lines) {
      const match = /^out_time_us=(\d+)$/u.exec(line);
      if (!match) continue;
      const elapsedSeconds = Number(match[1]) / 1_000_000;
      const percentage = Math.min(
        99,
        Math.max(1, Math.floor((elapsedSeconds / durationSeconds) * 100)),
      );
      if (percentage >= lastProgress + 2) {
        lastProgress = percentage;
        onProgress(percentage);
      }
    }
  };
};

export const compressVideo = async (input: {
  config: VideoServiceConfig;
  durationSeconds: number;
  inputPath: string;
  onProgress: (percentage: number) => void;
  outputPath: string;
  signal?: AbortSignal;
}) => {
  const outputLimitController = new AbortController();
  const signal = input.signal
    ? AbortSignal.any([input.signal, outputLimitController.signal])
    : outputLimitController.signal;
  let exceededOutputLimit = false;

  const outputMonitor = setInterval(() => {
    void stat(input.outputPath)
      .then((information) => {
        if (information.size <= input.config.maxOutputBytes) return;
        exceededOutputLimit = true;
        outputLimitController.abort();
      })
      .catch(() => undefined);
  }, 1_000);
  outputMonitor.unref();

  try {
    await runManagedProcess({
      args: buildCompressionArguments(input),
      command: input.config.ffmpegPath,
      maxStdoutBytes: 4_194_304,
      onStdout: createProgressParser(input.durationSeconds, input.onProgress),
      signal,
      timeoutMs: input.config.jobTimeoutMs,
    });
  } catch (error) {
    if (exceededOutputLimit) {
      throw new VideoProcessingError("processing_failed", { cause: error });
    }
    if (error instanceof ManagedProcessError && error.kind === "aborted") {
      throw new VideoProcessingError("canceled", { cause: error });
    }
    if (error instanceof ManagedProcessError && error.kind === "timeout") {
      throw new VideoProcessingError("processing_failed", { cause: error, retryable: true });
    }
    throw new VideoProcessingError("processing_failed", { cause: error, retryable: true });
  } finally {
    clearInterval(outputMonitor);
  }
};
