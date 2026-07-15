type RgbColor = {
  b: number;
  g: number;
  r: number;
};

export type CommunityVisualColorFields = {
  visual_gradient_color: string | null;
  visual_primary_color: string | null;
  visual_primary_dark_color: string | null;
  visual_soft_color: string | null;
  visual_text_color: string | null;
};

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const BLACK: RgbColor = { b: 0, g: 0, r: 0 };
const WHITE: RgbColor = { b: 255, g: 255, r: 255 };

const clampChannel = (value: number) => Math.min(255, Math.max(0, Math.round(value)));

export const normalizeCommunityHexColor = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) return null;

  return normalized.toUpperCase();
};

export const isCommunityHexColor = (value?: string | null) => {
  const normalized = normalizeCommunityHexColor(value);

  return !normalized || HEX_COLOR.test(normalized);
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

export const deriveCommunityVisualColorFields = (
  primaryColor?: string | null,
): CommunityVisualColorFields => {
  const normalized = normalizeCommunityHexColor(primaryColor);
  if (!normalized || !HEX_COLOR.test(normalized)) {
    return {
      visual_gradient_color: null,
      visual_primary_color: null,
      visual_primary_dark_color: null,
      visual_soft_color: null,
      visual_text_color: null,
    };
  }

  const rgb = hexToRgb(normalized);
  const darkColor = rgbToHex(mixRgb(rgb, BLACK, 0.58));

  return {
    visual_gradient_color: rgbToHex(mixRgb(rgb, WHITE, 0.28)),
    visual_primary_color: normalized,
    visual_primary_dark_color: darkColor,
    visual_soft_color: rgbToHex(mixRgb(rgb, WHITE, 0.12)),
    visual_text_color: darkColor,
  };
};
