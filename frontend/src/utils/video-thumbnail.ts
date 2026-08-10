import {
  createLectumShareFrameImageFile,
  type LectumShareFrameTarget,
} from "@/utils/lectum-share-media";

const DEFAULT_THUMBNAIL_TIMEOUT_MS = 8000;
const DEFAULT_THUMBNAIL_QUALITY = 0.86;
const DEFAULT_THUMBNAIL_WIDTH = 1200;
const THUMBNAIL_FRAME_SAMPLE_SIZE = 32;
const THUMBNAIL_FRAME_SEEK_TIMEOUT_MS = 1800;
const THUMBNAIL_FRAME_USABLE_BRIGHT_RATIO = 0.035;
const THUMBNAIL_FRAME_USABLE_CONTRAST = 12;
const THUMBNAIL_FRAME_USABLE_LUMINANCE = 24;

export type LectumVideoThumbnailFrameOptions = {
  cardLabel: LectumShareFrameTarget["cardLabel"];
  professional: LectumShareFrameTarget["professional"];
  sourceText?: string | null;
};

type CreateVideoThumbnailOptions = {
  lectumShareFrame?: LectumVideoThumbnailFrameOptions | null;
};

type ThumbnailFrameScore = {
  brightRatio: number;
  contrast: number;
  luminance: number;
  score: number;
  usable: boolean;
};

const safeThumbnailName = (fileName: string, frame?: "lectum-share" | "raw") => {
  const baseName = fileName.replace(/\.[^.]+$/, "").trim() || "video";
  const suffix = frame === "lectum-share" ? "lectum-og" : "thumbnail";

  return `${baseName}-${suffix}.jpg`;
};

const toLectumShareFrameTarget = (
  options?: LectumVideoThumbnailFrameOptions | null,
): LectumShareFrameTarget | null => {
  if (!options) return null;

  const sourceText = String(options.sourceText ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const professionalName = options.professional.name.replace(/\s+/g, " ").trim();

  return {
    cardLabel: options.cardLabel,
    mediaType: "video",
    professional: {
      avatar: options.professional.avatar ?? null,
      name: professionalName || "Profissional Lectum",
      roleLabel: options.professional.roleLabel,
      verified: options.professional.verified,
    },
    sourceText: sourceText || "Conteúdo publicado na Lectum.",
  };
};

const calculateThumbnailSize = (videoWidth: number, videoHeight: number) => {
  if (!videoWidth || !videoHeight) {
    return {
      height: 630,
      width: 1200,
    };
  }

  const scale = Math.min(1, DEFAULT_THUMBNAIL_WIDTH / videoWidth);

  return {
    height: Math.max(1, Math.round(videoHeight * scale)),
    width: Math.max(1, Math.round(videoWidth * scale)),
  };
};

const buildThumbnailCandidateTimes = (duration: number) => {
  if (!Number.isFinite(duration) || duration <= 0.2) return [0];

  const endOffset = duration > 1 ? 0.15 : 0.05;
  const maxTime = Math.max(0, duration - endOffset);
  const preferredTimes = [0.5, 1.2, duration * 0.25, 2, duration * 0.5, duration * 0.75, 0.1, 0];
  const times: number[] = [];

  for (const preferredTime of preferredTimes) {
    const time = Math.min(Math.max(0, preferredTime), maxTime);
    const roundedTime = Math.round(time * 20) / 20;

    if (times.some((candidate) => Math.abs(candidate - roundedTime) < 0.12)) {
      continue;
    }

    times.push(roundedTime);
  }

  return times.length > 0 ? times : [0];
};

const waitForVideoFrame = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });

const seekVideoTo = (video: HTMLVideoElement, targetTime: number) =>
  new Promise<boolean>((resolve) => {
    let settled = false;
    let timeoutId: number | null = null;

    const cleanup = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
    };

    const finish = (result: boolean) => {
      if (settled) return;

      settled = true;
      cleanup();
      resolve(result);
    };

    const finishAfterFrame = (result: boolean) => {
      void waitForVideoFrame().then(() => finish(result));
    };

    const handleSeeked = () => finishAfterFrame(true);
    const handleError = () => finish(false);
    const safeTargetTime = Math.max(0, targetTime);

    if (
      Math.abs(video.currentTime - safeTargetTime) <= 0.04 &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      finishAfterFrame(true);
      return;
    }

    timeoutId = window.setTimeout(() => finish(false), THUMBNAIL_FRAME_SEEK_TIMEOUT_MS);
    video.addEventListener("seeked", handleSeeked, { once: true });
    video.addEventListener("error", handleError, { once: true });

    try {
      video.currentTime = safeTargetTime;
    } catch {
      finish(false);
    }
  });

