import type { ShareCanvasAssets, ShareCanvasPalette } from "./layout";

export const LECTUM_SHARE_BRAND_LOGO_SRC = "/icon.png";

const BRAND_ICON_BLUE_MINIMUM_VALUE = 120;
const BRAND_ICON_COLOR_CHANNEL_GAP = 20;

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

  context.clearRect(0, 0, size, size);
  context.drawImage(image, 0, 0, size, size);

  const targetColor = parseSolidHexColor(color);
  if (!targetColor) return null;

  try {
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
