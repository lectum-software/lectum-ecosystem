import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseVideoServiceConfig } from "../../config/env.js";
import { buildSocialShareVideoArguments } from "./social-share.js";

const metadata = {
  cardLabel: "Respondido na Lectum",
  professionalName: "Teste local",
  professionalRoleLabel: "Psicólogo(a)",
  professionalVerified: true,
  responseText: null,
  sourceText: "Teste local de dimensões",
};

describe("social share output limits", () => {
  for (const [maxWidth, maxHeight, expectedWidth, expectedHeight] of [
    [1080, 1920, 1080, 1920],
    [4320, 4320, 1080, 1920],
    [720, 1280, 720, 1280],
    [720, 1920, 720, 1280],
    [1080, 1280, 720, 1280],
    [1080, 1000, 558, 992],
    [721, 1281, 720, 1280],
    [719, 1279, 702, 1248],
    [240, 240, 126, 224],
    [240, 4320, 234, 416],
    [4320, 240, 126, 224],
  ] as const) {
    it(`respeita ${maxWidth}x${maxHeight} em todas as variantes, sem distorcer a arte`, () => {
      const config = parseVideoServiceConfig({
        NODE_ENV: "test",
        REDIS_URL: "redis://localhost:6379/0",
        VIDEO_MAX_HEIGHT: String(maxHeight),
        VIDEO_MAX_WIDTH: String(maxWidth),
        VIDEO_SERVICE_API_KEY: "x".repeat(32),
      });

      for (const filterMode of ["standard", "portable"] as const) {
        for (const withAssets of [true, false]) {
          for (const professionalVerified of [true, false]) {
            const args = buildSocialShareVideoArguments(
              {
                config,
                metadata: { ...metadata, professionalVerified },
                outputPath: "/safe/outputs/video.partial.mp4",
                source: { inputPath: "/safe/inputs/source", kind: "file" },
              },
              {
                filterMode,
                fontFile: null,
                ...(withAssets ? {} : { logoFile: null, verifiedBadgeFile: null }),
              },
            );
            const sizeIndex = args.indexOf("-s:v");
            if (expectedWidth === 1080 && expectedHeight === 1920) {
              assert.equal(sizeIndex, -1, "o default não recebe escala extra");
            } else {
              assert.notEqual(sizeIndex, -1);
              assert.equal(args.at(sizeIndex + 1), `${expectedWidth}x${expectedHeight}`);
              assert.ok(sizeIndex > args.indexOf("-filter_complex"));
              assert.ok(sizeIndex < args.length - 1);
            }

            assert.ok(expectedWidth <= maxWidth && expectedHeight <= maxHeight);
            assert.equal(expectedWidth % 2, 0);
            assert.equal(expectedHeight % 2, 0);
            assert.equal(expectedWidth * 16, expectedHeight * 9);
            // Compose at the established design size, then scale the entire output.
            const filter = args.at(args.indexOf("-filter_complex") + 1) ?? "";
            assert.match(filter, /scale=1080:1920/);
            assert.match(filter, /drawbox=x=110:y=274:w=860:h=64/);
            assert.match(filter, /drawtext=text='Psicólogo\(a\)':.*:y=1440:fontsize=21/);
            assert.equal(args.at(args.indexOf("-pix_fmt") + 1), "yuv420p");
            assert.equal(args.at(args.indexOf("-c:v") + 1), "libx264");
            assert.equal(args.at(args.indexOf("-c:a") + 1), "aac");
          }
        }
      }
    });
  }
});
