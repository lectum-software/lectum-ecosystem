import type { LectumShareSocialTarget } from "@/utils/lectum-share-target";

import { safeFileName } from "./file-name";
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

type VideoAudioCapture = {
  cleanup: () => void;
  resume: () => Promise<void>;
  tracks: MediaStreamTrack[];
};

const emptyVideoAudioCapture = (): VideoAudioCapture => ({
  cleanup: () => undefined,
  resume: async () => undefined,
  tracks: [],
});

const resolveAudioContextConstructor = () => {
  if (typeof window === "undefined") return null;

  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  );
};

const createSilentVideoAudioCapture = (video: HTMLVideoElement): VideoAudioCapture => {
  const AudioContextConstructor = resolveAudioContextConstructor();

  if (!AudioContextConstructor) return emptyVideoAudioCapture();

  let audioContext: AudioContext | null = null;
  let source: MediaElementAudioSourceNode | null = null;
  let destination: MediaStreamAudioDestinationNode | null = null;

  const cleanup = () => {
    try {
      source?.disconnect();
      destination?.disconnect();
    } catch {
      // best effort cleanup
    }

    for (const track of destination?.stream.getTracks() ?? []) {
      track.stop();
    }

    if (audioContext && audioContext.state !== "closed") {
      void audioContext.close().catch(() => undefined);
    }
  };

  try {
    audioContext = new AudioContextConstructor();
    source = audioContext.createMediaElementSource(video);
    destination = audioContext.createMediaStreamDestination();
    source.connect(destination);

    const tracks = destination.stream.getAudioTracks();

    if (tracks.length === 0) {
      throw new Error("Trilha de audio indisponivel.");
    }

    video.muted = false;
    video.volume = 1;

    return {
      cleanup,
      resume: async () => {
        if (audioContext?.state === "suspended") {
          await audioContext.resume().catch(() => undefined);
        }
      },
      tracks,
    };
  } catch {
    cleanup();
    video.muted = true;
    video.volume = 0;

    return emptyVideoAudioCapture();
  }
};

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
  const audioCapture = createSilentVideoAudioCapture(video);
  for (const track of audioCapture.tracks) {
    stream.addTrack(track);
  }

  const chunks: Blob[] = [];
  let recorder: MediaRecorder;

  try {
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  } catch (error) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
    audioCapture.cleanup();
    throw error;
  }

  const palette = getCanvasPalette();
  const durationSeconds = Math.min(
    Math.max(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 15, 1),
    MAX_VIDEO_EXPORT_SECONDS,
  );
  const durationMs = durationSeconds * 1000;

  return new Promise<File>((resolve, reject) => {
    let animationFrame = 0;
    let cleaned = false;
    let stopped = false;
    let startedAt = 0;

    const cleanup = () => {
      if (cleaned) return;

      cleaned = true;
      window.cancelAnimationFrame(animationFrame);
      for (const track of stream.getTracks()) {
        track.stop();
      }
      audioCapture.cleanup();
      video.muted = true;
      video.volume = 0;
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
        await audioCapture.resume();

        if (audioCapture.tracks.length === 0) {
          video.muted = true;
          video.volume = 0;
        }

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
