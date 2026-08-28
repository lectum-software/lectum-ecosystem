import type { LectumShareSocialTarget } from "@/utils/lectum-share-target";
import { LectumShareDiagnosticError } from "./diagnostics";
import { safeFileName } from "./file-name";
import {
  createCanvas,
  drawLectumShareFrame,
  getCanvasPalette,
  loadShareCanvasAssets,
  storyCanvasLayout,
  VIDEO_EXPORT_FRAME_RATE,
} from "./layout";

const MEDIABUNNY_SHARE_AUDIO_BITRATE = 128_000;
const MEDIABUNNY_SHARE_VIDEO_BITRATE = 2_400_000;
const ANDROID_MEDIABUNNY_SHARE_AUDIO_BITRATE = 96_000;
const ANDROID_MEDIABUNNY_SHARE_FRAME_RATE = 24;

type MediabunnyShareExportProfile = {
  readonly frameRate?: number;
  readonly height: number;
  readonly videoBitrate: number;
  readonly videoBitrateMode?: "constant" | "variable";
  readonly width: number;
};

const MEDIABUNNY_SHARE_EXPORT_PROFILES: readonly MediabunnyShareExportProfile[] = [
  { height: 1920, videoBitrate: MEDIABUNNY_SHARE_VIDEO_BITRATE, width: 1080 },
  { height: 1280, videoBitrate: 1_600_000, width: 720 },
  { height: 960, videoBitrate: 1_000_000, width: 540 },
] as const;

const ANDROID_MEDIABUNNY_SHARE_EXPORT_PROFILES: readonly MediabunnyShareExportProfile[] = [
  {
    frameRate: ANDROID_MEDIABUNNY_SHARE_FRAME_RATE,
    height: 960,
    videoBitrate: 850_000,
    videoBitrateMode: "constant",
    width: 540,
  },
] as const;

const isAndroidMediabunnyShareRuntime = () =>
  typeof navigator !== "undefined" && /\bAndroid\b/i.test(navigator.userAgent);

const isAppleMobileMediabunnyShareRuntime = () =>
  typeof navigator !== "undefined" && /\b(iPhone|iPad|iPod)\b/i.test(navigator.userAgent);

const mediabunnyShareExportProfiles = () =>
  isAndroidMediabunnyShareRuntime()
    ? ANDROID_MEDIABUNNY_SHARE_EXPORT_PROFILES
    : isAppleMobileMediabunnyShareRuntime()
      ? MEDIABUNNY_SHARE_EXPORT_PROFILES.slice(1)
      : MEDIABUNNY_SHARE_EXPORT_PROFILES;

export const shouldUseMediabunnyVideoShareExport = () =>
  process.env.NEXT_PUBLIC_LECTUM_SHARE_MEDIABUNNY_ENABLED !== "false";

const registerMediabunnyAacEncoder = async () => {
  try {
    const { registerAacEncoder } = await import("@mediabunny/aac-encoder");
    registerAacEncoder();
  } catch {
    // Sem o encoder auxiliar, o Mediabunny ainda pode usar codecs nativos ou cair no fallback legado.
  }
};

