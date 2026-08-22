import {
  type LectumShareChannel,
  type LectumShareSocialTarget,
  truncateLectumShareProfessionalTagName,
} from "@/utils/lectum-share-target";

export type ShareNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

export type VideoWithCaptureStream = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

export type ShareMediaElement = HTMLImageElement | HTMLVideoElement;

export type CanvasWithCaptureStream = HTMLCanvasElement & {
  captureStream?: (frameRate?: number) => MediaStream;
};

export type ShareExportResult = {
  channel: LectumShareChannel | null;
  file?: File;
  mode: "clipboard" | "download" | "file" | "link";
};

export type LectumShareFrameTarget = Pick<
  LectumShareSocialTarget,
  "cardLabel" | "mediaType" | "professional" | "sourceText"
>;

export type ShareCanvasPalette = {
  foreground: string;
  mediaBackground: string;
  primary: string;
  surface: string;
};

export type ShareCanvasLayout = {
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
  professionalTag: {
    bottom: number;
    gap: number;
    height: number;
    maxWidth: number;
    nameFontSize: number;
    paddingX: number;
    roleFontSize: number;
    verifiedSize: number;
  };
  width: number;
};

export const MAX_VIDEO_EXPORT_SECONDS = 60;

export const VIDEO_EXPORT_FRAME_RATE = 30;

export const storyCanvasLayout: ShareCanvasLayout = {
  card: {
    bodyFontSize: 36,
    headerFontSize: 24,
    headerHeight: 72,
    lineHeight: 42,
    paddingX: 56,
    paddingY: 28,
    radius: 16,
    width: 780,
    x: 150,
    y: 112,
  },
  height: 1920,
  maxQuestionLines: 2,
  professionalTag: {
    bottom: 448,
    gap: 14,
    height: 78,
    maxWidth: 620,
    nameFontSize: 27,
    paddingX: 34,
    roleFontSize: 19,
    verifiedSize: 24,
  },
  width: 1080,
};

export const getCanvasPalette = (): ShareCanvasPalette => {
  if (typeof window === "undefined") {
    return {
      foreground: "#0f172a",
      mediaBackground: "#000000",
      primary: "#308ce8",
      surface: "#ffffff",
    };
  }

  const styles = window.getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;

  return {
    foreground: read("--foreground", "#0f172a"),
    mediaBackground: read("--lectum-media-background", "#000000"),
    primary: read("--lectum-primary", "#308ce8"),
    surface: read("--lectum-surface", "#ffffff"),
  };
};

export const canvasColorWithAlpha = (color: string, alpha: number) => {
  const normalized = color.trim().replace("#", "");
  const safeAlpha = Math.min(1, Math.max(0, alpha));

  if (/^[0-9a-fA-F]{6}$/u.test(normalized)) {
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);

    return `rgb(${red} ${green} ${blue} / ${safeAlpha})`;
  }

  return color;
};

