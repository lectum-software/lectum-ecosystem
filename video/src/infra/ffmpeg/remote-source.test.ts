import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { parseVideoServiceConfig } from "../../config/env.js";
import { VideoProcessingError } from "../../domain/jobs/contracts.js";
import { downloadRemoteVideoSourceFile } from "./remote-source.js";

const config = parseVideoServiceConfig({
  NODE_ENV: "test",
  REDIS_URL: "redis://localhost:6379/0",
  VIDEO_MAX_INPUT_MB: "1",
  VIDEO_SERVICE_API_KEY: "x".repeat(32),
});

const isoBmffHeader = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
]);

const withTempDirectory = async (fn: (directory: string) => Promise<void>) => {
  const directory = await mkdtemp(path.join(tmpdir(), "lectum-remote-source-"));
  try {
    await fn(directory);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};

describe("download de fonte remota direta para render social", () => {
  it("baixa MP4 remoto com headers seguros e sem seguir redirects", async () => {
    await withTempDirectory(async (directory) => {
      let capturedInit: RequestInit | undefined;
      const outputPath = path.join(directory, "source");
      await downloadRemoteVideoSourceFile({
        config,
        fetcher: async (_url, init) => {
          capturedInit = init;
          return new Response(isoBmffHeader, {
            headers: {
              "content-length": String(isoBmffHeader.byteLength),
              "content-type": "video/mp4",
            },
            status: 200,
          });
        },
        outputPath,
        requestOrigin: "https://homolog.lectum.com.br",
        sourceUrl: "https://homolog-api.lectum.com.br/public/files/posts/media/video.mp4",
      });

      assert.equal(await readFile(outputPath, "hex"), isoBmffHeader.toString("hex"));
      assert.ok(capturedInit);
      const headers = capturedInit.headers as Headers;
      assert.equal(capturedInit.redirect, "error");
      assert.equal(headers.get("user-agent"), "LectumVideoService/1.0");
      assert.equal(headers.get("origin"), "https://homolog.lectum.com.br");
      assert.equal(headers.get("referer"), "https://homolog.lectum.com.br/");
    });
  });

  it("recusa Content-Length acima do limite antes de gravar arquivo", async () => {
    await withTempDirectory(async (directory) => {
      await assert.rejects(
        () =>
          downloadRemoteVideoSourceFile({
            config,
            fetcher: async () =>
              new Response(isoBmffHeader, {
                headers: {
                  "content-length": String(config.maxInputBytes + 1),
                  "content-type": "video/mp4",
                },
                status: 200,
              }),
            outputPath: path.join(directory, "source"),
            sourceUrl: "https://homolog-api.lectum.com.br/public/files/posts/media/video.mp4",
          }),
        (error) => error instanceof VideoProcessingError && error.code === "invalid_video",
      );
    });
  });
});
