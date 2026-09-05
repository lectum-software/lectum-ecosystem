import { stat } from "node:fs/promises";
import type { VideoServiceConfig } from "../../config/env.js";
import {
  type SocialShareRenderMetadata,
  VideoProcessingError,
} from "../../domain/jobs/contracts.js";
import { ManagedProcessError, runManagedProcess } from "./process.js";

const SOCIAL_OUTPUT_WIDTH = 1080;
const SOCIAL_OUTPUT_HEIGHT = 1920;
const SOCIAL_RENDER_CRF = 18;
const SOCIAL_RENDER_PRESET = "slow";
const SOCIAL_OUTPUT_FPS = 30;

type SocialShareSource =
  | {
      inputPath: string;
      kind: "file";
    }
  | {
      kind: "remote";
      sourceUrl: string;
    };

const normalizeText = (value: string | null | undefined, fallback: string, maxLength: number) => {
  const normalized = String(value ?? "")
    .replace(/\s+/gu, " ")
    .trim();

  return (normalized || fallback).slice(0, maxLength);
};

const wrapText = (value: string, maxLineLength: number, maxLines: number) => {
  const words = value.split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLineLength) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    current = word.slice(0, maxLineLength);
    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === 0) lines.push("Conteúdo na Lectum");

  const visible = lines.slice(0, maxLines);
  if (visible.length === maxLines && words.join(" ").length > visible.join(" ").length) {
    const lastLine = visible[maxLines - 1];
    if (lastLine) {
      visible[maxLines - 1] = `${lastLine.replace(/[.?!,\s]+$/u, "")}…`;
    }
  }

  return visible;
};

const escapeDrawText = (value: string) =>
  value
    .replace(/\\/gu, "\\\\")
    .replace(/:/gu, "\\:")
    .replace(/'/gu, "\\'")
    .replace(/\[/gu, "\\[")
    .replace(/\]/gu, "\\]")
    .replace(/%/gu, "\\%");

const drawText = ({
  color,
  fontSize,
  text,
  x,
  y,
}: {
  color: string;
  fontSize: number;
  text: string;
  x: string | number;
  y: string | number;
}) =>
  `drawtext=${[
    `text='${escapeDrawText(text)}'`,
    `x=${x}`,
    `y=${y}`,
    `fontsize=${fontSize}`,
    `fontcolor=${color}`,
    "shadowcolor=black@0.18",
    "shadowx=0",
    "shadowy=2",
  ].join(":")}`;

export const sanitizeSocialShareMetadata = (
  metadata: SocialShareRenderMetadata,
): SocialShareRenderMetadata => ({
  cardLabel: normalizeText(metadata.cardLabel, "Perguntaram na Lectum", 80),
  professionalName: normalizeText(metadata.professionalName, "Profissional Lectum", 90),
  professionalRoleLabel: normalizeText(metadata.professionalRoleLabel, "Psicólogo(a)", 48),
  professionalVerified: Boolean(metadata.professionalVerified),
  responseText: metadata.responseText ? normalizeText(metadata.responseText, "", 180) : null,
  sourceText: normalizeText(metadata.sourceText, "Conteúdo na Lectum", 180),
});

export const buildSocialShareFilter = (metadata: SocialShareRenderMetadata, maxFps: number) => {
  const sanitized = sanitizeSocialShareMetadata(metadata);
  const sourceLines = wrapText(sanitized.sourceText, 29, 3);
  const sourceTextFilters = sourceLines.map((line, index) =>
    drawText({
      color: "black",
      fontSize: sourceLines.length > 2 ? 52 : 58,
      text: line,
      x: "(w-text_w)/2",
      y: 224 + index * 72,
    }),
  );
  const name = sanitized.professionalVerified
    ? `${sanitized.professionalName} ✓`
    : sanitized.professionalName;
  const outputFps = Math.min(SOCIAL_OUTPUT_FPS, maxFps);

  return [
    `[0:v]scale=${SOCIAL_OUTPUT_WIDTH}:${SOCIAL_OUTPUT_HEIGHT}:force_original_aspect_ratio=increase,crop=${SOCIAL_OUTPUT_WIDTH}:${SOCIAL_OUTPUT_HEIGHT},gblur=sigma=22:steps=2,eq=brightness=-0.16:saturation=0.92,format=rgba[bg]`,
    `[0:v]scale=${SOCIAL_OUTPUT_WIDTH}:${SOCIAL_OUTPUT_HEIGHT}:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1[fg]`,
    "[bg][fg]overlay=(W-w)/2:(H-h)/2[v0]",
    [
      "[v0]",
      "drawbox=x=116:y=116:w=864:h=342:color=black@0.14:t=fill",
      "drawbox=x=104:y=96:w=864:h=342:color=white@0.94:t=fill",
      drawText({
        color: "0x1f6fff",
        fontSize: 39,
        text: sanitized.cardLabel,
        x: "(w-text_w)/2",
        y: 138,
      }),
      ...sourceTextFilters,
      drawText({
        color: "white",
        fontSize: 38,
        text: name,
        x: 72,
        y: "h-204",
      }),
      drawText({
        color: "white",
        fontSize: 31,
        text: sanitized.professionalRoleLabel,
        x: 72,
        y: "h-152",
      }),
      drawText({
        color: "white",
        fontSize: 68,
        text: "lectum",
        x: "w-text_w-72",
        y: "h-176",
      }),
      `fps=${outputFps}`,
      "format=yuv420p[v]",
    ].join(","),
  ].join(";");
};

export const buildSocialShareVideoArguments = (input: {
  config: VideoServiceConfig;
  metadata: SocialShareRenderMetadata;
  outputPath: string;
  source: SocialShareSource;
}) => {
  const inputArguments =
    input.source.kind === "remote"
      ? [
          "-protocol_whitelist",
          "file,http,https,tcp,tls,crypto",
          "-allowed_extensions",
          "ALL",
          "-reconnect",
          "1",
          "-reconnect_streamed",
          "1",
          "-reconnect_delay_max",
          "5",
          "-i",
          input.source.sourceUrl,
        ]
      : ["-protocol_whitelist", "file,pipe", "-i", input.source.inputPath];

  return [
    "-hide_banner",
    "-nostdin",
    "-loglevel",
    "error",
    "-y",
    ...inputArguments,
    "-filter_complex",
    buildSocialShareFilter(input.metadata, input.config.maxFps),
    "-map",
    "[v]",
    "-map",
    "0:a:0?",
    "-map_metadata",
    "-1",
    "-map_chapters",
    "-1",
    "-c:v",
    "libx264",
    "-preset",
    SOCIAL_RENDER_PRESET,
    "-crf",
    String(SOCIAL_RENDER_CRF),
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    `${Math.max(192, input.config.audioBitrateKbps)}k`,
    "-ar",
    "48000",
    "-ac",
    "2",
    "-shortest",
    "-movflags",
    "+faststart",
    "-max_muxing_queue_size",
    "2048",
    "-progress",
    "pipe:1",
    "-nostats",
    input.outputPath,
  ] as const;
};

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
        Math.max(4, Math.floor((elapsedSeconds / durationSeconds) * 100)),
      );
      if (percentage >= lastProgress + 2) {
        lastProgress = percentage;
        onProgress(percentage);
      }
    }
  };
};

export const renderSocialShareVideo = async (input: {
  config: VideoServiceConfig;
  durationSeconds: number;
  metadata: SocialShareRenderMetadata;
  onProgress: (percentage: number) => void;
  outputPath: string;
  signal?: AbortSignal;
  source: SocialShareSource;
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
      args: buildSocialShareVideoArguments(input),
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
