type RgbColor = {
  b: number;
  g: number;
  r: number;
};

export type CommunityVisualPalette = {
  coverDepthColor: string;
  coverEndColor: string;
  coverStartColor: string;
  gradientColor: string;
  primaryColor: string;
  primaryDarkColor: string;
  softColor: string;
  textColor: string;
};

const FALLBACK_COMMUNITY_COLOR = "#3300FF";
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const BLACK: RgbColor = { b: 0, g: 0, r: 0 };
const WHITE: RgbColor = { b: 255, g: 255, r: 255 };

const clampChannel = (value: number) => Math.min(255, Math.max(0, Math.round(value)));

export const normalizeHexColor = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized || !HEX_COLOR.test(normalized)) return null;

  return normalized.toUpperCase();
};

const hexToRgb = (hex: string): RgbColor => ({
  b: Number.parseInt(hex.slice(5, 7), 16),
  g: Number.parseInt(hex.slice(3, 5), 16),
  r: Number.parseInt(hex.slice(1, 3), 16),
});

const rgbToHex = ({ b, g, r }: RgbColor) =>
  `#${[r, g, b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, "0").toUpperCase())
    .join("")}`;

const mixRgb = (source: RgbColor, target: RgbColor, sourceWeight: number): RgbColor => ({
  b: target.b + (source.b - target.b) * sourceWeight,
  g: target.g + (source.g - target.g) * sourceWeight,
  r: target.r + (source.r - target.r) * sourceWeight,
});

export const deriveCommunityVisualPalette = (value?: string | null): CommunityVisualPalette => {
  const primaryColor = normalizeHexColor(value) ?? FALLBACK_COMMUNITY_COLOR;
  const primary = hexToRgb(primaryColor);
  const primaryDarkColor = rgbToHex(mixRgb(primary, BLACK, 0.58));

  return {
    coverDepthColor: rgbToHex(mixRgb(primary, WHITE, 0.28)),
    coverEndColor: rgbToHex(mixRgb(primary, WHITE, 0.4)),
    coverStartColor: rgbToHex(mixRgb(primary, WHITE, 0.18)),
    gradientColor: rgbToHex(mixRgb(primary, WHITE, 0.28)),
    primaryColor,
    primaryDarkColor,
    softColor: rgbToHex(mixRgb(primary, WHITE, 0.12)),
    textColor: primaryDarkColor,
  };
};

export const communityHeaderBackground = (value?: string | null) => {
  const palette = deriveCommunityVisualPalette(value);

  return `linear-gradient(135deg, ${palette.coverStartColor} 0%, ${palette.coverDepthColor} 54%, ${palette.coverEndColor} 100%)`;
};
