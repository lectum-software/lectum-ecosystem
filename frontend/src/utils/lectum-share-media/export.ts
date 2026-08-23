import type { LectumShareSocialTarget } from "@/utils/lectum-share-target";

import {
  resolveVideoExportDurationSeconds,
  resolveVideoExportSafetyTimeoutMs,
  resolveVideoExportStallTimeoutMs,
} from "./duration";
import { safeFileName } from "./file-name";
import {
  type CanvasWithCaptureStream,
  canvasToBlob,
  createCanvas,
  drawLectumShareFrame,
  getCanvasPalette,
  type LectumShareFrameTarget,
  loadShareCanvasAssets,
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

type VideoFrameReadyElement = HTMLVideoElement & {
  cancelVideoFrameCallback?: (handle: number) => void;
  requestVideoFrameCallback?: (callback: () => void) => number;
};

type CanvasCaptureStreamTrack = MediaStreamTrack & {
  requestFrame?: () => void;
};

const emptyVideoAudioCapture = (): VideoAudioCapture => ({
  cleanup: () => undefined,
  resume: async () => undefined,
  tracks: [],
});

const attachVideoElementForCanvas = (video: HTMLVideoElement) => {
  if (typeof document === "undefined" || video.isConnected || !document.body) {
    return () => undefined;
  }

  video.style.height = "1px";
  video.style.left = "0";
  video.style.opacity = "0.001";
  video.style.pointerEvents = "none";
  video.style.position = "fixed";
  video.style.top = "0";
  video.style.width = "1px";
  video.style.zIndex = "-1";
  video.setAttribute("aria-hidden", "true");
  document.body.appendChild(video);

  return () => {
    if (video.parentNode) {
      video.parentNode.removeChild(video);
    }
  };
};

const waitForVideoRenderFrame = (video: HTMLVideoElement, timeoutMs = 1800) =>
  new Promise<void>((resolve, reject) => {
    const videoWithFrameCallback = video as VideoFrameReadyElement;
    let done = false;
    let frameCallbackHandle: number | null = null;
    let firstAnimationFrame = 0;
    let secondAnimationFrame = 0;

    const timeout = window.setTimeout(() => {
      complete();
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadeddata", requestFrameWhenReady);
      video.removeEventListener("playing", requestFrameWhenReady);
      video.removeEventListener("timeupdate", requestFrameWhenReady);
      video.removeEventListener("error", handleError);

      if (frameCallbackHandle !== null) {
        videoWithFrameCallback.cancelVideoFrameCallback?.(frameCallbackHandle);
      }

      window.cancelAnimationFrame(firstAnimationFrame);
      window.cancelAnimationFrame(secondAnimationFrame);
    };

    function complete() {
      if (done) return;

      done = true;
      cleanup();
      resolve();
    }

    function fail(error: Error) {
      if (done) return;

      done = true;
      cleanup();
      reject(error);
    }

    function requestFallbackAnimationFrame() {
      firstAnimationFrame = window.requestAnimationFrame(() => {
        secondAnimationFrame = window.requestAnimationFrame(complete);
      });
    }

    function requestFrameWhenReady() {
      if (done || frameCallbackHandle !== null || firstAnimationFrame !== 0) return;
      if (video.readyState < 2) return;

      if (videoWithFrameCallback.requestVideoFrameCallback) {
        frameCallbackHandle = videoWithFrameCallback.requestVideoFrameCallback(complete);
        return;
      }

      requestFallbackAnimationFrame();
    }

    function handleError() {
      fail(new Error("Nao foi possivel renderizar o video para compartilhamento."));
    }

    video.addEventListener("loadeddata", requestFrameWhenReady);
    video.addEventListener("playing", requestFrameWhenReady);
    video.addEventListener("timeupdate", requestFrameWhenReady);
    video.addEventListener("error", handleError, { once: true });

    requestFrameWhenReady();
  });

const createCanvasCaptureFrameRequester = (stream: MediaStream) => {
  const videoTrack = stream.getVideoTracks()[0] as CanvasCaptureStreamTrack | undefined;

  return () => {
    try {
      videoTrack?.requestFrame?.();
    } catch {
      // Alguns browsers expõem requestFrame, mas podem recusar se o track já encerrou.
    }
  };
};

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

  const assets = await loadShareCanvasAssets();
  const detachVideoElement =
    media instanceof HTMLVideoElement ? attachVideoElementForCanvas(media) : () => undefined;
  const previousMuted = media instanceof HTMLVideoElement ? media.muted : true;
  const previousVolume = media instanceof HTMLVideoElement ? media.volume : 0;

  try {
    if (media instanceof HTMLVideoElement) {
      media.muted = true;
      media.volume = 0;

      if (media.currentTime > 0.05) {
        media.currentTime = 0;
        await waitForEvent(media, "seeked", 4000).catch(() => undefined);
      }

      await media.play().catch((error) => {
        if (media.readyState >= 2) return undefined;
        throw error;
      });
      await waitForVideoRenderFrame(media);
      media.pause();
    }

    drawLectumShareFrame(ctx, media, layout, target, getCanvasPalette(), assets);
    const blob = await canvasToBlob(canvas, type, quality);

    return new File([blob], fileName, {
      type,
    });
  } finally {
    if (media instanceof HTMLVideoElement) {
      media.pause();
      media.muted = previousMuted;
      media.volume = previousVolume;
    }

    detachVideoElement();
  }
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
    throw new Error("Exportacao de video indisponivel para compartilhamento.");
  }

  const detachVideoElement = attachVideoElementForCanvas(video);
  const stream = canvas.captureStream(VIDEO_EXPORT_FRAME_RATE);
  const requestCanvasCaptureFrame = createCanvasCaptureFrameRequester(stream);
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
    detachVideoElement();
    throw error;
  }

  const palette = getCanvasPalette();
  const assets = await loadShareCanvasAssets();
  const hasKnownDuration = Number.isFinite(video.duration) && video.duration > 0;
  const durationSeconds = resolveVideoExportDurationSeconds(video.duration);
  const endTimeToleranceSeconds = Math.min(0.25, Math.max(0.05, durationSeconds * 0.005));
  const safetyTimeoutMs = resolveVideoExportSafetyTimeoutMs(durationSeconds, hasKnownDuration);
  const stallTimeoutMs = resolveVideoExportStallTimeoutMs();

  return new Promise<File>((resolve, reject) => {
    let cleaned = false;
    let drawTimer: number | null = null;
    let lastProgressAt = 0;
    let lastVideoTime = 0;
    let settled = false;
    let stopped = false;
    let startedAt = 0;

    const cleanup = () => {
      if (cleaned) return;

      cleaned = true;
      if (drawTimer) {
        window.clearTimeout(drawTimer);
        drawTimer = null;
      }
      for (const track of stream.getTracks()) {
        track.stop();
      }
      audioCapture.cleanup();
      detachVideoElement();
      video.muted = true;
      video.volume = 0;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    const failExport = (error: Error) => {
      if (settled) return;

      settled = true;
      cleanup();
      reject(error);
    };

    const stopRecorder = () => {
      if (settled || stopped) return;

      stopped = true;
      if (recorder.state !== "inactive") {
        try {
          recorder.requestData();
        } catch {
          // best effort before stopping the recorder
        }

        recorder.stop();
      }
    };

    const scheduleDraw = () => {
      drawTimer = window.setTimeout(draw, 1000 / VIDEO_EXPORT_FRAME_RATE);
    };

    const draw = () => {
      drawLectumShareFrame(ctx, video, layout, target, palette, assets);
      requestCanvasCaptureFrame();
      const now = performance.now();
      const elapsed = now - startedAt;
      const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      if (currentTime > lastVideoTime + 0.05) {
        lastVideoTime = currentTime;
        lastProgressAt = now;
      }

      const reachedKnownEnd =
        hasKnownDuration && currentTime >= durationSeconds - endTimeToleranceSeconds;
      const stalled = now - lastProgressAt >= stallTimeoutMs;

      if (video.ended || reachedKnownEnd) {
        stopRecorder();
        return;
      }

      if (stalled || elapsed >= safetyTimeoutMs) {
        failExport(new Error("Nao foi possivel gravar o video inteiro para compartilhamento."));
        return;
      }

      scheduleDraw();
    };

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onerror = () => {
      failExport(new Error("Nao foi possivel gravar o video de compartilhamento."));
    };

    recorder.onstop = () => {
      if (settled) return;

      cleanup();
      const outputType = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunks, { type: outputType });
      if (blob.size === 0) {
        settled = true;
        reject(new Error("Nao foi possivel gerar um video valido para compartilhamento."));
        return;
      }

      const extension = extensionFromMimeType(outputType);
      settled = true;
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

        await video.play();
        await waitForVideoRenderFrame(video);
        drawLectumShareFrame(ctx, video, layout, target, palette, assets);
        requestCanvasCaptureFrame();
        recorder.start(1000);
        startedAt = performance.now();
        lastProgressAt = startedAt;
        lastVideoTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
        draw();
      } catch (error) {
        if (!video.muted) {
          try {
            video.muted = true;
            await video.play();
            await waitForVideoRenderFrame(video);
            drawLectumShareFrame(ctx, video, layout, target, palette, assets);
            requestCanvasCaptureFrame();
            recorder.start(1000);
            startedAt = performance.now();
            lastProgressAt = startedAt;
            lastVideoTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
            draw();
            return;
          } catch {
            // handled below
          }
        }

        failExport(error instanceof Error ? error : new Error("Falha ao iniciar o video."));
      }
    };

    void start();
  });
};