export const createMediabunnyVideoShareFile = async (
  target: LectumShareSocialTarget,
  mediaUrl: string,
) => {
  const response = await fetch(mediaUrl);

  if (!response.ok) {
    throw new LectumShareDiagnosticError("source-fetch");
  }

  const sourceBlob = await response.blob();
  if (sourceBlob.size === 0) {
    throw new LectumShareDiagnosticError("source-empty");
  }

  let mediabunny: Awaited<ReturnType<typeof importMediabunny>>;
  try {
    mediabunny = await importMediabunny();
  } catch (error) {
    throw new LectumShareDiagnosticError("mediabunny-import", error);
  }

  const {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    Conversion,
    Input,
    Mp4OutputFormat,
    Output,
    Quality,
    VideoSample,
    canEncodeVideo,
  } = mediabunny;
  await registerMediabunnyAacEncoder();

  const layout = storyCanvasLayout;
  const canvas = createCanvas(layout);
  const ctx = canvas.getContext("2d");
  const sourceCanvas = document.createElement("canvas");
  const sourceCtx = sourceCanvas.getContext("2d");

  if (!ctx || !sourceCtx) {
    throw new LectumShareDiagnosticError("canvas-context");
  }

  const assets = await loadShareCanvasAssets();
  const isAndroidRuntime = isAndroidMediabunnyShareRuntime();
  const palette = getCanvasPalette();
  const audioQuality = new Quality({
    bitrate: isAndroidRuntime
      ? ANDROID_MEDIABUNNY_SHARE_AUDIO_BITRATE
      : MEDIABUNNY_SHARE_AUDIO_BITRATE,
    bitrateMode: isAndroidRuntime ? "constant" : "variable",
  });
  let lastError = new Error("Exportacao Mediabunny indisponivel para compartilhamento.");

  for (const profile of mediabunnyShareExportProfiles()) {
    canvas.width = profile.width;
    canvas.height = profile.height;
    const scaleX = profile.width / layout.width;
    const scaleY = profile.height / layout.height;
    const frameRate = profile.frameRate ?? VIDEO_EXPORT_FRAME_RATE;
    const videoQuality = new Quality({
      bitrate: profile.videoBitrate,
      bitrateMode: profile.videoBitrateMode ?? "variable",
    });
    const canEncodeProfile = await canEncodeVideo("avc", {
      alpha: "discard",
      height: profile.height,
      hardwareAcceleration: "no-preference",
      quality: videoQuality,
      width: profile.width,
    }).catch(() => false);

    if (!canEncodeProfile) {
      lastError = new LectumShareDiagnosticError("mediabunny-can-encode", undefined, {
        profile: `${profile.width}x${profile.height}`,
      });
      continue;
    }

    const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(sourceBlob) });
    const targetBuffer = new BufferTarget();
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: "in-memory" }),
      target: targetBuffer,
    });

    const profileDetails = { profile: `${profile.width}x${profile.height}` };

    try {
      let conversion: Awaited<ReturnType<typeof Conversion.init>>;
      try {
        conversion = await Conversion.init({
          audio: {
            codec: "aac",
            forceTranscode: true,
            numberOfChannels: 2,
            quality: audioQuality,
            sampleRate: 44_100,
          },
          input,
          output,
          showWarnings: false,
          tags: {},
          tracks: "primary",
          video: {
            allowRotationMetadata: false,
            alpha: "discard",
            codec: "avc",
            forceTranscode: true,
            frameRate,
            hardwareAcceleration: "no-preference",
            height: profile.height,
            keyFrameInterval: 2,
            process: (sample) => {
              const sampleWidth = Math.max(1, Math.round(sample.displayWidth));
              const sampleHeight = Math.max(1, Math.round(sample.displayHeight));

              if (sourceCanvas.width !== sampleWidth) sourceCanvas.width = sampleWidth;
              if (sourceCanvas.height !== sampleHeight) sourceCanvas.height = sampleHeight;
              sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
              sample.draw(sourceCtx, 0, 0, sourceCanvas.width, sourceCanvas.height);
              ctx.save();
              ctx.scale(scaleX, scaleY);
              drawLectumShareFrame(ctx, sourceCanvas, layout, target, palette, assets);
              ctx.restore();
              return new VideoSample(canvas, {
                duration: sample.duration,
                timestamp: sample.timestamp,
              });
            },
            processedHeight: profile.height,
            processedWidth: profile.width,
            quality: videoQuality,
            width: profile.width,
          },
        });
      } catch (error) {
        throw new LectumShareDiagnosticError("mediabunny-conversion-init", error, profileDetails);
      }

      if (!conversion.isValid) {
        throw new LectumShareDiagnosticError(
          "mediabunny-conversion-invalid",
          undefined,
          profileDetails,
        );
      }

      try {
        await conversion.execute();
      } catch (error) {
        throw new LectumShareDiagnosticError(
          "mediabunny-conversion-execute",
          error,
          profileDetails,
        );
      }

      const buffer = targetBuffer.buffer;
      if (!buffer || buffer.byteLength === 0) {
        throw new LectumShareDiagnosticError("mediabunny-output-empty", undefined, profileDetails);
      }

      return new File([buffer], safeFileName(target, "mp4"), { type: "video/mp4" });
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;
    } finally {
      input.dispose();
    }
  }

  throw lastError;
};

const importMediabunny = () => import("mediabunny");
