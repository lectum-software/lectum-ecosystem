import { stat } from "node:fs/promises";
import type { VideoServiceConfig } from "../../config/env.js";
import {
  type SocialShareRenderMetadata,
  VideoProcessingError,
} from "../../domain/jobs/contracts.js";
import { lectumLogoMarkDrawBoxes, roundedRectDrawBoxes } from "./drawbox-art.js";
import { drawText } from "./drawtext.js";
import {
  type ManagedProcessDiagnosticCode,
  ManagedProcessError,
  runManagedProcess,
} from "./process.js";
import {
  resolveSocialShareAssetFile,
  resolveSocialShareFontFile,
  resolveSocialShareRegularFontFile,
  SOCIAL_DRAW_TEXT_FONT_FILE,
  SOCIAL_DRAW_TEXT_REGULAR_FONT_FILE,
  SOCIAL_SHARE_CARD_BACKGROUND_FILE_NAME,
  SOCIAL_SHARE_LOGO_FILE_NAME,
  SOCIAL_SHARE_VERIFIED_BADGE_FILE_NAME,
} from "./social-share-assets.js";
import { SOCIAL_SHARE_ART_LAYOUT } from "./social-share-layout.js";
import { measureSocialShareProfessionalName } from "./social-share-name-metrics.js";
import {
  SOCIAL_OUTPUT_HEIGHT,
  SOCIAL_OUTPUT_WIDTH,
  socialShareOutputSizeArguments,
} from "./social-share-output.js";
import {
  normalizeCardLabel,
  normalizeOptionalResponseText,
  normalizeProfessionalName,
  normalizeProfessionalRoleLabel,
  normalizeSocialShareSourceText,
  wrapText,
} from "./social-share-text.js";
import { isRemoteVideoHlsSource, remoteVideoRequestHeaders } from "./source-url.js";

const SOCIAL_RENDER_CRF = 20;
const SOCIAL_RENDER_PRESET = "veryfast";
const SOCIAL_OUTPUT_FPS = 30;

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
  professionalNameLayout: { width: number; fontSize: number };
  cardBackgroundFile?: string | null;
  filterMode?: SocialShareFilterMode;
  fontFile?: string | null;
  logoFile?: string | null;
  regularFontFile?: string | null;
  verifiedBadgeFile?: string | null;
};

