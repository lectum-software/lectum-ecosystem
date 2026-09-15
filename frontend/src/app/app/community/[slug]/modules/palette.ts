import { type CSSProperties, useEffect, useMemo, useState } from "react";
import type { CommunityDetail } from "@/api/generator/types/community";
import { resolvePublicMediaUrl } from "@/utils/media";

export type CommunityVisualPalette = {
  coverDepthColor: string;
  coverEndColor: string;
  coverStartColor: string;
  primaryColor: string;
  primaryDarkColor: string;
  softColor: string;
  textColor: string;
  gradientColor: string;
};

export type CommunityPaletteStyle = CSSProperties & {
  "--community-cover-depth": string;
  "--community-cover-end": string;
  "--community-cover-start": string;
  "--community-gradient-color": string;
  "--community-primary-color": string;
  "--community-primary-dark": string;
  "--community-soft-color": string;
  "--community-text-color": string;
};

export type RgbColor = {
  b: number;
  g: number;
  r: number;
};

export type HslColor = {
  h: number;
  l: number;
  s: number;
};

export const FALLBACK_COMMUNITY_PALETTE: CommunityVisualPalette = {
  coverDepthColor: "#A7CDF0",
  coverEndColor: "#7EB4E7",
  coverStartColor: "#D7E9F8",
  primaryColor: "#2F7FD3",
  primaryDarkColor: "#1E3F7E",
  softColor: "#E7F1FB",
  textColor: "#245C9D",
  gradientColor: "#D6E7F7",
};

export const COMMUNITY_PALETTE_CACHE = new Map<string, CommunityVisualPalette>();

export const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const normalizeHexColor = (value?: string | null) => {
  if (!value) return null;

  const trimmed = value.trim();
  const shortMatch = trimmed.match(/^#?([0-9a-fA-F]{3})$/);
  if (shortMatch) {
    return `#${shortMatch[1]
      .split("")
      .map((character) => `${character}${character}`)
      .join("")
      .toUpperCase()}`;
  }

  const longMatch = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
  if (!longMatch) return null;

  return `#${longMatch[1].toUpperCase()}`;
};

export const hexToRgb = (hex: string): RgbColor | null => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
};

