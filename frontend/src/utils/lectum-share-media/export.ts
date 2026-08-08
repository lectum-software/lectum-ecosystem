import type { LectumShareSocialTarget } from "@/utils/lectum-share-target";

import {
  type CanvasWithCaptureStream,
  canvasToBlob,
  createCanvas,
  drawLectumShareFrame,
  getCanvasPalette,
  type LectumShareFrameTarget,
  MAX_VIDEO_EXPORT_SECONDS,
  type ShareMediaElement,
  storyCanvasLayout,
  VIDEO_EXPORT_FRAME_RATE,
  type VideoWithCaptureStream,
  waitForEvent,
} from "./layout";

export const supportedVideoMimeType = () => {
  if (typeof MediaRecorder === "undefined") return null;

  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
};

export const extensionFromMimeType = (mimeType: string) =>
  mimeType.includes("mp4") ? "mp4" : "webm";

export const safeFileName = (target: LectumShareSocialTarget, extension: string) =>
  `${target.kind === "post_media" ? "lectum-postado" : "lectum-respondido"}-vertical-9x16.${extension}`;

export const createLectumShareFrameImageFile = async ({
  fileName,
  media,
  quality,
  target,
  type = "image/png",
}: {
  fileName: string;
  media: ShareMediaElement;
  quality?: number;
  target: LectumShareFrameTarget;
  type?: "image/jpeg" | "image/png";
}) => {
  const layout = storyCanvasLayout;
  const canvas = createCanvas(layout);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas indisponível para gerar o compartilhamento.");
  }

  drawLectumShareFrame(ctx, media, layout, target, getCanvasPalette());
  const blob = await canvasToBlob(canvas, type, quality);

  return new File([blob], fileName, {
    type,
  });
};

export const createImageShareFile = async (
  target: LectumShareSocialTarget,
  media: ShareMediaElement,
) =>
  createLectumShareFrameImageFile({
    fileName: safeFileName(target, "png"),
    media,
    target,
  });

export const createVideoShareFile = async (
  target: LectumShareSocialTarget,
  video: VideoWithCaptureStream,
) => {
  const mimeType = supportedVideoMimeType();
  const layout = storyCanvasLayout;
  const canvas = createCanvas(layout) as CanvasWithCaptureStream;
  const ctx = canvas.getContext("2d");

  if (!ctx || !canvas.captureStream || mimeType === null) {
    return createImageShareFile(target, video);
  }

  const stream = canvas.captureStream(VIDEO_EXPORT_FRAME_RATE);
  const sourceCaptureStream = video.captureStream?.() ?? video.mozCaptureStream?.();
  const audioTracks = sourceCaptureStream?.getAudioTracks() ?? [];
  for (const track of audioTracks) {
    stream.addTrack(track);
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const palette = getCanvasPalette();
  const durationSeconds = Math.min(
    Math.max(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 15, 1),
    MAX_VIDEO_EXPORT_SECONDS,
  );
  const durationMs = durationSeconds * 1000;

  return new Promise<File>((resolve, reject) => {
    let animationFrame = 0;
    let stopped = false;
    let startedAt = 0;

    const cleanup = () => {
      window.cancelAnimationFrame(animationFrame);
      for (const track of stream.getTracks()) {
        track.stop();
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    const stopRecorder = () => {
      if (stopped) return;

      stopped = true;
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    };

    const draw = () => {
      drawLectumShareFrame(ctx, video, layout, target, palette);
      const elapsed = performance.now() - startedAt;

      if (elapsed >= durationMs || video.ended) {
        stopRecorder();
        return;
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onerror = () => {
      cleanup();
      reject(new Error("Não foi possível gravar o vídeo de compartilhamento."));
    };

    recorder.onstop = () => {
      cleanup();
      const outputType = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunks, { type: outputType });
      const extension = extensionFromMimeType(outputType);
      resolve(new File([blob], safeFileName(target, extension), { type: outputType }));
    };

    const start = async () => {
      try {
        if (video.currentTime > 0.05) {
          video.currentTime = 0;
          await waitForEvent(video, "seeked", 4000).catch(() => undefined);
        }

        drawLectumShareFrame(ctx, video, layout, target, palette);
        recorder.start(1000);
        startedAt = performance.now();
        await video.play();
        draw();
      } catch (error) {
        if (!video.muted) {
          try {
            video.muted = true;
            await video.play();
            draw();
            return;
          } catch {
            // handled below
          }
        }

        cleanup();
        reject(error instanceof Error ? error : new Error("Falha ao iniciar o vídeo."));
      }
    };

    void start();
  });
};