export const waitForEvent = <K extends keyof HTMLMediaElementEventMap>(
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

export const loadVideoElement = async (src: string) => {
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

export const loadImageElement = async (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    image.src = src;
  });

export const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
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

export const createCanvas = (layout: ShareCanvasLayout) => {
  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;

  return canvas;
};

export const drawRoundRect = (
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

export const mediaDimensions = (
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

export const drawMediaCover = (
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

export const drawMediaContain = (
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

const TEXT_ELLIPSIS = "...";

const truncateCanvasTextToWidth = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  forceEllipsis = false,
) => {
  const normalized = text.replace(/\s+/g, " ").trim();
  const suffix = forceEllipsis || ctx.measureText(normalized).width > maxWidth ? TEXT_ELLIPSIS : "";

  if (!suffix) return normalized;

  let next = normalized;
  while (next.length > 1 && ctx.measureText(`${next}${suffix}`).width > maxWidth) {
    next = next.slice(0, -1).trimEnd();
  }

  return `${next}${suffix}`;
};

export const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) => {
  const normalized = text.replace(/\s+/g, " ").trim();
  const safeMaxLines = Math.max(0, Math.floor(maxLines));
  if (!normalized || safeMaxLines === 0) return [];

  const words = normalized.split(" ").filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";
  let truncated = false;

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);

      if (lines.length >= safeMaxLines) {
        truncated = true;
        currentLine = "";
        break;
      }

      currentLine = word;
    } else {
      lines.push(truncateCanvasTextToWidth(ctx, word, maxWidth));

      if (lines.length >= safeMaxLines) {
        truncated = index < words.length - 1;
        break;
      }
    }
  }

  if (currentLine && lines.length < safeMaxLines) {
    lines.push(currentLine);
  } else if (currentLine) {
    truncated = true;
  }

  if (lines.length > safeMaxLines) {
    lines.length = safeMaxLines;
    truncated = true;
  }

  if (lines.join(" ") !== normalized) {
    truncated = true;
  }

  if (truncated && lines.length > 0) {
    lines[lines.length - 1] = truncateCanvasTextToWidth(
      ctx,
      lines[lines.length - 1],
      maxWidth,
      true,
    );
  }

  return lines;
};

export const truncateTextToWidth = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) => truncateCanvasTextToWidth(ctx, text, maxWidth);

export const drawVerifiedBadge = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  palette: ShareCanvasPalette,
) => {
  const radius = size / 2;

  ctx.save();
  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = palette.surface;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(3, size * 0.14);
  ctx.beginPath();
  ctx.moveTo(centerX - size * 0.24, centerY + size * 0.01);
  ctx.lineTo(centerX - size * 0.06, centerY + size * 0.18);
  ctx.lineTo(centerX + size * 0.26, centerY - size * 0.2);
  ctx.stroke();
  ctx.restore();
};

export const drawQuestionCard = (
  ctx: CanvasRenderingContext2D,
  layout: ShareCanvasLayout,
  target: LectumShareFrameTarget,
  palette: ShareCanvasPalette,
) => {
  const { card } = layout;
  const textMaxWidth = card.width - card.paddingX * 2;

  ctx.font = `700 ${card.bodyFontSize}px Manrope, Arial, sans-serif`;
  const lines = wrapText(ctx, target.sourceText, textMaxWidth, layout.maxQuestionLines);
  const cardHeight = card.headerHeight + card.paddingY * 2 + lines.length * card.lineHeight;

  ctx.save();
  ctx.shadowBlur = 28;
  ctx.shadowColor = canvasColorWithAlpha(palette.foreground, 0.18);
  ctx.shadowOffsetY = 12;
  drawRoundRect(ctx, card.x, card.y, card.width, cardHeight, card.radius);
  const cardFill = ctx.createLinearGradient(card.x, card.y, card.x, card.y + cardHeight);
  cardFill.addColorStop(0, canvasColorWithAlpha(palette.surface, 0.98));
  cardFill.addColorStop(1, canvasColorWithAlpha(palette.surface, 0.94));
  ctx.fillStyle = cardFill;
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundRect(ctx, card.x, card.y, card.width, cardHeight, card.radius);
  ctx.clip();
  const headerGradient = ctx.createLinearGradient(card.x, card.y, card.x + card.width, card.y);
  headerGradient.addColorStop(0, palette.primary);
  headerGradient.addColorStop(0.55, palette.primary);
  headerGradient.addColorStop(1, palette.primary);
  ctx.fillStyle = headerGradient;
  ctx.fillRect(card.x, card.y, card.width, card.headerHeight);
  ctx.fillStyle = canvasColorWithAlpha(palette.surface, 0.18);
  ctx.fillRect(card.x, card.y + card.headerHeight - 2, card.width, 2);
  ctx.restore();

  ctx.save();
  drawRoundRect(ctx, card.x, card.y, card.width, cardHeight, card.radius);
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = canvasColorWithAlpha(palette.surface, 0.78);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = palette.surface;
  ctx.font = `800 ${card.headerFontSize}px Manrope, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(target.cardLabel, card.x + card.width / 2, card.y + card.headerHeight / 2);

  ctx.fillStyle = palette.foreground;
  ctx.font = `700 ${card.bodyFontSize}px Manrope, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let lineY = card.y + card.headerHeight + card.paddingY + card.bodyFontSize;
  for (const line of lines) {
    ctx.fillText(line, card.x + card.width / 2, lineY);
    lineY += card.lineHeight;
  }
};

