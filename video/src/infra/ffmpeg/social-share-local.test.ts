import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { parseVideoServiceConfig } from "../../config/env.js";
import { VideoProcessingError } from "../../domain/jobs/contracts.js";
import {
  probeVideo,
  validateInputProbe,
  validateOutputProbe,
  validatePublishedOutput,
} from "./probe.js";
import { ManagedProcessError, runManagedProcess } from "./process.js";
import { buildSocialShareVideoArguments, renderSocialShareVideo } from "./social-share.js";
import {
  resolveSocialShareFontFile,
  resolveSocialShareRegularFontFile,
} from "./social-share-assets.js";
import { measureSocialShareProfessionalName } from "./social-share-name-metrics.js";

const config = parseVideoServiceConfig({
  NODE_ENV: "test",
  REDIS_URL: "redis://localhost:6379/0",
  VIDEO_SERVICE_API_KEY: "x".repeat(32),
});
const metadata = {
  cardLabel: "Respondido na Lectum",
  professionalName: "Teste local",
  professionalRoleLabel: "Psicólogo(a)",
  professionalVerified: true,
  responseText: null,
  sourceText: "Teste local de dimensões",
};

// Real local media/process tests only: no HTTP, queue, credentials or provider calls.
describe("social share local FFmpeg output", () => {
  let directory: string;
  let unavailableReason: string | undefined;

  before(async () => {
    try {
      const filters = await runManagedProcess({
        args: ["-hide_banner", "-filters"],
        command: config.ffmpegPath,
        timeoutMs: 10_000,
      });
      await runManagedProcess({
        args: ["-version"],
        command: config.ffprobePath,
        timeoutMs: 10_000,
      });
      if (!/\bdrawtext\s/u.test(filters)) {
        unavailableReason = "FFmpeg local sem drawtext; exige build com libfreetype";
        return;
      }
    } catch (error) {
      if (
        error instanceof ManagedProcessError &&
        error.diagnosticCode === "process_binary_unavailable"
      ) {
        unavailableReason = "FFmpeg/ffprobe não instalado; sem evidência de render real";
        return;
      }
      throw error;
    }

    directory = await mkdtemp(join(tmpdir(), "lectum-social-share-local-"));
    for (const withAudio of [true, false]) {
      await runManagedProcess({
        args: [
          "-hide_banner",
          "-nostdin",
          "-loglevel",
          "error",
          "-y",
          "-f",
          "lavfi",
          "-i",
          "testsrc2=size=320x180:rate=12:duration=0.5",
          ...(withAudio
            ? ["-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=0.5"]
            : []),
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-shortest",
          join(directory, withAudio ? "audio.mp4" : "silent.mp4"),
        ],
        command: config.ffmpegPath,
        timeoutMs: 60_000,
      });
    }
  });

  after(async () => {
    if (directory) await rm(directory, { force: true, recursive: true });
  });

  for (const [index, name] of [
    "Rousel Cesconetto",
    "Rousel Cesconetto fjfkfkgmqmqkqmfkfifngofkgo",
    "W".repeat(30),
    "i".repeat(30),
    "João Márcia Gonçalves de Sá Silva",
  ].entries()) {
    it(`preserva margem real no MP4 decodificado: caso ${index}`, async (context) => {
      if (unavailableReason) return context.skip(unavailableReason);
      const fontFile =
        (await resolveSocialShareFontFile()) ??
        (await resolveSocialShareFontFile(["C:/Windows/Fonts/arialbd.ttf"]));
      const inputMetadata = { ...metadata, professionalName: name };
      const layout = await measureSocialShareProfessionalName({
        config,
        metadata: inputMetadata,
        fontFile,
      });
      assert.ok(layout.width > 0 && layout.width <= 910);
      for (const withBadgeAsset of [true, false]) {
        const outputPath = join(directory, `name-${index}-${withBadgeAsset}.mp4`);
        await runManagedProcess({
          command: config.ffmpegPath,
          timeoutMs: 60_000,
          args: buildSocialShareVideoArguments(
            {
              config,
              metadata: inputMetadata,
              outputPath,
              source: { inputPath: join(directory, "silent.mp4"), kind: "file" },
            },
            {
              fontFile,
              regularFontFile: fontFile,
              professionalNameLayout: layout,
              ...(withBadgeAsset ? {} : { verifiedBadgeFile: null, filterMode: "portable" }),
            },
          ),
        });
        const rgbPath = join(directory, `name-${index}-${withBadgeAsset}.rgb`);
        await runManagedProcess({
          command: config.ffmpegPath,
          timeoutMs: 30_000,
          args: [
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            outputPath,
            "-vf",
            "crop=1080:40:0:1400",
            "-frames:v",
            "1",
            "-pix_fmt",
            "rgb24",
            "-f",
            "rawvideo",
            rgbPath,
          ],
        });
        const pixels = await readFile(rgbPath);
        const nameX = Math.round((1080 - layout.width - 42) / 2);
        const badgeX = nameX + layout.width + 16;
        let lastNamePixel = -1;
        let firstBadgePixel = 1080;
        for (let y = 0; y < 40; y++) {
          for (let x = 0; x < 1080; x++) {
            const offset = (y * 1080 + x) * 3;
            const r = pixels[offset] ?? 0;
            const g = pixels[offset + 1] ?? 0;
            const b = pixels[offset + 2] ?? 0;
            if (x < badgeX && r > 180 && g > 180 && b > 180)
              lastNamePixel = Math.max(lastNamePixel, x);
            if (b > 160 && b > r + 60 && g > r + 30) firstBadgePixel = Math.min(firstBadgePixel, x);
          }
        }
        assert.ok(lastNamePixel >= nameX, "nome visivel no MP4");
        assert.ok(firstBadgePixel < 1080, "selo visivel no MP4");
        assert.ok(firstBadgePixel - lastNamePixel >= 14, "margem preservada apos compressao H.264");
      }
    });
  }

  for (const scenario of [
    {
      name: "default",
      maxWidth: 1080,
      maxHeight: 1920,
      width: 1080,
      height: 1920,
      mode: "standard",
      assets: true,
      audio: true,
    },
    {
      name: "bounded-auto",
      maxWidth: 720,
      maxHeight: 1280,
      width: 720,
      height: 1280,
      mode: "auto",
      assets: true,
      audio: true,
    },
    {
      name: "width-only",
      maxWidth: 720,
      maxHeight: 1920,
      width: 720,
      height: 1280,
      mode: "portable",
      assets: true,
      audio: true,
    },
    {
      name: "height-only",
      maxWidth: 1080,
      maxHeight: 1000,
      width: 558,
      height: 992,
      mode: "standard",
      assets: false,
      audio: true,
    },
    {
      name: "odd",
      maxWidth: 719,
      maxHeight: 1279,
      width: 702,
      height: 1248,
      mode: "portable",
      assets: false,
      audio: false,
    },
    {
      name: "minimum",
      maxWidth: 240,
      maxHeight: 240,
      width: 126,
      height: 224,
      mode: "standard",
      assets: false,
      audio: false,
    },
  ] as const) {
    it(`renderiza e valida ${scenario.name}: ${scenario.width}x${scenario.height}`, async (context) => {
      if (unavailableReason) {
        context.skip(unavailableReason);
        return;
      }
      const limitedConfig = {
        ...config,
        maxWidth: scenario.maxWidth,
        maxHeight: scenario.maxHeight,
      };
      const inputPath = join(directory, scenario.audio ? "audio.mp4" : "silent.mp4");
      const outputPath = join(directory, `${scenario.name}.mp4`);
      const source = await probeVideo(limitedConfig, inputPath);
      validateInputProbe(limitedConfig, source);
      const renderInput = {
        config: limitedConfig,
        metadata,
        outputPath,
        source: { inputPath, kind: "file" as const },
      };
      if (scenario.mode === "auto") {
        await renderSocialShareVideo({
          ...renderInput,
          durationSeconds: source.durationSeconds,
          onProgress: () => {},
        });
      } else {
        await runManagedProcess({
          args: buildSocialShareVideoArguments(renderInput, {
            professionalNameLayout: await measureSocialShareProfessionalName({
              config: limitedConfig,
              metadata,
              fontFile: await resolveSocialShareFontFile(),
            }),
            filterMode: scenario.mode,
            fontFile: await resolveSocialShareFontFile(),
            regularFontFile: await resolveSocialShareRegularFontFile(),
            ...(scenario.assets ? {} : { logoFile: null, verifiedBadgeFile: null }),
          }),
          command: config.ffmpegPath,
          timeoutMs: 60_000,
        });
      }
      const { output, outputSizeBytes } = await validateOutputProbe({
        config: limitedConfig,
        filePath: outputPath,
        source,
      });
      assert.equal(output.width, scenario.width);
      assert.equal(output.height, scenario.height);
      assert.equal(output.width * 16, output.height * 9);
      assert.equal(output.width % 2, 0);
      assert.equal(output.height % 2, 0);
      assert.equal(output.videoCodec, "h264");
      assert.equal(output.hasAudio, scenario.audio);
      assert.equal(output.audioCodec, scenario.audio ? "aac" : null);
      assert.ok(outputSizeBytes > 0 && outputSizeBytes <= limitedConfig.maxOutputBytes);
      const published = await validatePublishedOutput(limitedConfig, outputPath);
      assert.equal(published.outputSizeBytes, outputSizeBytes);

      // Each independent cap still rejects a real output that exceeds it.
      for (const stricter of [
        { ...limitedConfig, maxWidth: output.width - 1 },
        { ...limitedConfig, maxHeight: output.height - 1 },
        { ...limitedConfig, maxOutputBytes: outputSizeBytes - 1 },
      ]) {
        await assert.rejects(
          validateOutputProbe({ config: stricter, filePath: outputPath, source }),
          (error: unknown) =>
            error instanceof VideoProcessingError && error.code === "processing_failed",
        );
        await assert.rejects(
          validatePublishedOutput(stricter, outputPath),
          (error: unknown) =>
            error instanceof VideoProcessingError && error.code === "processing_failed",
        );
      }
    });
  }
});
