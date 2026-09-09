import { access, stat } from "node:fs/promises";
import type { VideoServiceConfig } from "../../config/env.js";
import {
  type SocialShareRenderMetadata,
  VideoProcessingError,
} from "../../domain/jobs/contracts.js";
import { lectumLogoMarkDrawBoxes, roundedRectDrawBoxes } from "./drawbox-art.js";
import {
  type ManagedProcessDiagnosticCode,
  ManagedProcessError,
  runManagedProcess,
} from "./process.js";
import { isRemoteVideoHlsSource, remoteVideoRequestHeaders } from "./source-url.js";

const SOCIAL_OUTPUT_WIDTH = 1080;
const SOCIAL_OUTPUT_HEIGHT = 1920;
const SOCIAL_RENDER_CRF = 20;
const SOCIAL_RENDER_PRESET = "veryfast";
const SOCIAL_OUTPUT_FPS = 30;
const SOCIAL_DRAW_TEXT_FONT_FILE_CANDIDATES = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf",
  "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
  "/usr/share/fonts/dejavu/DejaVuSans.ttf",
] as const;
const SOCIAL_DRAW_TEXT_FONT_FILE = SOCIAL_DRAW_TEXT_FONT_FILE_CANDIDATES[0];
const SOCIAL_SHARE_ART_LAYOUT = {
  card: {
    bodyHeight: 266,
    bodyLineHeight: 68,
    bodyTextTopMinOffset: 54,
    cornerRadius: 24,
    headerFontSize: 42,
    headerHeight: 88,
    labelWidthFactor: 0.47,
    logoGap: 12,
    logoHeight: 29,
    logoWidth: 34,
    shadowOffset: 8,
    sourceFontSize: 56,
    sourceFontSizeCompact: 52,
    width: 860,
    x: 110,
    y: 250,
  },
  colors: {
    cardShadow: "black@0.18",
    header: "0x308ce8@0.98",
    headerText: "white",
    logo: "white@0.96",
    sourceText: "0x111827",
    surface: "white@0.96",
    verified: "0x308ce8",
  },
  professional: {
    checkGap: 10,
    checkMarkFontSize: 19,
    checkSize: 30,
    nameFontSize: 40,
    nameWidthFactor: 0.46,
    nameY: 1340,
    roleFontSize: 25,
    roleY: 1389,
  },
} as const;

type SocialShareSource =
  | {
      inputPath: string;
      kind: "file";
    }
  | {
      kind: "remote";
      requestOrigin?: string | null;
      sourceUrl: string;
    };

type SocialShareFilterMode = "portable" | "standard";

type SocialShareRenderOptions = {
  filterMode?: SocialShareFilterMode;
  fontFile?: string | null;
};

type SocialShareRenderVariant = {
  filterMode: SocialShareFilterMode;
  fontFile: string | null;
};

const NON_RETRYABLE_RENDER_DIAGNOSTICS = new Set<ManagedProcessDiagnosticCode>([
  "ffmpeg_encoder_aac_unavailable",
  "ffmpeg_encoder_h264_unavailable",
  "ffmpeg_encoder_open_failed",
  "ffmpeg_encoder_unavailable",
  "process_binary_not_executable",
  "process_binary_unavailable",
  "process_output_no_space",
  "process_permission_denied",
]);

const normalizeText = (value: string | null | undefined, fallback: string, maxLength: number) => {
  const normalized = String(value ?? "")
    .replace(/\s+/gu, " ")
    .trim();

  return (normalized || fallback).slice(0, maxLength);
};

