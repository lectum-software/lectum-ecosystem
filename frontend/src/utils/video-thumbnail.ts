import {
  createLectumShareFrameImageFile,
  type LectumShareFrameTarget,
} from "@/utils/lectum-share-media";

const DEFAULT_THUMBNAIL_TIMEOUT_MS = 8000;
const DEFAULT_THUMBNAIL_QUALITY = 0.86;
const DEFAULT_THUMBNAIL_WIDTH = 1200;

export type LectumVideoThumbnailFrameOptions = {
  cardLabel: LectumShareFrameTarget["cardLabel"];
  professional: LectumShareFrameTarget["professional"];
  sourceText?: string | null;
};

type CreateVideoThumbnailOptions = {
  lectumShareFrame?: LectumVideoThumbnailFrameOptions | null;
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

    const seekAndCapture = () => {
      const targetTime = Number.isFinite(video.duration) && video.duration > 0.8 ? 0.5 : 0;

      if (targetTime > 0 && Math.abs(video.currentTime - targetTime) > 0.05) {
        video.addEventListener("seeked", captureFrame, { once: true });
        try {
          video.currentTime = targetTime;
        } catch {
          captureFrame();
        }
        return;
      }

      captureFrame();
    };

    timeoutId = window.setTimeout(() => finish(null), DEFAULT_THUMBNAIL_TIMEOUT_MS);
    video.addEventListener("loadedmetadata", seekAndCapture, { once: true });
    video.addEventListener("loadeddata", () => {
      if (!video.videoWidth || !video.videoHeight) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime === 0) {
        seekAndCapture();
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