export const drawProfessionalTag = (
  ctx: CanvasRenderingContext2D,
  layout: ShareCanvasLayout,
  target: LectumShareFrameTarget,
  palette: ShareCanvasPalette,
) => {
  const { professionalTag: tag } = layout;
  const name = truncateLectumShareProfessionalTagName(target.professional.name);
  const roleLabel = target.professional.roleLabel;
  const y = layout.height - tag.bottom - tag.height;
  const badgeSpace = target.professional.verified ? tag.gap * 0.55 + tag.verifiedSize : 0;
  const maxTextWidth = tag.maxWidth - tag.paddingX * 2 - badgeSpace;

  ctx.save();
  ctx.font = `700 ${tag.nameFontSize}px Manrope, Arial, sans-serif`;
  const displayName = truncateTextToWidth(ctx, name, maxTextWidth);
  const nameWidth = ctx.measureText(displayName).width;
  ctx.font = `500 ${tag.roleFontSize}px Manrope, Arial, sans-serif`;
  const roleWidth = ctx.measureText(roleLabel).width;
  const textBlockWidth = Math.max(nameWidth + badgeSpace, roleWidth);
  const tagWidth = Math.min(tag.maxWidth, tag.paddingX * 2 + textBlockWidth);
  const tagX = (layout.width - tagWidth) / 2;
  const textStartX = tagX + tag.paddingX;
  const nameY = y + tag.height / 2 - tag.roleFontSize * 0.48;
  const roleY = y + tag.height / 2 + tag.nameFontSize * 0.56;
  ctx.restore();

  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = canvasColorWithAlpha(palette.mediaBackground, 0.72);
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = palette.surface;
  ctx.font = `700 ${tag.nameFontSize}px Manrope, Arial, sans-serif`;
  ctx.textAlign = "start";
  ctx.textBaseline = "middle";
  ctx.fillText(displayName, textStartX, nameY);
  ctx.fillStyle = canvasColorWithAlpha(palette.surface, 0.76);
  ctx.font = `500 ${tag.roleFontSize}px Manrope, Arial, sans-serif`;
  ctx.fillText(roleLabel, textStartX, roleY);
  ctx.restore();

  if (target.professional.verified) {
    drawVerifiedBadge(
      ctx,
      textStartX + nameWidth + tag.gap * 0.55 + tag.verifiedSize / 2,
      nameY,
      tag.verifiedSize,
      palette,
    );
  }
};

export const drawLectumShareFrame = (
  ctx: CanvasRenderingContext2D,
  media: ShareMediaElement,
  layout: ShareCanvasLayout,
  target: LectumShareFrameTarget,
  palette: ShareCanvasPalette,
) => {
  ctx.fillStyle = palette.mediaBackground;
  ctx.fillRect(0, 0, layout.width, layout.height);

  if (target.mediaType === "image") {
    ctx.save();
    ctx.filter = "blur(34px)";
    drawMediaCover(ctx, media, layout.width, layout.height);
    ctx.restore();

    ctx.fillStyle = canvasColorWithAlpha(palette.mediaBackground, 0.42);
    ctx.fillRect(0, 0, layout.width, layout.height);
  }

  drawMediaContain(ctx, media, layout.width, layout.height);
  drawQuestionCard(ctx, layout, target, palette);
  drawProfessionalTag(ctx, layout, target, palette);
};
