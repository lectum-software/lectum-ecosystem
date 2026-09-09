import { existsSync } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";

const SOCIAL_DRAW_TEXT_BOLD_FONT_FILE_CANDIDATES = [
  "/usr/share/fonts/truetype/manrope/Manrope-Bold.ttf",
  "/usr/share/fonts/truetype/manrope/Manrope-ExtraBold.ttf",
  "/usr/share/fonts/truetype/manrope/Manrope-SemiBold.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
] as const;

const SOCIAL_DRAW_TEXT_REGULAR_FONT_FILE_CANDIDATES = [
  "/usr/share/fonts/truetype/manrope/Manrope-Medium.ttf",
  "/usr/share/fonts/truetype/manrope/Manrope-Regular.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf",
  "/usr/share/fonts/dejavu/DejaVuSans.ttf",
] as const;

export const SOCIAL_DRAW_TEXT_FONT_FILE = SOCIAL_DRAW_TEXT_BOLD_FONT_FILE_CANDIDATES[0];
export const SOCIAL_DRAW_TEXT_REGULAR_FONT_FILE = SOCIAL_DRAW_TEXT_REGULAR_FONT_FILE_CANDIDATES[0];
export const SOCIAL_SHARE_LOGO_FILE_NAME = "lectum-symbol-white.png";
export const SOCIAL_SHARE_VERIFIED_BADGE_FILE_NAME = "verified-badge.png";

const socialShareAssetCandidates = (fileName: string) => [
  join(process.cwd(), "assets", "social", fileName),
  join(process.cwd(), "video", "assets", "social", fileName),
];

export const resolveSocialShareAssetFile = (
  fileName: string,
  candidates: readonly string[] = socialShareAssetCandidates(fileName),
) => candidates.find((candidate) => existsSync(candidate)) ?? null;

export const resolveSocialShareFontFile = async (
  candidates: readonly string[] = SOCIAL_DRAW_TEXT_BOLD_FONT_FILE_CANDIDATES,
) => {
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {}
  }

  return null;
};

export const resolveSocialShareRegularFontFile = async (
  candidates: readonly string[] = SOCIAL_DRAW_TEXT_REGULAR_FONT_FILE_CANDIDATES,
) => resolveSocialShareFontFile(candidates);
