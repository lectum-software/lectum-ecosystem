import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  isVideoAssetReference,
  isVideoPlaybackFresh,
  selectAdaptiveVideoPlaybackAdapter,
  shouldCleanupVideoAssetAfterFailure,
  shouldFallbackToLegacyVideoPlayback,
  shouldFallbackToLegacyVideoUpload,
  shouldFallbackToLegacyVideoUploadAfterProvisionError,
  TUS_CHUNK_SIZE_BYTES,
  videoAssetIdFromReference,
  videoAssetPlaybackApiPaths,
} from "./video-stream.ts";

const readSource = (...segments) =>
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), ...segments), "utf8");

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

  it("usa upload legado apenas quando a provisao Stream fica indisponivel", () => {
    assert.equal(shouldFallbackToLegacyVideoUpload({}), true);
    assert.equal(shouldFallbackToLegacyVideoUpload({ status: 404 }), true);
    assert.equal(shouldFallbackToLegacyVideoUpload({ status: 405 }), true);
    assert.equal(shouldFallbackToLegacyVideoUpload({ status: 408 }), true);
    assert.equal(shouldFallbackToLegacyVideoUpload({ status: 429 }), true);
    assert.equal(shouldFallbackToLegacyVideoUpload({ status: 500 }), true);
    assert.equal(shouldFallbackToLegacyVideoUpload({ status: 503 }), true);

    assert.equal(shouldFallbackToLegacyVideoUpload({ status: 400 }), false);
    assert.equal(shouldFallbackToLegacyVideoUpload({ status: 401 }), false);
    assert.equal(shouldFallbackToLegacyVideoUpload({ status: 403 }), false);
    assert.equal(shouldFallbackToLegacyVideoUpload({ status: 413 }), false);
    assert.equal(shouldFallbackToLegacyVideoUpload({ status: 422 }), false);
  });

  it("restringe fallback legado a erro de provisao antes do envio TUS", () => {
    assert.equal(
      shouldFallbackToLegacyVideoUploadAfterProvisionError({
        isProvisionError: true,
      }),
      true,
    );
    assert.equal(
      shouldFallbackToLegacyVideoUploadAfterProvisionError({
        isProvisionError: true,
        status: 503,
      }),
      true,
    );

    assert.equal(
      shouldFallbackToLegacyVideoUploadAfterProvisionError({
        isProvisionError: false,
        status: 503,
      }),
      false,
    );
    assert.equal(
      shouldFallbackToLegacyVideoUploadAfterProvisionError({
        isProvisionError: true,
        status: 413,
      }),
      false,
    );
  });

  it("posts e respostas preservam upload de video quando a provisao Stream falha", () => {
    const communitySource = readSource("../api/req/community/index.ts");
    const postsSource = readSource("../api/req/posts/index.ts");

    assert.match(communitySource, /catch \(streamError\)/);
    assert.match(communitySource, /isVideoAssetUploadProvisionError\(streamError\)/);
    assert.match(communitySource, /shouldFallbackToLegacyVideoUploadAfterProvisionError/);
    assert.match(communitySource, /uploadCommunityPostMediaSingle\(slug, uploadFile/);
    assert.match(communitySource, /uploadCommunityPostMediaMultipart\(slug, uploadFile/);

    assert.match(postsSource, /catch \(streamError\)/);
    assert.match(postsSource, /isVideoAssetUploadProvisionError\(streamError\)/);
    assert.match(postsSource, /shouldFallbackToLegacyVideoUploadAfterProvisionError/);
    assert.match(postsSource, /shouldUseMultipartReplyUpload\(uploadFile\)/);
    assert.match(postsSource, /uploadPostReplyMediaSingle\(id, uploadFile/);
    assert.match(postsSource, /uploadPostReplyMediaMultipart\(id, uploadFile/);
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
