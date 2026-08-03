const DEFAULT_THUMBNAIL_TIMEOUT_MS = 8000;
const DEFAULT_THUMBNAIL_QUALITY = 0.86;
const DEFAULT_THUMBNAIL_WIDTH = 1200;

const safeThumbnailName = (fileName: string) => {
  const baseName = fileName.replace(/\.[^.]+$/, "").trim() || "video";

  return `${baseName}-thumbnail.jpg`;
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

export const createVideoThumbnailFile = async (file: File): Promise<File | null> => {
  if (typeof document === "undefined") return null;
  if (!file.type.startsWith("video/")) return null;

  return new Promise<File | null>((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
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
              new File([blob], safeThumbnailName(file.name), {
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