const normalizeCardLabel = (value: string | null | undefined) => {
  const normalized = normalizeText(value, "Respondido na Lectum", 80);

  return normalized === "Perguntaram na Lectum" ? "Respondido na Lectum" : normalized;
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
    .replace(/,/gu, "\\,")
    .replace(/;/gu, "\\;")
    .replace(/'/gu, "\\'")
    .replace(/\[/gu, "\\[")
    .replace(/\]/gu, "\\]")
    .replace(/%/gu, "\\%");

const drawText = ({
  color,
  fontFile,
  fontSize,
  shadow = false,
  text,
  x,
  y,
}: {
  color: string;
  fontFile?: string | null;
  fontSize: number;
  shadow?: boolean;
  text: string;
  x: string | number;
  y: string | number;
}) =>
  `drawtext=${[
    `text='${escapeDrawText(text)}'`,
    ...(fontFile ? [`fontfile='${escapeDrawText(fontFile)}'`] : []),
    `x=${x}`,
    `y=${y}`,
    `fontsize=${fontSize}`,
    `fontcolor=${color}`,
    ...(shadow ? ["shadowcolor=black@0.28", "shadowx=0", "shadowy=2"] : []),
  ].join(":")}`;

const filterChain = (inputLabel: string, filters: readonly string[], outputLabel: string) =>
  `${inputLabel}${filters.join(",")}${outputLabel}`;

export const sanitizeSocialShareMetadata = (
  metadata: SocialShareRenderMetadata,
): SocialShareRenderMetadata => ({
  cardLabel: normalizeCardLabel(metadata.cardLabel),
  professionalName: normalizeText(metadata.professionalName, "Profissional Lectum", 90),
  professionalRoleLabel: normalizeText(metadata.professionalRoleLabel, "Psicólogo(a)", 48),
  professionalVerified: Boolean(metadata.professionalVerified),
  responseText: metadata.responseText ? normalizeText(metadata.responseText, "", 180) : null,
  sourceText: normalizeText(metadata.sourceText, "Conteúdo na Lectum", 180),
});

export const buildSocialShareFilter = (
  metadata: SocialShareRenderMetadata,
  _maxFps: number,
  options: SocialShareRenderOptions = {},
) => {
  const filterMode = options.filterMode ?? "standard";
  const fontFile = options.fontFile === undefined ? SOCIAL_DRAW_TEXT_FONT_FILE : options.fontFile;
  const sanitized = sanitizeSocialShareMetadata(metadata);
  const { card, colors, professional } = SOCIAL_SHARE_ART_LAYOUT;
  const sourceLines = wrapText(sanitized.sourceText, 31, 3);
  const sourceTextTop =
    card.y +
    card.headerHeight +
    Math.max(
      card.bodyTextTopMinOffset,
      Math.round((card.bodyHeight - sourceLines.length * card.bodyLineHeight) / 2),
    );
  const sourceTextFilters = sourceLines.map((line, index) =>
    drawText({
      color: colors.sourceText,
      fontFile,
      fontSize: sourceLines.length > 2 ? card.sourceFontSizeCompact : card.sourceFontSize,
      text: line,
      x: "(w-text_w)/2",
      y: sourceTextTop + index * card.bodyLineHeight,
    }),
  );
  const estimatedLabelWidth = Math.round(
    sanitized.cardLabel.length * card.headerFontSize * card.labelWidthFactor,
  );
  const labelGroupWidth = card.logoWidth + card.logoGap + estimatedLabelWidth;
  const labelLogoX = Math.round((SOCIAL_OUTPUT_WIDTH - labelGroupWidth) / 2);
  const labelLogoY = card.y + Math.round((card.headerHeight - card.logoHeight) / 2);
  const labelTextX = labelLogoX + card.logoWidth + card.logoGap;
  const labelTextY = card.y + Math.round((card.headerHeight - card.headerFontSize) / 2) - 2;
  const estimatedNameWidth = Math.round(
    sanitized.professionalName.length * professional.nameFontSize * professional.nameWidthFactor,
  );
  const professionalGroupWidth =
    estimatedNameWidth +
    (sanitized.professionalVerified ? professional.checkGap + professional.checkSize : 0);
  const professionalTextX = Math.max(
    64,
    Math.round((SOCIAL_OUTPUT_WIDTH - professionalGroupWidth) / 2),
  );
  const verifiedBadgeX = Math.min(
    SOCIAL_OUTPUT_WIDTH - professional.checkSize - 64,
    professionalTextX + estimatedNameWidth + professional.checkGap,
  );
  const verifiedBadgeY =
    professional.nameY + Math.round((professional.nameFontSize - professional.checkSize) / 2);
  const overlayFilters = [
    ...roundedRectDrawBoxes({
      color: colors.cardShadow,
      height: card.headerHeight + card.bodyHeight,
      radius: card.cornerRadius,
      width: card.width,
      x: card.x + card.shadowOffset,
      y: card.y + card.shadowOffset,
    }),
    ...roundedRectDrawBoxes({
      color: colors.header,
      corners: "top",
      height: card.headerHeight,
      radius: card.cornerRadius,
      width: card.width,
      x: card.x,
      y: card.y,
    }),
    ...roundedRectDrawBoxes({
      color: colors.surface,
      corners: "bottom",
      height: card.bodyHeight,
      radius: card.cornerRadius,
      width: card.width,
      x: card.x,
      y: card.y + card.headerHeight,
    }),
    ...lectumLogoMarkDrawBoxes({
      backgroundColor: colors.verified,
      color: colors.logo,
      height: card.logoHeight,
      width: card.logoWidth,
      x: labelLogoX,
      y: labelLogoY,
    }),
    drawText({
      color: colors.headerText,
      fontFile,
      fontSize: card.headerFontSize,
      text: sanitized.cardLabel,
      x: labelTextX,
      y: labelTextY,
    }),
    ...sourceTextFilters,
    drawText({
      color: "white",
      fontFile,
      fontSize: professional.nameFontSize,
      shadow: true,
      text: sanitized.professionalName,
      x: professionalTextX,
      y: professional.nameY,
    }),
    ...(sanitized.professionalVerified
      ? [
          ...roundedRectDrawBoxes({
            color: colors.verified,
            height: professional.checkSize,
            radius: Math.floor(professional.checkSize / 2),
            sliceHeight: 3,
            width: professional.checkSize,
            x: verifiedBadgeX,
            y: verifiedBadgeY,
          }),
          drawText({
            color: "white",
            fontFile,
            fontSize: professional.checkMarkFontSize,
            text: "\u2713",
            x: verifiedBadgeX + 6,
            y: verifiedBadgeY + 4,
          }),
        ]
      : []),
    drawText({
      color: "white",
      fontFile,
      fontSize: professional.roleFontSize,
      shadow: true,
      text: sanitized.professionalRoleLabel,
      x: professionalTextX,
      y: professional.roleY,
    }),
  ];

  if (filterMode === "portable") {
    return [
      `[0:v]scale=${SOCIAL_OUTPUT_WIDTH}:${SOCIAL_OUTPUT_HEIGHT}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${SOCIAL_OUTPUT_WIDTH}:${SOCIAL_OUTPUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black[v0]`,
      filterChain("[v0]", overlayFilters, "[v]"),
    ].join(";");
  }

  return [
    `[0:v]scale=${SOCIAL_OUTPUT_WIDTH}:${SOCIAL_OUTPUT_HEIGHT}:force_original_aspect_ratio=increase,crop=${SOCIAL_OUTPUT_WIDTH}:${SOCIAL_OUTPUT_HEIGHT}[v0]`,
    filterChain("[v0]", overlayFilters, "[v]"),
  ].join(";");
};

export const resolveSocialShareFontFile = async (
  candidates: readonly string[] = SOCIAL_DRAW_TEXT_FONT_FILE_CANDIDATES,
) => {
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next portable font location before letting FFmpeg use its default.
    }
  }

  return null;
};

