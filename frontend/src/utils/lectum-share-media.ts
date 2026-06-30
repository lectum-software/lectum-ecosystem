import type { LectumShareChannel, LectumShareVideoTarget } from "@/utils/lectum-share-target";
import { resolvePublicMediaUrl } from "@/utils/media";

type ShareNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

type VideoWithCaptureStream = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

type CanvasWithCaptureStream = HTMLCanvasElement & {
  captureStream?: (frameRate?: number) => MediaStream;
};

type LoadedVisualAssets = {
  avatar: HTMLImageElement | null;
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
    lineHeight: number;
    paddingX: number;
    paddingY: number;
    radius: number;
    width: number;
    x: number;
    y: number;
  };
  chip: {
    avatarSize: number;
    height: number;
    nameFontSize: number;
    roleFontSize: number;
    x: number;
    y: number;
  };
  height: number;
  logo: {
    bottom: number;
    fontSize: number;
    right: number;
  };
  maxQuestionLines: number;
  width: number;
};

const MAX_VIDEO_EXPORT_SECONDS = 60;
const VIDEO_EXPORT_FRAME_RATE = 30;

const storyCanvasLayout: ShareCanvasLayout = {
  card: {
    bodyFontSize: 66,
    headerFontSize: 40,
    lineHeight: 78,
    paddingX: 72,
    paddingY: 52,
    radius: 44,
    width: 930,
    x: 75,
    y: 98,
  },
  chip: {
    avatarSize: 84,
    height: 118,
    nameFontSize: 46,
    roleFontSize: 34,
    x: 64,
    y: 1728,
  },
  height: 1920,
  logo: {
    bottom: 74,
    fontSize: 72,
    right: 68,
  },
  maxQuestionLines: 3,
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

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    image.src = src;
  });

const loadVisualAssets = async (target: LectumShareVideoTarget): Promise<LoadedVisualAssets> => {
  const avatarUrl = target.professional.avatar
    ? resolvePublicMediaUrl(target.professional.avatar)
    : null;

  const avatar = avatarUrl ? await loadImageElement(avatarUrl).catch(() => null) : null;

  return {
    avatar,
  };
};

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

const drawVideoCover = (
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
) => {
  const videoWidth = video.videoWidth || width;
  const videoHeight = video.videoHeight || height;
  const sourceRatio = videoWidth / videoHeight;
  const targetRatio = width / height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = videoWidth;
  let sourceHeight = videoHeight;

  if (sourceRatio > targetRatio) {
    sourceWidth = videoHeight * targetRatio;
    sourceX = (videoWidth - sourceWidth) / 2;
  } else {
    sourceHeight = videoWidth / targetRatio;
    sourceY = (videoHeight - sourceHeight) / 2;
  }

  ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
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
  target: LectumShareVideoTarget,
  palette: ShareCanvasPalette,
) => {
  const { card } = layout;
  const textMaxWidth = card.width - card.paddingX * 2;

  ctx.font = `800 ${card.bodyFontSize}px Manrope, Arial, sans-serif`;
  const lines = wrapText(ctx, target.sourceText, textMaxWidth, layout.maxQuestionLines);
  const cardHeight = card.paddingY * 2 + card.headerFontSize + 28 + lines.length * card.lineHeight;

  ctx.save();
  ctx.shadowBlur = 24;
  ctx.shadowColor = "rgba(15, 23, 42, 0.24)";
  ctx.shadowOffsetY = 16;
  drawRoundRect(ctx, card.x, card.y, card.width, cardHeight, card.radius);
  ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundRect(ctx, card.x, card.y, card.width, cardHeight, card.radius);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = palette.primary;
  ctx.font = `800 ${card.headerFontSize}px Manrope, Arial, sans-serif`;
  ctx.fillText("Perguntaram na Lectum", card.x + card.paddingX, card.y + card.paddingY);

  ctx.fillStyle = "#0f172a";
  ctx.font = `900 ${card.bodyFontSize}px Manrope, Arial, sans-serif`;
  let lineY = card.y + card.paddingY + card.headerFontSize + 68;
  for (const line of lines) {
    ctx.fillText(line, card.x + card.paddingX, lineY);
    lineY += card.lineHeight;
  }
};

