const shareRenderBrowserScript = String.raw`
const {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
  canEncodeVideo,
} = await import("mediabunny");
const { registerAacEncoder } = await import("/vendor/" + "aac-encoder.mjs");

const LAYOUT = {
  card: {
    bodyFontSize: 48,
    brandGap: 14,
    brandIconSize: 36,
    headerFontSize: 36,
    headerHeight: 88,
    lineHeight: 60,
    minBodyHeight: 268,
    paddingX: 50,
    paddingY: 40,
    radius: 24,
    width: 860,
    x: 110,
    y: 250,
  },
  height: 1920,
  maxQuestionLines: 3,
  professionalTag: {
    bottom: 430,
    gap: 14,
    height: 112,
    maxWidth: 720,
    nameFontSize: 34,
    paddingX: 34,
    roleGap: 16,
    roleFontSize: 22,
    verifiedSize: 27,
  },
  width: 1080,
};

const PALETTE = {
  foreground: "#0f172a",
  mediaBackground: "#000000",
  primary: "#308ce8",
  surface: "#ffffff",
};

const OUTPUT_PROFILE = {
  audioBitrate: 96_000,
  frameRate: 30,
  height: 960,
  videoBitrate: 1_200_000,
  width: 540,
};

const TEXT_ELLIPSIS = "...";
const PROFESSIONAL_TAG_NAME_MAX_LENGTH = 18;
const BRAND_ICON_BLUE_MINIMUM_VALUE = 120;
const BRAND_ICON_COLOR_CHANNEL_GAP = 20;
const BRAND_ICON_SOURCE_PADDING_RATIO = 0.03;

const createCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const canvasColorWithAlpha = (color, alpha) => {
  const normalized = String(color || "").trim().replace("#", "");
  const safeAlpha = Math.min(1, Math.max(0, alpha));

  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    return "rgb(" + red + " " + green + " " + blue + " / " + safeAlpha + ")";
  }

  return color;
};

const drawRoundRect = (ctx, x, y, width, height, radius) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
};

const mediaDimensions = (media, fallbackWidth, fallbackHeight) => ({
  height: media.videoHeight || media.naturalHeight || media.height || fallbackHeight,
  width: media.videoWidth || media.naturalWidth || media.width || fallbackWidth,
});

const drawMediaContain = (ctx, media, width, height) => {
  const mediaSize = mediaDimensions(media, width, height);
  const scale = Math.min(width / mediaSize.width, height / mediaSize.height);
  const targetWidth = mediaSize.width * scale;
  const targetHeight = mediaSize.height * scale;
  const targetX = (width - targetWidth) / 2;
  const targetY = (height - targetHeight) / 2;
  ctx.drawImage(media, targetX, targetY, targetWidth, targetHeight);
};

const truncateCanvasTextToWidth = (ctx, text, maxWidth, forceEllipsis = false) => {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  const suffix = forceEllipsis || ctx.measureText(normalized).width > maxWidth ? TEXT_ELLIPSIS : "";

  if (!suffix) return normalized;

  let next = normalized;
  while (next.length > 1 && ctx.measureText(next + suffix).width > maxWidth) {
    next = next.slice(0, -1).trimEnd();
  }

  return next + suffix;
};

const wrapText = (ctx, text, maxWidth, maxLines) => {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  const safeMaxLines = Math.max(0, Math.floor(maxLines));
  if (!normalized || safeMaxLines === 0) return [];

  const words = normalized.split(" ").filter(Boolean);
  const lines = [];
  let currentLine = "";
  let truncated = false;

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const candidate = currentLine ? currentLine + " " + word : word;

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

  if (lines.join(" ") !== normalized) truncated = true;
  if (truncated && lines.length > 0) {
    lines[lines.length - 1] = truncateCanvasTextToWidth(ctx, lines[lines.length - 1], maxWidth, true);
  }

  return lines;
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
    image.src = src;
  });

const parseSolidHexColor = (color) => {
  const normalized = String(color || "").trim().replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  return {
    blue: Number.parseInt(normalized.slice(4, 6), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    red: Number.parseInt(normalized.slice(0, 2), 16),
  };
};

const isLectumBrandPixel = (red, green, blue, alpha) =>
  alpha > 0 &&
  blue >= BRAND_ICON_BLUE_MINIMUM_VALUE &&
  blue >= red + BRAND_ICON_COLOR_CHANNEL_GAP &&
  blue >= green + BRAND_ICON_COLOR_CHANNEL_GAP;

const createMonochromeBrandLogoCanvas = (image, size, fillColor) => {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  const targetColor = parseSolidHexColor(fillColor);
  if (!targetColor) return null;

  try {
    const sourceWidth = Math.max(1, image.naturalWidth || image.width || size);
    const sourceHeight = Math.max(1, image.naturalHeight || image.height || size);
    const sourceCanvas = createCanvas(sourceWidth, sourceHeight);
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!sourceContext) return null;

    sourceContext.clearRect(0, 0, sourceWidth, sourceHeight);
    sourceContext.drawImage(image, 0, 0, sourceWidth, sourceHeight);
    const sourceImageData = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight);
    const sourceData = sourceImageData.data;
    let maxX = -1;
    let maxY = -1;
    let minX = sourceWidth;
    let minY = sourceHeight;

    for (let index = 0; index < sourceData.length; index += 4) {
      const red = sourceData[index];
      const green = sourceData[index + 1];
      const blue = sourceData[index + 2];
      const alpha = sourceData[index + 3];

      if (!isLectumBrandPixel(red, green, blue, alpha)) continue;

      const pixelIndex = index / 4;
      const x = pixelIndex % sourceWidth;
      const y = Math.floor(pixelIndex / sourceWidth);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    if (maxX < minX || maxY < minY) return null;

    const padding = Math.round(
      Math.max(maxX - minX + 1, maxY - minY + 1) * BRAND_ICON_SOURCE_PADDING_RATIO,
    );
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropRight = Math.min(sourceWidth, maxX + padding + 1);
    const cropBottom = Math.min(sourceHeight, maxY + padding + 1);
    const cropWidth = Math.max(1, cropRight - cropX);
    const cropHeight = Math.max(1, cropBottom - cropY);
    const scale = Math.min(size / cropWidth, size / cropHeight);
    const drawWidth = cropWidth * scale;
    const drawHeight = cropHeight * scale;
    const drawX = (size - drawWidth) / 2;
    const drawY = (size - drawHeight) / 2;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.clearRect(0, 0, size, size);
    context.drawImage(
      sourceCanvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      drawX,
      drawY,
      drawWidth,
      drawHeight,
    );

    const imageData = context.getImageData(0, 0, size, size);
    const { data } = imageData;

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const alpha = data[index + 3];

      if (isLectumBrandPixel(red, green, blue, alpha)) {
        data[index] = targetColor.red;
        data[index + 1] = targetColor.green;
        data[index + 2] = targetColor.blue;
        data[index + 3] = alpha;
      } else {
        data[index + 3] = 0;
      }
    }

    context.putImageData(imageData, 0, 0);
  } catch {
    context.clearRect(0, 0, size, size);
    return null;
  }

  return canvas;
};

const assetsPromise = loadImage("/icon.png")
  .then((brandLogo) => ({
    brandLogo,
    brandLogoWhite: createMonochromeBrandLogoCanvas(brandLogo, LAYOUT.card.brandIconSize, "#ffffff"),
  }))
  .catch(() => ({}));

const drawLectumFallbackBrandIcon = (ctx, x, y, size, palette) => {
  const lineWidth = Math.max(3, size * 0.16);

  ctx.save();
  ctx.strokeStyle = palette.surface;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = lineWidth;

  ctx.beginPath();
  ctx.ellipse(x + size * 0.38, y + size * 0.36, size * 0.23, size * 0.27, -0.22, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(x + size * 0.68, y + size * 0.42, size * 0.2, size * 0.25, 0.18, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + size * 0.2, y + size * 0.92);
  ctx.lineTo(x + size * 0.2, y + size * 0.68);
  ctx.quadraticCurveTo(x + size * 0.2, y + size * 0.56, x + size * 0.33, y + size * 0.55);
  ctx.quadraticCurveTo(x + size * 0.49, y + size * 0.55, x + size * 0.49, y + size * 0.75);
  ctx.lineTo(x + size * 0.49, y + size * 0.92);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + size * 0.55, y + size * 0.92);
  ctx.lineTo(x + size * 0.55, y + size * 0.73);
  ctx.quadraticCurveTo(x + size * 0.55, y + size * 0.57, x + size * 0.7, y + size * 0.57);
  ctx.quadraticCurveTo(x + size * 0.82, y + size * 0.57, x + size * 0.82, y + size * 0.68);
  ctx.lineTo(x + size * 0.82, y + size * 0.92);
  ctx.stroke();

  ctx.restore();
};

const drawLectumBrandIcon = (ctx, x, y, size, palette, assets) => {
  if (assets && assets.brandLogoWhite) {
    ctx.drawImage(assets.brandLogoWhite, x, y, size, size);
    return;
  }

  drawLectumFallbackBrandIcon(ctx, x, y, size, palette);
};

const drawVerifiedBadge = (ctx, centerX, centerY, size, palette) => {
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

const drawQuestionCard = (ctx, layout, target, palette, assets) => {
  const card = layout.card;
  const textMaxWidth = card.width - card.paddingX * 2;
  ctx.font = "700 " + card.bodyFontSize + "px Manrope, Arial, sans-serif";
  const lines = wrapText(ctx, target.sourceText, textMaxWidth, layout.maxQuestionLines);
  const bodyContentHeight = card.paddingY * 2 + lines.length * card.lineHeight;
  const bodyHeight = Math.max(card.minBodyHeight, bodyContentHeight);
  const cardHeight = card.headerHeight + bodyHeight;

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
  ctx.font = "800 " + card.headerFontSize + "px Manrope, Arial, sans-serif";
  ctx.textBaseline = "middle";
  const headerCenterY = card.y + card.headerHeight / 2;
  const headerLabelWidth = ctx.measureText(target.cardLabel).width;
  const iconBoxSize = card.brandIconSize;
  const headerGroupWidth = iconBoxSize + card.brandGap + headerLabelWidth;
  const headerGroupX = card.x + (card.width - headerGroupWidth) / 2;
  const iconBoxX = headerGroupX;
  const iconBoxY = headerCenterY - iconBoxSize / 2;

  drawLectumBrandIcon(ctx, iconBoxX, iconBoxY, card.brandIconSize, palette, assets);
  ctx.textAlign = "start";
  ctx.fillStyle = palette.surface;
  ctx.fillText(target.cardLabel, iconBoxX + iconBoxSize + card.brandGap, headerCenterY);

  ctx.fillStyle = palette.foreground;
  ctx.font = "700 " + card.bodyFontSize + "px Manrope, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let lineY = card.y + card.headerHeight + bodyHeight / 2 - ((lines.length - 1) * card.lineHeight) / 2;
  for (const line of lines) {
    ctx.fillText(line, card.x + card.width / 2, lineY);
    lineY += card.lineHeight;
  }
};

const truncateProfessionalName = (name) => {
  const normalized = String(name || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= PROFESSIONAL_TAG_NAME_MAX_LENGTH) return normalized;
  return normalized.slice(0, PROFESSIONAL_TAG_NAME_MAX_LENGTH).trimEnd() + TEXT_ELLIPSIS;
};

const drawProfessionalTag = (ctx, layout, target, palette) => {
  const tag = layout.professionalTag;
  const name = truncateProfessionalName(target.professional.name);
  const roleLabel = target.professional.roleLabel;
  const y = layout.height - tag.bottom - tag.height;
  const badgeSpace = target.professional.verified ? tag.gap * 0.55 + tag.verifiedSize : 0;
  const maxTextWidth = tag.maxWidth - tag.paddingX * 2 - badgeSpace;

  ctx.save();
  ctx.font = "700 " + tag.nameFontSize + "px Manrope, Arial, sans-serif";
  const displayName = truncateCanvasTextToWidth(ctx, name, maxTextWidth);
  const nameWidth = ctx.measureText(displayName).width;
  const nameGroupWidth = nameWidth + badgeSpace;
  const nameStartX = layout.width / 2 - nameGroupWidth / 2;
  const nameY = y + tag.height / 2 - (tag.nameFontSize + tag.roleGap + tag.roleFontSize) / 2 + tag.nameFontSize / 2;
  const roleY = nameY + tag.nameFontSize / 2 + tag.roleGap + tag.roleFontSize / 2;
  ctx.restore();

  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = canvasColorWithAlpha(palette.mediaBackground, 0.72);
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = palette.surface;
  ctx.font = "700 " + tag.nameFontSize + "px Manrope, Arial, sans-serif";
  ctx.textAlign = "start";
  ctx.textBaseline = "middle";
  ctx.fillText(displayName, nameStartX, nameY);
  ctx.fillStyle = canvasColorWithAlpha(palette.surface, 0.76);
  ctx.font = "500 " + tag.roleFontSize + "px Manrope, Arial, sans-serif";
  ctx.textAlign = "start";
  ctx.fillText(roleLabel, nameStartX, roleY);
  ctx.restore();

  if (target.professional.verified) {
    drawVerifiedBadge(
      ctx,
      nameStartX + nameWidth + tag.gap * 0.55 + tag.verifiedSize / 2,
      nameY,
      tag.verifiedSize,
      palette,
    );
  }
};

const drawLectumShareFrame = (ctx, media, layout, target, palette, assets) => {
  ctx.fillStyle = palette.mediaBackground;
  ctx.fillRect(0, 0, layout.width, layout.height);
  drawMediaContain(ctx, media, layout.width, layout.height);
  drawQuestionCard(ctx, layout, target, palette, assets);
  drawProfessionalTag(ctx, layout, target, palette);
};

const waitForFonts = async () => {
  if (!document.fonts || !document.fonts.ready) return;
  await document.fonts.ready.catch(() => undefined);
};

const normalizeOutputBytes = (buffer) => {
  if (buffer instanceof Uint8Array) return buffer;
  if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
  return new Uint8Array(buffer.buffer || buffer);
};

const postRenderResult = async (bytes) => {
  const response = await fetch("/result", {
    body: new Blob([bytes], { type: "video/mp4" }),
    headers: {
      "Content-Type": "video/mp4",
    },
    method: "POST",
  });

  if (!response.ok) throw new Error("RESULT_UPLOAD_FAILED");
};

const fetchSourceBlob = async () => {
  const response = await fetch("/source", { cache: "no-store" });
  if (!response.ok) throw new Error("SOURCE_FETCH_FAILED");
  const blob = await response.blob();
  if (!blob.size) throw new Error("SOURCE_EMPTY");
  return blob;
};

const renderLectumShare = async (target) => {
  try {
    registerAacEncoder();
  } catch {
    // O Chromium ainda pode ter encoder nativo; a rota cai para fallback no cliente se falhar.
  }

  await waitForFonts();

  const videoQuality = new Quality({
    bitrate: OUTPUT_PROFILE.videoBitrate,
    bitrateMode: "constant",
  });
  const canEncodeProfile = await canEncodeVideo("avc", {
    alpha: "discard",
    height: OUTPUT_PROFILE.height,
    hardwareAcceleration: "no-preference",
    quality: videoQuality,
    width: OUTPUT_PROFILE.width,
  }).catch(() => false);

  if (!canEncodeProfile) throw new Error("VIDEO_ENCODER_UNAVAILABLE");

  const sourceBlob = await fetchSourceBlob();
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(sourceBlob) });
  const outputBuffer = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: outputBuffer,
  });
  const canvas = createCanvas(OUTPUT_PROFILE.width, OUTPUT_PROFILE.height);
  const ctx = canvas.getContext("2d");
  const sourceCanvas = createCanvas(1, 1);
  const sourceCtx = sourceCanvas.getContext("2d");
  const assets = await assetsPromise;

  if (!ctx || !sourceCtx) throw new Error("CANVAS_CONTEXT_UNAVAILABLE");

  const scaleX = OUTPUT_PROFILE.width / LAYOUT.width;
  const scaleY = OUTPUT_PROFILE.height / LAYOUT.height;

  try {
    const conversion = await Conversion.init({
      audio: {
        codec: "aac",
        forceTranscode: true,
        numberOfChannels: 2,
        quality: new Quality({
          bitrate: OUTPUT_PROFILE.audioBitrate,
          bitrateMode: "constant",
        }),
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
        fit: "fill",
        forceTranscode: true,
        frameRate: OUTPUT_PROFILE.frameRate,
        hardwareAcceleration: "no-preference",
        height: OUTPUT_PROFILE.height,
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
          drawLectumShareFrame(ctx, sourceCanvas, LAYOUT, target, PALETTE, assets);
          ctx.restore();
          return canvas;
        },
        processedHeight: OUTPUT_PROFILE.height,
        processedWidth: OUTPUT_PROFILE.width,
        quality: videoQuality,
        width: OUTPUT_PROFILE.width,
      },
    });

    if (!conversion.isValid) throw new Error("CONVERSION_INVALID");

    await conversion.execute();
    const bytes = normalizeOutputBytes(outputBuffer.buffer);
    if (!bytes.byteLength) throw new Error("OUTPUT_EMPTY");
    await postRenderResult(bytes);

    return {
      contentType: "video/mp4",
      sizeBytes: bytes.byteLength,
    };
  } finally {
    input.dispose();
  }
};

globalThis.renderLectumShare = renderLectumShare;
globalThis.__lectumReady = true;
`;

export const getShareRenderBrowserPageHtml = () => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lectum Share Renderer</title>
    <script type="importmap">{"imports":{"mediabunny":"/vendor/mediabunny.mjs"}}</script>
    <style>
      html, body { margin: 0; background: #000000; color: #ffffff; font-family: Manrope, Arial, sans-serif; }
      canvas { display: none; }
    </style>
  </head>
  <body>
    <script type="module">${shareRenderBrowserScript}</script>
  </body>
</html>`;
