import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseVideoServiceConfig } from "./env.js";

const validEnvironment = (): NodeJS.ProcessEnv => ({
  NODE_ENV: "test",
  REDIS_URL: "redis://localhost:6379/0",
  VIDEO_SERVICE_API_KEY: "x".repeat(32),
});

describe("video service config", () => {
  it("aplica defaults conservadores e converte MiB em bytes", () => {
    const config = parseVideoServiceConfig(validEnvironment(), "/tmp/lectum-video-test");

    assert.equal(config.port, 3003);
    assert.equal(config.workerConcurrency, 1);
    assert.equal(config.maxInputBytes, 500 * 1024 * 1024);
    assert.equal(config.storageRoot, "/tmp/lectum-video-test/.data");
    assert.equal(config.ffmpegPreset, "medium");
  });

  it("recusa segredo curto, Redis HTTP e preset fora da allowlist", () => {
    assert.throws(() =>
      parseVideoServiceConfig({
        ...validEnvironment(),
        REDIS_URL: "https://localhost/redis",
        VIDEO_FFMPEG_PRESET: "$(unsafe)",
        VIDEO_SERVICE_API_KEY: "short",
      }),
    );
  });

  it("exige volume explícito no runtime de produção", () => {
    assert.throws(() => parseVideoServiceConfig({ ...validEnvironment(), NODE_ENV: "production" }));

    const config = parseVideoServiceConfig({
      ...validEnvironment(),
      NODE_ENV: "production",
      REDIS_URL: "redis://default:local-secret@redis:6379/0",
      VIDEO_STORAGE_ROOT: "/var/lib/lectum-video",
    });
    assert.equal(config.storageRoot, "/var/lib/lectum-video");
  });

  it("recusa storage relativo/raiz, Redis sem autenticação e reserva curta em produção", () => {
    assert.throws(() =>
      parseVideoServiceConfig({
        ...validEnvironment(),
        NODE_ENV: "production",
        VIDEO_STORAGE_ROOT: "relative-storage",
      }),
    );
    assert.throws(() =>
      parseVideoServiceConfig({
        ...validEnvironment(),
        NODE_ENV: "production",
        VIDEO_STORAGE_ROOT: "/var/lib/lectum-video",
      }),
    );
    assert.throws(() =>
      parseVideoServiceConfig({
        ...validEnvironment(),
        NODE_ENV: "production",
        REDIS_URL: "redis://default:local-secret@redis:6379/0",
        VIDEO_STORAGE_ROOT: "/",
      }),
    );
    assert.throws(() =>
      parseVideoServiceConfig({
        ...validEnvironment(),
        VIDEO_JOB_ATTEMPTS: "3",
        VIDEO_JOB_TIMEOUT_MS: "7200000",
        VIDEO_UPLOAD_REQUEST_TIMEOUT_MS: "1800000",
        VIDEO_STORAGE_RESERVATION_TTL_SECONDS: "3600",
      }),
    );

    assert.throws(() =>
      parseVideoServiceConfig({
        ...validEnvironment(),
        VIDEO_JOB_ATTEMPTS: "1",
        VIDEO_JOB_TIMEOUT_MS: "60000",
        VIDEO_STORAGE_RESERVATION_TTL_SECONDS: "3600",
        VIDEO_UPLOAD_REQUEST_TIMEOUT_MS: "3600000",
      }),
    );
  });
});