type SocialShareRenderVariant = {
  cardBackgroundFile: string | null;
  filterMode: SocialShareFilterMode;
  fontFile: string | null;
  logoFile: string | null;
  regularFontFile: string | null;
  verifiedBadgeFile: string | null;
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

const filterChain = (inputLabel: string, filters: readonly string[], outputLabel: string) =>
  `${inputLabel}${filters.join(",")}${outputLabel}`;

export const sanitizeSocialShareMetadata = (
  metadata: SocialShareRenderMetadata,
): SocialShareRenderMetadata => ({
  cardLabel: normalizeCardLabel(metadata.cardLabel),
  professionalName: normalizeProfessionalName(metadata.professionalName),
  professionalRoleLabel: normalizeProfessionalRoleLabel(metadata.professionalRoleLabel),
  professionalVerified: Boolean(metadata.professionalVerified),
  responseText: normalizeOptionalResponseText(metadata.responseText),
  sourceText: normalizeSocialShareSourceText(metadata.sourceText),
});

export const buildSocialShareFilter = (
  metadata: SocialShareRenderMetadata,
  _maxFps: number,
  options: SocialShareRenderOptions,
) => {
  const filterMode = options.filterMode ?? "standard";
  const fontFile = options.fontFile === undefined ? SOCIAL_DRAW_TEXT_FONT_FILE : options.fontFile;
  const regularFontFile =
    options.regularFontFile === undefined
      ? options.fontFile === undefined
        ? SOCIAL_DRAW_TEXT_REGULAR_FONT_FILE
        : options.fontFile
      : options.regularFontFile;
  const logoFile =
    options.logoFile === undefined
      ? resolveSocialShareAssetFile(SOCIAL_SHARE_LOGO_FILE_NAME)
      : options.logoFile;
  const cardBackgroundFile =
    filterMode === "standard"
      ? options.cardBackgroundFile === undefined
        ? resolveSocialShareAssetFile(SOCIAL_SHARE_CARD_BACKGROUND_FILE_NAME)
        : options.cardBackgroundFile
      : null;
  const verifiedBadgeFile =
    options.verifiedBadgeFile === undefined
      ? resolveSocialShareAssetFile(SOCIAL_SHARE_VERIFIED_BADGE_FILE_NAME)
      : options.verifiedBadgeFile;
  const sanitized = sanitizeSocialShareMetadata(metadata);
  const { card, colors, professional } = SOCIAL_SHARE_ART_LAYOUT;
  const sourceLines = wrapText(sanitized.sourceText, card.sourceMaxLineLength, 3);
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
  const labelLogoY =
    card.y + Math.round((card.headerHeight - card.logoHeight) / 2) + card.logoOffsetY;
  const labelTextX = labelLogoX + card.logoWidth + card.logoGap;
  const labelTextY = card.y + Math.round((card.headerHeight - card.headerFontSize) / 2) - 1;
  const { width: nameWidth, fontSize: nameFontSize } = options.professionalNameLayout;
  const professionalGroupWidth =
    nameWidth +
    (sanitized.professionalVerified ? professional.checkGap + professional.badgeWidth : 0);
  const professionalTextX = Math.max(
    64,
    Math.round((SOCIAL_OUTPUT_WIDTH - professionalGroupWidth) / 2),
  );
  const verifiedBadgeX = professionalTextX + nameWidth + professional.checkGap;
  const verifiedBadgeY =
    professional.nameY + Math.round((professional.nameFontSize - professional.badgeHeight) / 2);
  const hasCardBackgroundAsset = Boolean(cardBackgroundFile);
  const hasLogoAsset = Boolean(logoFile);
  const hasVerifiedBadgeAsset = sanitized.professionalVerified && Boolean(verifiedBadgeFile);
  let nextAssetInputIndex = 1;
  const cardBackgroundInputIndex = hasCardBackgroundAsset ? nextAssetInputIndex++ : null;
  const logoInputIndex = hasLogoAsset ? nextAssetInputIndex++ : null;
  const verifiedBadgeInputIndex = hasVerifiedBadgeAsset ? nextAssetInputIndex++ : null;
  const overlayFilters = [
    ...(hasCardBackgroundAsset
      ? []
      : [
          ...roundedRectDrawBoxes({
            color: colors.header,
            corners: "top",
            height: card.headerHeight,
            radius: card.cornerRadius,
            sliceHeight: 1,
            width: card.width,
            x: card.x,
            y: card.y,
          }),
          ...roundedRectDrawBoxes({
            color: colors.surface,
            corners: "bottom",
            height: card.bodyHeight,
            radius: card.cornerRadius,
            sliceHeight: 1,
            width: card.width,
            x: card.x,
            y: card.y + card.headerHeight,
          }),
        ]),
    ...(hasLogoAsset
      ? []
      : lectumLogoMarkDrawBoxes({
          backgroundColor: colors.verified,
          color: colors.logo,
          height: card.logoHeight,
          width: card.logoWidth,
          x: labelLogoX,
          y: labelLogoY,
        })),
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
      fontSize: nameFontSize,
      shadow: true,
      text: sanitized.professionalName,
      x: professionalTextX,
      y: professional.nameY,
    }),
    ...(sanitized.professionalVerified
      ? hasVerifiedBadgeAsset
        ? []
        : [
            ...roundedRectDrawBoxes({
              color: colors.verified,
              height: professional.badgeHeight,
              radius: Math.floor(professional.badgeHeight / 2),
              sliceHeight: 3,
              width: professional.badgeWidth,
              x: verifiedBadgeX,
              y: verifiedBadgeY,
            }),
            drawText({
              color: "white",
              fontFile,
              fontSize: professional.checkMarkFontSize,
              text: "\u2713",
              x: verifiedBadgeX + 5,
              y: verifiedBadgeY + 3,
            }),
          ]
      : []),
    drawText({
      color: "white@0.93",
      fontFile: regularFontFile,
      fontSize: professional.roleFontSize,
      shadow: true,
      text: sanitized.professionalRoleLabel,
      x: professionalTextX,
      y: professional.roleY,
    }),
  ];

  const baseFilters =
    filterMode === "portable"
      ? `[0:v]scale=${SOCIAL_OUTPUT_WIDTH}:${SOCIAL_OUTPUT_HEIGHT}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${SOCIAL_OUTPUT_WIDTH}:${SOCIAL_OUTPUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black[v0]`
      : `[0:v]scale=${SOCIAL_OUTPUT_WIDTH}:${SOCIAL_OUTPUT_HEIGHT}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,pad=${SOCIAL_OUTPUT_WIDTH}:${SOCIAL_OUTPUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black[v0]`;

  const overlayStages: string[] = [baseFilters];
  let currentLabel = "[v0]";

  if (hasCardBackgroundAsset && cardBackgroundInputIndex !== null) {
    const cardOutputLabel = "[card0]";
    overlayStages.push(
      `${currentLabel}[${cardBackgroundInputIndex}:v]overlay=x=${card.x}:y=${card.y}:format=auto:shortest=1${cardOutputLabel}`,
    );
    currentLabel = cardOutputLabel;
  }

  const artOutputLabel = hasLogoAsset || hasVerifiedBadgeAsset ? "[art0]" : "[v]";
  overlayStages.push(filterChain(currentLabel, overlayFilters, artOutputLabel));
  currentLabel = artOutputLabel;

  if (hasLogoAsset && logoInputIndex !== null) {
    const logoOutputLabel = hasVerifiedBadgeAsset ? "[art1]" : "[v]";
    overlayStages.push(
      `[${logoInputIndex}:v]scale=${card.logoWidth}:${card.logoHeight}:flags=lanczos[lectum_logo]`,
      `${currentLabel}[lectum_logo]overlay=x=${labelLogoX}:y=${labelLogoY}:format=auto:shortest=1${logoOutputLabel}`,
    );
    currentLabel = logoOutputLabel;
  }

  if (hasVerifiedBadgeAsset && verifiedBadgeInputIndex !== null) {
    overlayStages.push(
      `[${verifiedBadgeInputIndex}:v]scale=${professional.badgeWidth}:${professional.badgeHeight}:flags=lanczos[verified_badge]`,
      `${currentLabel}[verified_badge]overlay=x=${verifiedBadgeX}:y=${verifiedBadgeY}:format=auto:shortest=1[v]`,
    );
  }

  return overlayStages.join(";");
};

