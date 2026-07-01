import type {
  LectumShareChannel,
  LectumShareSocialTarget,
  LectumShareVideoTarget,
} from "@/utils/lectum-share-target";
import { resolvePublicMediaUrl } from "@/utils/media";

type ShareNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

type VideoWithCaptureStream = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

type ShareMediaElement = HTMLImageElement | HTMLVideoElement;

type CanvasWithCaptureStream = HTMLCanvasElement & {
  captureStream?: (frameRate?: number) => MediaStream;
};

type ShareExportResult = {
  channel: LectumShareChannel | null;
  file: File;
  mode: "download" | "file";
};

type ShareCanvasPalette = {
  foreground: string;
  primary: string;
  surface: string;
};

type ShareCanvasLayout = {
  card: {
    bodyFontSize: number;
    headerFontSize: number;
    headerHeight: number;
    lineHeight: number;
    paddingX: number;
    paddingY: number;
    radius: number;
    width: number;
    x: number;
    y: number;
  };
  height: number;
  maxQuestionLines: number;
  width: number;
};

const MAX_VIDEO_EXPORT_SECONDS = 60;
const VIDEO_EXPORT_FRAME_RATE = 30;

const storyCanvasLayout: ShareCanvasLayout = {
  card: {
    bodyFontSize: 42,
    headerFontSize: 26,
    headerHeight: 78,
    lineHeight: 50,
    paddingX: 56,
    paddingY: 32,
    radius: 24,
    width: 800,
    x: 140,
    y: 112,
  },
  height: 1920,
  maxQuestionLines: 2,
  width: 1080,
};

const getCanvasPalette = (): ShareCanvasPalette => {
  if (typeof window === "undefined") {
    return {
      foreground: "#0f172a",
      primary: "#308ce8",
      surface: "#ffffff",
    };
  }

  const styles = window.getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;

  return {
    foreground: read("--foreground", "#0f172a"),
    primary: read("--lectum-primary", "#308ce8"),
    surface: read("--lectum-surface", "#ffffff"),
  };
};

