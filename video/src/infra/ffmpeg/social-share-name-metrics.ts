import type { VideoServiceConfig } from "../../config/env.js";
import type { SocialShareRenderMetadata } from "../../domain/jobs/contracts.js";
import { drawText } from "./drawtext.js";
import { ManagedProcessError, runManagedProcess } from "./process.js";
import { SOCIAL_SHARE_ART_LAYOUT } from "./social-share-layout.js";
import { SOCIAL_OUTPUT_WIDTH } from "./social-share-output.js";
import { normalizeProfessionalName } from "./social-share-text.js";

// Measure actual ink with the very same renderer/font used by the MP4, not a
// character-count heuristic. Only numeric bbox metadata leaves the subprocess.
export const measureSocialShareProfessionalName = async ({
  config,
  metadata,
  fontFile,
  signal,
}: {
  config: VideoServiceConfig;
  metadata: SocialShareRenderMetadata;
  fontFile: string | null;
  signal?: AbortSignal;
}) => {
  const { professional } = SOCIAL_SHARE_ART_LAYOUT;
  const maxWidth =
    SOCIAL_OUTPUT_WIDTH -
    128 -
    (metadata.professionalVerified ? professional.checkGap + professional.badgeWidth : 0);
  let fontSize: number = professional.nameFontSize;
  for (let attempt = 0; attempt < 4; attempt++) {
    const output = await runManagedProcess({
      command: config.ffmpegPath,
      args: [
        "-hide_banner",
        "-nostdin",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=black:s=4096x128:d=0.04",
        "-vf",
        [
          drawText({
            color: "white",
            fontFile,
            fontSize,
            text: normalizeProfessionalName(metadata.professionalName),
            x: 0,
            y: 16,
          }),
          "bbox=min_val=16",
          "metadata=mode=print:file=-",
        ].join(","),
        "-frames:v",
        "1",
        "-f",
        "null",
        "-",
      ],
      maxStdoutBytes: 4096,
      timeoutMs: Math.min(config.jobTimeoutMs, 10_000),
      ...(signal ? { signal } : {}),
    });
    const match = /^lavfi\.bbox\.x2=(\d+)$/mu.exec(output);
    const width = match ? Number(match[1]) + 1 : 0;
    if (width <= 0 || width >= 4096) break;
    if (width <= maxWidth) return { fontSize, width };
    fontSize = Math.max(1, Math.floor((fontSize * maxWidth) / width) - 1);
  }
  throw new ManagedProcessError("failed", { diagnosticCode: "ffmpeg_filtergraph_invalid" });
};