export const buildSocialShareVideoArguments = (
  input: {
    config: VideoServiceConfig;
    metadata: SocialShareRenderMetadata;
    outputPath: string;
    source: SocialShareSource;
  },
  options: SocialShareRenderOptions,
) => {
  const sanitizedMetadata = sanitizeSocialShareMetadata(input.metadata);
  const filterMode = options.filterMode ?? "standard";
  const cardBackgroundFile =
    filterMode === "standard"
      ? options.cardBackgroundFile === undefined
        ? resolveSocialShareAssetFile(SOCIAL_SHARE_CARD_BACKGROUND_FILE_NAME)
        : options.cardBackgroundFile
      : null;
  const logoFile =
    options.logoFile === undefined
      ? resolveSocialShareAssetFile(SOCIAL_SHARE_LOGO_FILE_NAME)
      : options.logoFile;
  const requestedVerifiedBadgeFile =
    options.verifiedBadgeFile === undefined
      ? resolveSocialShareAssetFile(SOCIAL_SHARE_VERIFIED_BADGE_FILE_NAME)
      : options.verifiedBadgeFile;
  const verifiedBadgeFile =
    sanitizedMetadata.professionalVerified && requestedVerifiedBadgeFile
      ? requestedVerifiedBadgeFile
      : null;
  const inputArguments = (() => {
    if (input.source.kind !== "remote") {
      return ["-protocol_whitelist", "file,pipe", "-i", input.source.inputPath];
    }

    const requestHeaders = remoteVideoRequestHeaders(input.source.requestOrigin);

    return [
      "-protocol_whitelist",
      "https,tcp,tls,crypto",
      "-tls_verify",
      "1",
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
  const assetInputArguments = [
    ...(cardBackgroundFile ? ["-loop", "1", "-i", cardBackgroundFile] : []),
    ...(logoFile ? ["-loop", "1", "-i", logoFile] : []),
    ...(verifiedBadgeFile ? ["-loop", "1", "-i", verifiedBadgeFile] : []),
  ];

  return [
    "-hide_banner",
    "-nostdin",
    "-loglevel",
    "error",
    "-y",
    ...inputArguments,
    ...assetInputArguments,
    "-filter_complex",
    buildSocialShareFilter(input.metadata, input.config.maxFps, {
      ...options,
      cardBackgroundFile,
      filterMode,
      logoFile,
      verifiedBadgeFile,
    }),
    "-map",
    "[v]",
    "-map",
    "0:a:0?",
    ...socialShareOutputSizeArguments(input.config),
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

const socialShareRenderVariants = ({
  cardBackgroundFile,
  fontFile,
  logoFile,
  regularFontFile,
  verifiedBadgeFile,
}: {
  cardBackgroundFile: string | null;
  fontFile: string | null;
  logoFile: string | null;
  regularFontFile: string | null;
  verifiedBadgeFile: string | null;
}): SocialShareRenderVariant[] => [
  {
    cardBackgroundFile,
    filterMode: "standard",
    fontFile,
    logoFile,
    regularFontFile,
    verifiedBadgeFile,
  },
  {
    cardBackgroundFile: null,
    filterMode: "portable",
    fontFile,
    logoFile,
    regularFontFile,
    verifiedBadgeFile,
  },
  ...(fontFile
    ? ([
        {
          cardBackgroundFile,
          filterMode: "standard",
          fontFile: null,
          logoFile,
          regularFontFile: null,
          verifiedBadgeFile,
        },
        {
          cardBackgroundFile: null,
          filterMode: "portable",
          fontFile: null,
          logoFile,
          regularFontFile: null,
          verifiedBadgeFile,
        },
      ] satisfies SocialShareRenderVariant[])
    : []),
  ...(cardBackgroundFile || logoFile || verifiedBadgeFile
    ? ([
        {
          cardBackgroundFile: null,
          filterMode: "standard",
          fontFile,
          logoFile: null,
          regularFontFile,
          verifiedBadgeFile: null,
        },
        {
          cardBackgroundFile: null,
          filterMode: "portable",
          fontFile,
          logoFile: null,
          regularFontFile,
          verifiedBadgeFile: null,
        },
      ] satisfies SocialShareRenderVariant[])
    : []),
  ...(fontFile && (cardBackgroundFile || logoFile || verifiedBadgeFile)
    ? ([
        {
          cardBackgroundFile: null,
          filterMode: "standard",
          fontFile: null,
          logoFile: null,
          regularFontFile: null,
          verifiedBadgeFile: null,
        },
        {
          cardBackgroundFile: null,
          filterMode: "portable",
          fontFile: null,
          logoFile: null,
          regularFontFile: null,
          verifiedBadgeFile: null,
        },
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
    const resolvedRegularFontFile = await resolveSocialShareRegularFontFile();
    const resolvedCardBackgroundFile = resolveSocialShareAssetFile(
      SOCIAL_SHARE_CARD_BACKGROUND_FILE_NAME,
    );
    const resolvedLogoFile = resolveSocialShareAssetFile(SOCIAL_SHARE_LOGO_FILE_NAME);
    const resolvedVerifiedBadgeFile = resolveSocialShareAssetFile(
      SOCIAL_SHARE_VERIFIED_BADGE_FILE_NAME,
    );
    let lastError: unknown;
    const renderVariants = socialShareRenderVariants({
      cardBackgroundFile: resolvedCardBackgroundFile,
      fontFile: resolvedFontFile,
      logoFile: resolvedLogoFile,
      regularFontFile: resolvedRegularFontFile,
      verifiedBadgeFile: resolvedVerifiedBadgeFile,
    });

    for (const [index, variant] of renderVariants.entries()) {
      let emittedRenderProgress = false;
      const progressParser = createProgressParser(input.durationSeconds, (percentage) => {
        emittedRenderProgress = true;
        input.onProgress(percentage);
      });

      try {
        const professionalNameLayout = await measureSocialShareProfessionalName({
          config: input.config,
          metadata: input.metadata,
          fontFile: variant.fontFile,
          signal,
        });
        await runManagedProcess({
          args: buildSocialShareVideoArguments(input, { ...variant, professionalNameLayout }),
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