export const buildSocialShareVideoArguments = (
  input: {
    config: VideoServiceConfig;
    metadata: SocialShareRenderMetadata;
    outputPath: string;
    source: SocialShareSource;
  },
  options: SocialShareRenderOptions = {},
) => {
  const inputArguments = (() => {
    if (input.source.kind !== "remote") {
      return ["-protocol_whitelist", "file,pipe", "-i", input.source.inputPath];
    }

    const requestHeaders = remoteVideoRequestHeaders(input.source.requestOrigin);

    return [
      "-protocol_whitelist",
      "file,http,https,tcp,tls,crypto",
      "-reconnect",
      "1",
      "-reconnect_streamed",
      "1",
      "-reconnect_delay_max",
      "5",
      ...(isRemoteVideoHlsSource(input.source.sourceUrl) ? ["-allowed_extensions", "ALL"] : []),
      ...(requestHeaders ? ["-headers", requestHeaders] : []),
      "-i",
      input.source.sourceUrl,
    ];
  })();

  return [
    "-hide_banner",
    "-nostdin",
    "-loglevel",
    "error",
    "-y",
    ...inputArguments,
    "-filter_complex",
    buildSocialShareFilter(input.metadata, input.config.maxFps, options),
    "-map",
    "[v]",
    "-map",
    "0:a:0?",
    "-r",
    String(Math.min(SOCIAL_OUTPUT_FPS, input.config.maxFps)),
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

const socialShareRenderVariants = (fontFile: string | null): SocialShareRenderVariant[] => [
  { filterMode: "standard", fontFile },
  { filterMode: "portable", fontFile },
  ...(fontFile
    ? ([
        { filterMode: "standard", fontFile: null },
        { filterMode: "portable", fontFile: null },
      ] satisfies SocialShareRenderVariant[])
    : []),
];

const shouldTryNextRenderVariant = ({
  emittedRenderProgress,
  error,
  signal,
}: {
  emittedRenderProgress: boolean;
  error: unknown;
  signal: AbortSignal;
}) => {
  if (emittedRenderProgress || signal.aborted) return false;
  if (!(error instanceof ManagedProcessError) || error.kind !== "failed") return false;

  return !NON_RETRYABLE_RENDER_DIAGNOSTICS.has(error.diagnosticCode);
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
    const resolvedFontFile = await resolveSocialShareFontFile();
    let lastError: unknown;
    const renderVariants = socialShareRenderVariants(resolvedFontFile);

    for (const [index, variant] of renderVariants.entries()) {
      let emittedRenderProgress = false;
      const progressParser = createProgressParser(input.durationSeconds, (percentage) => {
        emittedRenderProgress = true;
        input.onProgress(percentage);
      });

      try {
        await runManagedProcess({
          args: buildSocialShareVideoArguments(input, variant),
          command: input.config.ffmpegPath,
          maxStdoutBytes: 4_194_304,
          onStdout: progressParser,
          signal,
          timeoutMs: input.config.jobTimeoutMs,
        });
        return;
      } catch (error) {
        lastError = error;
        const hasNextVariant = index < renderVariants.length - 1;
        if (
          !hasNextVariant ||
          !shouldTryNextRenderVariant({ emittedRenderProgress, error, signal })
        ) {
          throw error;
        }
      }
    }

    throw lastError;
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
