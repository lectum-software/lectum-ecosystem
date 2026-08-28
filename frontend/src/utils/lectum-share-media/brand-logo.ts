import type { ShareCanvasAssets, ShareCanvasPalette } from "./layout";

export const LECTUM_SHARE_BRAND_LOGO_SRC = "/icon.png";

const BRAND_ICON_BLUE_MINIMUM_VALUE = 120;
const BRAND_ICON_COLOR_CHANNEL_GAP = 20;
const BRAND_ICON_SOURCE_PADDING_RATIO = 0.03;

const parseSolidHexColor = (color: string) => {
  const normalized = color.trim().replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/u.test(normalized)) return null;

  return {
    blue: Number.parseInt(normalized.slice(4, 6), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    red: Number.parseInt(normalized.slice(0, 2), 16),
  };
};

const isLectumBrandPixel = (red: number, green: number, blue: number, alpha: number) =>
  alpha > 0 &&
  blue >= BRAND_ICON_BLUE_MINIMUM_VALUE &&
  blue >= red + BRAND_ICON_COLOR_CHANNEL_GAP &&
  blue >= green + BRAND_ICON_COLOR_CHANNEL_GAP;

export const createMonochromeBrandLogoCanvas = (
  image: HTMLImageElement,
  size: number,
  color: string,
) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) return null;

  const targetColor = parseSolidHexColor(color);
  if (!targetColor) return null;

  try {
    const sourceWidth = Math.max(1, image.naturalWidth || image.width || size);
    const sourceHeight = Math.max(1, image.naturalHeight || image.height || size);
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = sourceWidth;
    sourceCanvas.height = sourceHeight;
    const sourceContext = sourceCanvas.getContext("2d");
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

const drawLectumFallbackBrandIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) => {
  const lineWidth = Math.max(3, size * 0.16);

  ctx.save();
  ctx.strokeStyle = color;
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

export const drawLectumBrandIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  palette: ShareCanvasPalette,
  assets?: ShareCanvasAssets,
) => {
  if (assets?.brandLogoWhite) {
    ctx.drawImage(assets.brandLogoWhite, x, y, size, size);
    return;
  }

  drawLectumFallbackBrandIcon(ctx, x, y, size, palette.surface);
};