const initialsFromName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const drawCircleImage = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number,
) => {
  const sourceSize = Math.min(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
  );
  const sourceX = ((image.naturalWidth || image.width) - sourceSize) / 2;
  const sourceY = ((image.naturalHeight || image.height) - sourceSize) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, x, y, size, size);
  ctx.restore();
};

const drawVerifiedBadge = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const radius = size / 2;

  ctx.save();
  ctx.fillStyle = "#2f8deb";
  ctx.beginPath();
  ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(4, size * 0.13);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.29, y + size * 0.53);
  ctx.lineTo(x + size * 0.44, y + size * 0.68);
  ctx.lineTo(x + size * 0.73, y + size * 0.34);
  ctx.stroke();
  ctx.restore();
};

const drawIdentityChip = (
  ctx: CanvasRenderingContext2D,
  layout: ShareCanvasLayout,
  target: LectumShareVideoTarget,
  assets: LoadedVisualAssets,
) => {
  const { chip } = layout;
  const avatarPadding = (chip.height - chip.avatarSize) / 2;
  const nameX = chip.x + avatarPadding * 2 + chip.avatarSize;
  const nameY = chip.y + chip.height * 0.43;
  const roleY = chip.y + chip.height * 0.73;

  ctx.font = `900 ${chip.nameFontSize}px Manrope, Arial, sans-serif`;
  const nameWidth = ctx.measureText(target.professional.name).width;
  ctx.font = `700 ${chip.roleFontSize}px Manrope, Arial, sans-serif`;
  const roleWidth = ctx.measureText(target.professional.roleLabel).width;
  const verifiedSpace = target.professional.verified ? chip.nameFontSize * 0.95 : 0;
  const chipWidth = Math.min(
    layout.width - chip.x - layout.logo.right - 270,
    Math.max(
      360,
      Math.max(nameWidth + verifiedSpace, roleWidth) + chip.avatarSize + avatarPadding * 4,
    ),
  );

  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = "rgba(15, 23, 42, 0.24)";
  ctx.shadowOffsetY = 8;
  drawRoundRect(ctx, chip.x, chip.y, chipWidth, chip.height, chip.height / 2);
  ctx.fillStyle = "rgba(15, 23, 42, 0.52)";
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundRect(ctx, chip.x, chip.y, chipWidth, chip.height, chip.height / 2);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.48)";
  ctx.stroke();
  ctx.restore();

  const avatarX = chip.x + avatarPadding;
  const avatarY = chip.y + avatarPadding;

  ctx.save();
  ctx.beginPath();
  ctx.arc(
    avatarX + chip.avatarSize / 2,
    avatarY + chip.avatarSize / 2,
    chip.avatarSize / 2,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fill();
  ctx.restore();

  if (assets.avatar) {
    drawCircleImage(ctx, assets.avatar, avatarX + 4, avatarY + 4, chip.avatarSize - 8);
  } else {
    ctx.fillStyle = "#308ce8";
    ctx.beginPath();
    ctx.arc(
      avatarX + chip.avatarSize / 2,
      avatarY + chip.avatarSize / 2,
      chip.avatarSize / 2 - 4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${chip.avatarSize * 0.34}px Manrope, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      initialsFromName(target.professional.name),
      avatarX + chip.avatarSize / 2,
      avatarY + chip.avatarSize / 2 + 1,
    );
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${chip.nameFontSize}px Manrope, Arial, sans-serif`;
  ctx.fillText(target.professional.name, nameX, nameY);

  if (target.professional.verified) {
    const badgeSize = chip.nameFontSize * 0.72;
    drawVerifiedBadge(
      ctx,
      nameX + nameWidth + chip.nameFontSize * 0.25,
      nameY - badgeSize + 4,
      badgeSize,
    );
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.74)";
  ctx.font = `700 ${chip.roleFontSize}px Manrope, Arial, sans-serif`;
  ctx.fillText(target.professional.roleLabel, nameX, roleY);
};

const drawBottomGradient = (ctx: CanvasRenderingContext2D, layout: ShareCanvasLayout) => {
  const gradient = ctx.createLinearGradient(0, layout.height * 0.58, 0, layout.height);
  gradient.addColorStop(0, "rgba(15, 23, 42, 0)");
  gradient.addColorStop(1, "rgba(15, 23, 42, 0.56)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, layout.height * 0.56, layout.width, layout.height * 0.44);
};

const drawLectumLogo = (ctx: CanvasRenderingContext2D, layout: ShareCanvasLayout) => {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${layout.logo.fontSize}px Manrope, Arial, sans-serif`;
  const text = "lectum";
  const width = ctx.measureText(text).width;
  ctx.fillText(text, layout.width - layout.logo.right - width, layout.height - layout.logo.bottom);
  ctx.restore();
};

const drawLectumShareFrame = (
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  layout: ShareCanvasLayout,
  target: LectumShareVideoTarget,
  assets: LoadedVisualAssets,
  palette: ShareCanvasPalette,
) => {
  drawVideoCover(ctx, video, layout.width, layout.height);
  drawBottomGradient(ctx, layout);
  drawQuestionCard(ctx, layout, target, palette);
  drawIdentityChip(ctx, layout, target, assets);
  drawLectumLogo(ctx, layout);
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

const safeFileName = (extension: string) => `lectum-video-resposta-vertical-9x16.${extension}`;

const createImageShareFile = async (
  target: LectumShareVideoTarget,
  video: HTMLVideoElement,
  assets: LoadedVisualAssets,
) => {
  const layout = storyCanvasLayout;
  const canvas = createCanvas(layout);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas indisponível para gerar o compartilhamento.");
  }

  drawLectumShareFrame(ctx, video, layout, target, assets, getCanvasPalette());
  const blob = await canvasToBlob(canvas, "image/png");

  return new File([blob], safeFileName("png"), {
    type: "image/png",
  });
};

const createVideoShareFile = async (
  target: LectumShareVideoTarget,
  video: VideoWithCaptureStream,
  assets: LoadedVisualAssets,
) => {
  const mimeType = supportedVideoMimeType();
  const layout = storyCanvasLayout;
  const canvas = createCanvas(layout) as CanvasWithCaptureStream;
  const ctx = canvas.getContext("2d");

  if (!ctx || !canvas.captureStream || mimeType === null) {
    return createImageShareFile(target, video, assets);
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
      drawLectumShareFrame(ctx, video, layout, target, assets, palette);
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
      resolve(new File([blob], safeFileName(extension), { type: outputType }));
    };

    const start = async () => {
      try {
        if (video.currentTime > 0.05) {
          video.currentTime = 0;
          await waitForEvent(video, "seeked", 4000).catch(() => undefined);
        }

        drawLectumShareFrame(ctx, video, layout, target, assets, palette);
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

const createLectumShareFile = async (target: LectumShareVideoTarget) => {
  const videoUrl = resolvePublicMediaUrl(target.videoUrl);

  if (!videoUrl) {
    throw new Error("Vídeo indisponível para compartilhamento.");
  }

  if ("fonts" in document) {
    await document.fonts.ready.catch(() => undefined);
  }

  const [video, assets] = await Promise.all([loadVideoElement(videoUrl), loadVisualAssets(target)]);

  try {
    return await createVideoShareFile(target, video, assets);
  } catch {
    const fallbackVideo = await loadVideoElement(videoUrl);

    return createImageShareFile(target, fallbackVideo, assets);
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
  target: LectumShareVideoTarget,
): Promise<ShareExportResult> => {
  const file = await createLectumShareFile(target);
  const nav = navigator as ShareNavigator;
  const shareData: ShareData = {
    files: [file],
    text:
      target.sourceKind === "comment"
        ? "Responderam a um comentário na Lectum."
        : "Responderam a uma pergunta na Lectum.",
    title: "Perguntaram na Lectum",
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