const scoreCurrentVideoFrame = (video: HTMLVideoElement): ThumbnailFrameScore | null => {
  try {
    if (!video.videoWidth || !video.videoHeight) return null;

    const canvas = document.createElement("canvas");
    const aspectRatio = video.videoHeight / video.videoWidth;
    canvas.width = THUMBNAIL_FRAME_SAMPLE_SIZE;
    canvas.height = Math.max(1, Math.round(THUMBNAIL_FRAME_SAMPLE_SIZE * aspectRatio));

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const luminances: number[] = [];
    let brightPixels = 0;
    let totalLuminance = 0;

    for (let index = 0; index < data.length; index += 4) {
      const luminance = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];

      luminances.push(luminance);
      totalLuminance += luminance;

      if (luminance >= 48) {
        brightPixels += 1;
      }
    }

    if (luminances.length === 0) return null;

    const luminance = totalLuminance / luminances.length;
    const variance =
      luminances.reduce((total, item) => total + (item - luminance) ** 2, 0) / luminances.length;
    const contrast = Math.sqrt(variance);
    const brightRatio = brightPixels / luminances.length;
    const usable =
      luminance >= THUMBNAIL_FRAME_USABLE_LUMINANCE ||
      contrast >= THUMBNAIL_FRAME_USABLE_CONTRAST ||
      brightRatio >= THUMBNAIL_FRAME_USABLE_BRIGHT_RATIO;

    return {
      brightRatio,
      contrast,
      luminance,
      score: luminance + contrast * 1.5 + brightRatio * 80,
      usable,
    };
  } catch {
    return null;
  }
};

export const createVideoThumbnailFile = async (
  file: File,
  options: CreateVideoThumbnailOptions = {},
): Promise<File | null> => {
  if (typeof document === "undefined") return null;
  if (!file.type.startsWith("video/")) return null;

  return new Promise<File | null>((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    const lectumShareFrameTarget = toLectumShareFrameTarget(options.lectumShareFrame);
    let captureStarted = false;
    let settled = false;
    let timeoutId: number | null = null;

    const cleanup = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    const finish = (thumbnail: File | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(thumbnail);
    };

    const captureFrame = () => {
      try {
        if (lectumShareFrameTarget) {
          void createLectumShareFrameImageFile({
            fileName: safeThumbnailName(file.name, "lectum-share"),
            media: video,
            quality: DEFAULT_THUMBNAIL_QUALITY,
            target: lectumShareFrameTarget,
            type: "image/jpeg",
          })
            .then((thumbnail) => finish(thumbnail))
            .catch(() => finish(null));
          return;
        }

        const { height, width } = calculateThumbnailSize(video.videoWidth, video.videoHeight);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");

        if (!context) {
          finish(null);
          return;
        }

        context.drawImage(video, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              finish(null);
              return;
            }

            finish(
              new File([blob], safeThumbnailName(file.name, "raw"), {
                lastModified: Date.now(),
                type: "image/jpeg",
              }),
            );
          },
          "image/jpeg",
          DEFAULT_THUMBNAIL_QUALITY,
        );
      } catch {
        finish(null);
      }
    };

    const selectFrameAndCapture = async () => {
      if (captureStarted || settled) return;

      captureStarted = true;

      const candidateTimes = buildThumbnailCandidateTimes(video.duration);
      let bestFrame: { score: ThumbnailFrameScore; time: number } | null = null;

      for (const candidateTime of candidateTimes) {
        if (settled) return;

        await seekVideoTo(video, candidateTime);

        if (settled) return;

        const frameScore = scoreCurrentVideoFrame(video);

        if (frameScore && (!bestFrame || frameScore.score > bestFrame.score.score)) {
          bestFrame = {
            score: frameScore,
            time: candidateTime,
          };
        }

        if (frameScore?.usable) {
          captureFrame();
          return;
        }
      }

      if (bestFrame && Math.abs(video.currentTime - bestFrame.time) > 0.05) {
        await seekVideoTo(video, bestFrame.time);
      }

      captureFrame();
    };

    timeoutId = window.setTimeout(() => finish(null), DEFAULT_THUMBNAIL_TIMEOUT_MS);
    video.addEventListener("loadedmetadata", () => void selectFrameAndCapture(), { once: true });
    video.addEventListener("loadeddata", () => {
      if (!video.videoWidth || !video.videoHeight) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        void selectFrameAndCapture();
      }
    });
    video.addEventListener("error", () => finish(null), { once: true });
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = objectUrl;
    video.load();
  });
};