export const rgbToHex = ({ b, g, r }: RgbColor) => {
  const toHex = (value: number) =>
    Math.round(clampNumber(value, 0, 255))
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const mixRgb = (source: RgbColor, target: RgbColor, sourceWeight: number): RgbColor => ({
  b: target.b + (source.b - target.b) * sourceWeight,
  g: target.g + (source.g - target.g) * sourceWeight,
  r: target.r + (source.r - target.r) * sourceWeight,
});

export const rgbToHsl = ({ b, g, r }: RgbColor): HslColor => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;

  if (max === red) {
    hue = ((green - blue) / delta) % 6;
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  return {
    h: Math.round((hue * 60 + 360) % 360),
    s: saturation,
    l: lightness,
  };
};

export const paletteFromRgb = (rgb: RgbColor): CommunityVisualPalette => {
  const black = { b: 0, g: 0, r: 0 };
  const white = { b: 255, g: 255, r: 255 };
  const primaryDarkColor = rgbToHex(mixRgb(rgb, black, 0.58));

  return {
    coverDepthColor: rgbToHex(mixRgb(rgb, white, 0.28)),
    coverEndColor: rgbToHex(mixRgb(rgb, white, 0.4)),
    coverStartColor: rgbToHex(mixRgb(rgb, white, 0.18)),
    primaryColor: rgbToHex(rgb),
    primaryDarkColor,
    softColor: rgbToHex(mixRgb(rgb, white, 0.12)),
    textColor: primaryDarkColor,
    gradientColor: rgbToHex(mixRgb(rgb, white, 0.28)),
  };
};

export const resolveStoredCommunityPalette = (
  community: CommunityDetail,
): CommunityVisualPalette | null => {
  const primaryColor = normalizeHexColor(community.visual_primary_color);
  if (!primaryColor) return null;

  const derived = hexToRgb(primaryColor);
  const derivedPalette = derived ? paletteFromRgb(derived) : FALLBACK_COMMUNITY_PALETTE;

  return {
    coverDepthColor: derivedPalette.coverDepthColor,
    coverEndColor: derivedPalette.coverEndColor,
    coverStartColor: derivedPalette.coverStartColor,
    primaryColor,
    primaryDarkColor: derivedPalette.primaryDarkColor,
    softColor: derivedPalette.softColor,
    textColor: derivedPalette.textColor,
    gradientColor: derivedPalette.gradientColor,
  };
};

export const extractCommunityPaletteFromImage = (src: string): Promise<CommunityVisualPalette> => {
  if (typeof window === "undefined") return Promise.resolve(FALLBACK_COMMUNITY_PALETTE);

  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const canvas = document.createElement("canvas");
    const size = 48;

    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      try {
        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          reject(new Error("Canvas indisponível para extrair cor da comunidade."));
          return;
        }

        context.drawImage(image, 0, 0, size, size);
        const { data } = context.getImageData(0, 0, size, size);
        const buckets = new Map<
          string,
          {
            count: number;
            hsl: HslColor;
            r: number;
            g: number;
            b: number;
          }
        >();

        for (let index = 0; index < data.length; index += 16) {
          const alpha = data[index + 3];
          if (alpha < 160) continue;

          const rgb = { r: data[index], g: data[index + 1], b: data[index + 2] };
          const hsl = rgbToHsl(rgb);

          if (hsl.l < 0.08 || hsl.l > 0.93 || hsl.s < 0.14) continue;

          const bucket = {
            r: Math.round(rgb.r / 24) * 24,
            g: Math.round(rgb.g / 24) * 24,
            b: Math.round(rgb.b / 24) * 24,
          };
          const key = `${bucket.r}:${bucket.g}:${bucket.b}`;
          const current = buckets.get(key);

          if (current) {
            current.count += 1;
            current.r += rgb.r;
            current.g += rgb.g;
            current.b += rgb.b;
          } else {
            buckets.set(key, {
              count: 1,
              hsl,
              r: rgb.r,
              g: rgb.g,
              b: rgb.b,
            });
          }
        }

        let best: {
          count: number;
          hsl: HslColor;
          r: number;
          g: number;
          b: number;
          score: number;
        } | null = null;

        for (const bucket of buckets.values()) {
          const score =
            bucket.count *
            (0.6 + bucket.hsl.s) *
            (1 - Math.min(0.45, Math.abs(bucket.hsl.l - 0.5)));

          if (!best || score > best.score) {
            best = { ...bucket, score };
          }
        }

        if (!best) {
          reject(new Error("Nenhuma cor elegível encontrada no avatar da comunidade."));
          return;
        }

        resolve(
          paletteFromRgb({
            r: best.r / best.count,
            g: best.g / best.count,
            b: best.b / best.count,
          }),
        );
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = reject;
    image.src = src;
  });
};

export const useCommunityVisualPalette = (community: CommunityDetail) => {
  const storedPalette = useMemo(() => resolveStoredCommunityPalette(community), [community]);
  const avatarSrc = useMemo(
    () => resolvePublicMediaUrl(community.avatar_url),
    [community.avatar_url],
  );
  const cacheKey = `${community.id}:${community.avatar_url ?? "no-avatar"}`;
  const cachedPalette = avatarSrc ? COMMUNITY_PALETTE_CACHE.get(cacheKey) : undefined;
  const [extractedPalette, setExtractedPalette] = useState<{
    cacheKey: string;
    palette: CommunityVisualPalette;
  } | null>(null);

  useEffect(() => {
    if (storedPalette || !avatarSrc || cachedPalette) return;

    let cancelled = false;

    extractCommunityPaletteFromImage(avatarSrc)
      .then((nextPalette) => {
        if (cancelled) return;

        COMMUNITY_PALETTE_CACHE.set(cacheKey, nextPalette);
        setExtractedPalette({ cacheKey, palette: nextPalette });
      })
      .catch(() => {
        if (!cancelled) setExtractedPalette({ cacheKey, palette: FALLBACK_COMMUNITY_PALETTE });
      });

    return () => {
      cancelled = true;
    };
  }, [avatarSrc, cacheKey, cachedPalette, storedPalette]);

  return (
    storedPalette ??
    cachedPalette ??
    (extractedPalette?.cacheKey === cacheKey
      ? extractedPalette.palette
      : FALLBACK_COMMUNITY_PALETTE)
  );
};