const waitForEvent = <K extends keyof HTMLMediaElementEventMap>(
  element: HTMLMediaElement,
  eventName: K,
  timeoutMs = 8000,
) =>
  new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Tempo esgotado aguardando ${eventName}.`));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timeout);
      element.removeEventListener(eventName, handleEvent);
      element.removeEventListener("error", handleError);
    };

    const handleEvent = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Não foi possível carregar a mídia para compartilhamento."));
    };

    element.addEventListener(eventName, handleEvent, { once: true });
    element.addEventListener("error", handleError, { once: true });
  });

const loadVideoElement = async (src: string) => {
  const video = document.createElement("video") as VideoWithCaptureStream;
  video.crossOrigin = "anonymous";
  video.muted = false;
  video.playsInline = true;
  video.preload = "auto";
  video.src = src;
  video.load();

  if (video.readyState < 1) {
    await waitForEvent(video, "loadedmetadata");
  }

  if (video.readyState < 2) {
    await waitForEvent(video, "loadeddata");
  }

  return video;
};

const loadImageElement = async (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("NÃ£o foi possÃ­vel carregar a imagem."));
    image.src = src;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível gerar o arquivo de compartilhamento."));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });

const createCanvas = (layout: ShareCanvasLayout) => {
  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;

  return canvas;
};

const drawRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
};

const mediaDimensions = (
  media: ShareMediaElement,
  fallbackWidth: number,
  fallbackHeight: number,
) => {
  if (media instanceof HTMLVideoElement) {
    return {
      height: media.videoHeight || fallbackHeight,
      width: media.videoWidth || fallbackWidth,
    };
  }

  return {
    height: media.naturalHeight || fallbackHeight,
    width: media.naturalWidth || fallbackWidth,
  };
};

const drawMediaCover = (
  ctx: CanvasRenderingContext2D,
  media: ShareMediaElement,
  width: number,
  height: number,
) => {
  const { height: mediaHeight, width: mediaWidth } = mediaDimensions(media, width, height);
  const sourceRatio = mediaWidth / mediaHeight;
  const targetRatio = width / height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = mediaWidth;
  let sourceHeight = mediaHeight;

  if (sourceRatio > targetRatio) {
    sourceWidth = mediaHeight * targetRatio;
    sourceX = (mediaWidth - sourceWidth) / 2;
  } else {
    sourceHeight = mediaWidth / targetRatio;
    sourceY = (mediaHeight - sourceHeight) / 2;
  }

  ctx.drawImage(media, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
};

const drawMediaContain = (
  ctx: CanvasRenderingContext2D,
  media: ShareMediaElement,
  width: number,
  height: number,
) => {
  const { height: mediaHeight, width: mediaWidth } = mediaDimensions(media, width, height);
  const scale = Math.min(width / mediaWidth, height / mediaHeight);
  const targetWidth = mediaWidth * scale;
  const targetHeight = mediaHeight * scale;
  const targetX = (width - targetWidth) / 2;
  const targetY = (height - targetHeight) / 2;

  ctx.drawImage(media, targetX, targetY, targetWidth, targetHeight);
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) => {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      lines.push(word);
    }

    if (lines.length >= maxLines) break;
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (lines.length > maxLines) {
    lines.length = maxLines;
  }

  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    let lastLine = lines[maxLines - 1];
    while (lastLine.length > 1 && ctx.measureText(`${lastLine}...`).width > maxWidth) {
      lastLine = lastLine.slice(0, -1).trimEnd();
    }
    lines[maxLines - 1] = `${lastLine}...`;
  }

  return lines;
};

const drawQuestionCard = (
  ctx: CanvasRenderingContext2D,
  layout: ShareCanvasLayout,
  target: LectumShareSocialTarget,
  palette: ShareCanvasPalette,
) => {
  const { card } = layout;
  const textMaxWidth = card.width - card.paddingX * 2;

  ctx.font = `700 ${card.bodyFontSize}px Manrope, Arial, sans-serif`;
  const lines = wrapText(ctx, target.sourceText, textMaxWidth, layout.maxQuestionLines);
  const cardHeight = card.headerHeight + card.paddingY * 2 + lines.length * card.lineHeight;

  ctx.save();
  ctx.shadowBlur = 28;
  ctx.shadowColor = "rgba(2, 8, 23, 0.18)";
  ctx.shadowOffsetY = 12;
  drawRoundRect(ctx, card.x, card.y, card.width, cardHeight, card.radius);
  const cardFill = ctx.createLinearGradient(card.x, card.y, card.x, card.y + cardHeight);
  cardFill.addColorStop(0, "rgba(255, 255, 255, 0.98)");
  cardFill.addColorStop(1, "rgba(248, 250, 252, 0.94)");
  ctx.fillStyle = cardFill;
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundRect(ctx, card.x, card.y, card.width, cardHeight, card.radius);
  ctx.clip();
  const headerGradient = ctx.createLinearGradient(card.x, card.y, card.x + card.width, card.y);
  headerGradient.addColorStop(0, palette.primary);
  headerGradient.addColorStop(0.55, "#2f95f2");
  headerGradient.addColorStop(1, "#1677d2");
  ctx.fillStyle = headerGradient;
  ctx.fillRect(card.x, card.y, card.width, card.headerHeight);
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.fillRect(card.x, card.y + card.headerHeight - 2, card.width, 2);
  ctx.restore();

  ctx.save();
  drawRoundRect(ctx, card.x, card.y, card.width, cardHeight, card.radius);
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${card.headerFontSize}px Manrope, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(target.cardLabel, card.x + card.width / 2, card.y + card.headerHeight / 2);

  ctx.fillStyle = "#0f172a";
  ctx.font = `700 ${card.bodyFontSize}px Manrope, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let lineY = card.y + card.headerHeight + card.paddingY + card.bodyFontSize;
  for (const line of lines) {
    ctx.fillText(line, card.x + card.width / 2, lineY);
    lineY += card.lineHeight;
  }
};

