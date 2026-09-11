import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { parseVideoServiceConfig } from "../../config/env.js";
import { assertPathInsideStorage, isVideoJobId, videoStoragePaths } from "./paths.js";
import { parseSingleByteRange } from "./range.js";
import { detectSupportedVideoSignature } from "./signature.js";
import { cleanupExpiredVideoStorage, ensureVideoStorage, removeVideoOutput } from "./storage.js";

const jobId = "a12345678901234567890123";

describe("video storage contracts", () => {
  it("aceita apenas IDs opacos e deriva paths sob a raiz", () => {
    assert.equal(isVideoJobId(jobId), true);
    assert.equal(isVideoJobId("../outside"), false);
    const paths = videoStoragePaths("/srv/video", jobId);
    assert.equal(paths.inputPath, path.resolve("/srv/video", "incoming", jobId, "source"));
    assert.equal(paths.outputPath, path.resolve("/srv/video", "outputs", jobId, "video.mp4"));
    assert.throws(() => assertPathInsideStorage("/srv/video", "/srv/outside"));
  });

  it("reconhece ISO-BMFF e WebM sem confiar em extensão", () => {
    const mp4 = Buffer.alloc(16);
    mp4.writeUInt32BE(16, 0);
    mp4.write("ftyp", 4, "ascii");
    const webm = Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0x00]);

    assert.equal(detectSupportedVideoSignature(mp4), "iso-bmff");
    assert.equal(detectSupportedVideoSignature(webm), "webm");
    assert.equal(detectSupportedVideoSignature(Buffer.from("not-video")), null);
  });

  it("aceita Range único e recusa ranges inválidos ou múltiplos", () => {
    assert.deepEqual(parseSingleByteRange(undefined, 100), null);
    assert.deepEqual(parseSingleByteRange("bytes=0-9", 100), { end: 9, start: 0 });
    assert.deepEqual(parseSingleByteRange("bytes=90-", 100), { end: 99, start: 90 });
    assert.deepEqual(parseSingleByteRange("bytes=-10", 100), { end: 99, start: 90 });
    assert.equal(parseSingleByteRange("bytes=100-101", 100), "invalid");
    assert.equal(parseSingleByteRange("bytes=0-1,3-4", 100), "invalid");
  });

  it("valida escrita concorrente no volume sem colidir o arquivo de readiness", async () => {
    const storageRoot = await mkdtemp(path.join(os.tmpdir(), "lectum-video-storage-"));
    const config = parseVideoServiceConfig({
      NODE_ENV: "test",
      REDIS_URL: "redis://localhost:6379/0",
      VIDEO_SERVICE_API_KEY: "x".repeat(32),
      VIDEO_STORAGE_ROOT: storageRoot,
    });

    try {
      await Promise.all([ensureVideoStorage(config), ensureVideoStorage(config)]);
    } finally {
      await rm(storageRoot, { force: true, recursive: true });
    }
  });

  it("cleanup remove apenas diretórios de jobs conhecidos, nunca outros dados do volume", async () => {
    const storageRoot = await mkdtemp(path.join(os.tmpdir(), "lectum-video-cleanup-"));
    const config = parseVideoServiceConfig({
      NODE_ENV: "test",
      REDIS_URL: "redis://localhost:6379/0",
      VIDEO_SERVICE_API_KEY: "x".repeat(32),
      VIDEO_STORAGE_ROOT: storageRoot,
    });
    try {
      await ensureVideoStorage(config);
      const unrelated = path.join(storageRoot, "outputs", "keep-other-data");
      const expired = path.join(storageRoot, "outputs", jobId);
      await mkdir(unrelated);
      await mkdir(expired);
      await cleanupExpiredVideoStorage({
        activeJobIds: new Set(),
        config,
        now: Date.now() + config.outputTtlSeconds * 1000 + 1000,
      });
      await access(unrelated);
      await assert.rejects(access(expired));
    } finally {
      await rm(storageRoot, { force: true, recursive: true });
    }
  });

  it("recusa diretório estrutural symlink sem apagar o destino externo", async () => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), "lectum-video-symlink-"));
    const storageRoot = path.join(temporary, "storage");
    const config = parseVideoServiceConfig({
      NODE_ENV: "test",
      REDIS_URL: "redis://localhost:6379/0",
      VIDEO_SERVICE_API_KEY: "x".repeat(32),
      VIDEO_STORAGE_ROOT: storageRoot,
    });
    try {
      await ensureVideoStorage(config);
      const outside = path.join(temporary, "outside");
      await mkdir(path.join(outside, jobId), { recursive: true });
      const sentinel = path.join(outside, jobId, "keep");
      await writeFile(sentinel, "isolated audit sentinel");
      await rm(path.join(storageRoot, "outputs"), { recursive: true });
      await symlink(outside, path.join(storageRoot, "outputs"));
      await assert.rejects(removeVideoOutput(config, jobId));
      await access(sentinel);
    } finally {
      await rm(temporary, { force: true, recursive: true });
    }
  });
});
