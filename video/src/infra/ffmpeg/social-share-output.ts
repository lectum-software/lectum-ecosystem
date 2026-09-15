import type { VideoServiceConfig } from "../../config/env.js";

export const SOCIAL_OUTPUT_WIDTH = 1080;
export const SOCIAL_OUTPUT_HEIGHT = 1920;

export const socialShareOutputSizeArguments = (
  config: Pick<VideoServiceConfig, "maxWidth" | "maxHeight">,
): readonly string[] => {
  // Multiples of 18x32 preserve exact 9:16 and even pixels for H.264/yuv420p.
  const units = Math.floor(
    Math.min(
      config.maxWidth / 18,
      config.maxHeight / 32,
      SOCIAL_OUTPUT_WIDTH / 18,
      SOCIAL_OUTPUT_HEIGHT / 32,
    ),
  );
  const width = units * 18;
  const height = units * 32;
  if (width === SOCIAL_OUTPUT_WIDTH && height === SOCIAL_OUTPUT_HEIGHT) return [];

  // Output -s:v scales AFTER the complete filtergraph, including text and assets.
  // Keep the design canvas/default unchanged, without weakening probe validation.
  return ["-s:v", `${width}x${height}`];
};