const drawLectumShareFrame = (
  ctx: CanvasRenderingContext2D,
  media: ShareMediaElement,
  layout: ShareCanvasLayout,
  target: LectumShareSocialTarget,
  palette: ShareCanvasPalette,
) => {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, layout.width, layout.height);

  if (target.mediaType === "image") {
    ctx.save();
    ctx.filter = "blur(34px)";
    drawMediaCover(ctx, media, layout.width, layout.height);
    ctx.restore();

    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.fillRect(0, 0, layout.width, layout.height);
  }

  drawMediaContain(ctx, media, layout.width, layout.height);
  drawQuestionCard(ctx, layout, target, palette);
};

const supportedVideoMimeType = () => {
  if (typeof MediaRecorder === "undefined") return null;

  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
};

const extensionFromMimeType = (mimeType: string) => (mimeType.includes("mp4") ? "mp4" : "webm");

const safeFileName = (target: LectumShareSocialTarget, extension: string) =>
  `${target.kind === "post_media" ? "lectum-postado" : "lectum-respondido"}-vertical-9x16.${extension}`;

const createImageShareFile = async (target: LectumShareSocialTarget, media: ShareMediaElement) => {
  const layout = storyCanvasLayout;
  const canvas = createCanvas(layout);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas indisponível para gerar o compartilhamento.");
  }

  drawLectumShareFrame(ctx, media, layout, target, getCanvasPalette());
  const blob = await canvasToBlob(canvas, "image/png");

  return new File([blob], safeFileName(target, "png"), {
    type: "image/png",
  });
};

const createVideoShareFile = async (
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

const createLectumShareFile = async (target: LectumShareSocialTarget) => {
  const mediaUrl = resolvePublicMediaUrl(target.mediaUrl);

  if (!mediaUrl) {
    throw new Error("M?dia indispon?vel para compartilhamento.");
  }

  if ("fonts" in document) {
    await document.fonts.ready.catch(() => undefined);
  }

  if (target.mediaType === "image") {
    const image = await loadImageElement(mediaUrl);

    return createImageShareFile(target, image);
  }

  const video = await loadVideoElement(mediaUrl);

  try {
    return await createVideoShareFile(target, video);
  } catch {
    const fallbackVideo = await loadVideoElement(mediaUrl);

    return createImageShareFile(target, fallbackVideo);
  }
};

const downloadFile = (file: File) => {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const copyShareUrl = async (url: string) => {
  if (!navigator.clipboard?.writeText) return false;

  await navigator.clipboard.writeText(url);
  return true;
};

export const shareLectumVideoResponse = async (
  target: LectumShareSocialTarget,
): Promise<ShareExportResult> => {
  const file = await createLectumShareFile(target);
  const nav = navigator as ShareNavigator;
  const shareData: ShareData = {
    files: [file],
    text: target.shareText,
    title: target.shareTitle,
  };

  if (nav.share && (!nav.canShare || nav.canShare(shareData))) {
    await nav.share(shareData);
    return { channel: "web_share", file, mode: "file" };
  }

  downloadFile(file);
  const copied = await copyShareUrl(target.shareUrl).catch(() => false);

  return { channel: copied ? "clipboard" : null, file, mode: "download" };
};

export const copyLectumShareUrl = async (target: LectumShareVideoTarget) => {
  const copied = await copyShareUrl(target.shareUrl);

  if (!copied) {
    throw new Error("Clipboard indisponível.");
  }
};

export const copyLectumShareText = async (target: LectumShareSocialTarget) => {
  if (!target.responseText) {
    throw new Error("Texto indisponível.");
  }

  const copied = await copyShareUrl(target.responseText);

  if (!copied) {
    throw new Error("Clipboard indisponível.");
  }
};
