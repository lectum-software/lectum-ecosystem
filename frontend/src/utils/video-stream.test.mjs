import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isVideoAssetReference,
  isVideoPlaybackFresh,
  selectAdaptiveVideoPlaybackAdapter,
  shouldCleanupVideoAssetAfterFailure,
  shouldFallbackToLegacyVideoPlayback,
  TUS_CHUNK_SIZE_BYTES,
  videoAssetIdFromReference,
  videoAssetPlaybackApiPaths,
} from "./video-stream.ts";

describe("Cloudflare Stream frontend contract", () => {
  it("reconhece somente a referência interna estável", () => {
    const path = "/api/private/video-assets/asset_12345678/playback";
    assert.equal(videoAssetIdFromReference(path), "asset_12345678");
    assert.equal(
      videoAssetIdFromReference(`https://homolog-api.lectum.com.br${path}`),
      "asset_12345678",
    );
    assert.equal(
      videoAssetIdFromReference("/api/public/video-assets/asset_12345678/playback"),
      "asset_12345678",
    );
    assert.equal(isVideoAssetReference(`${path}?token=secret`), false);
    assert.equal(isVideoAssetReference("https://example.com/video.mp4"), false);
  });

  it("prioriza o endpoint público e preserva o alias legado durante o rollout", () => {
    assert.deepEqual(videoAssetPlaybackApiPaths("asset_12345678"), {
      legacy: "/api/private/video-assets/asset_12345678/playback",
      public: "/api/public/video-assets/asset_12345678/playback",
    });
    assert.equal(shouldFallbackToLegacyVideoPlayback({ status: 404 }), true);
    assert.equal(
      shouldFallbackToLegacyVideoPlayback({ code: "video_asset_not_found", status: 404 }),
      false,
    );
    assert.equal(shouldFallbackToLegacyVideoPlayback({ status: 401 }), false);
  });

  it("seleciona HLS nativo no Safari e HLS.js em navegadores MSE", () => {
    assert.equal(
      selectAdaptiveVideoPlaybackAdapter({ hlsJsSupported: true, nativeHlsSupported: true }),
      "native",
    );
    assert.equal(
      selectAdaptiveVideoPlaybackAdapter({ hlsJsSupported: true, nativeHlsSupported: false }),
      "hls.js",
    );
    assert.equal(
      selectAdaptiveVideoPlaybackAdapter({ hlsJsSupported: false, nativeHlsSupported: false }),
      "unsupported",
    );
  });

  it("mantém partes TUS no mínimo Cloudflare e limpa somente falhas canceláveis", () => {
    assert.equal(TUS_CHUNK_SIZE_BYTES, 5_242_880);
    assert.equal(shouldCleanupVideoAssetAfterFailure(false, new Error("network")), true);
    assert.equal(
      shouldCleanupVideoAssetAfterFailure(true, new DOMException("cancel", "AbortError")),
      true,
    );
    assert.equal(shouldCleanupVideoAssetAfterFailure(true, new Error("processing timeout")), false);
  });

  it("não conecta o player com token ausente, inválido ou perto da expiração", () => {
    const now = Date.parse("2030-01-02T03:04:05.000Z");

    assert.equal(isVideoPlaybackFresh(null, now), false);
    assert.equal(isVideoPlaybackFresh("invalid", now), false);
    assert.equal(isVideoPlaybackFresh("2030-01-02T03:04:15.000Z", now), false);
    assert.equal(isVideoPlaybackFresh("2030-01-02T03:05:05.000Z", now), true);
  });
});
