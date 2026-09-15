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
  TUS_CHUNK_SIZE_BYTES,
  videoAssetIdFromReference,
  videoAssetPlaybackApiPaths,
} from "./video-stream.ts";
import {
  boundedUploadNumber,
  isRetryableVideoUploadStatus,
  tusHttpStatus,
  VIDEO_UPLOAD_RETRY_DELAYS_MS,
  VideoUploadFailure,
} from "./video-upload-diagnostics.ts";

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

  it("mantem novos uploads de video sempre no Cloudflare Stream", () => {
    const streamSource = readSource("./video-stream.ts");
    const profileSource = readSource("../api/req/psychologist-free-profile/index.ts");
    const communitySource = readSource("../api/req/community/index.ts");
    const postsSource = readSource("../api/req/posts/index.ts");
    const replyStreamSource = readSource("../api/req/posts/reply-stream-upload.ts");

    assert.doesNotMatch(streamSource, /shouldFallbackToLegacyVideoUpload/);

    const profileUpload = profileSource.split(
      "export const uploadPsychologistFreeProfileVideo =",
    )[1];
    assert.match(profileUpload, /uploadVideoAsset\(\{/);
    assert.match(profileUpload, /purpose: "profile_presentation"/);
    assert.doesNotMatch(profileUpload, /uploadPsychologistFreeProfileVideoLegacy|shouldFallback/);

    const communityUpload = communitySource.split("export const uploadCommunityPostMedia =")[1];
    assert.match(communityUpload, /if \(mimeType\.startsWith\("video\/"\)\)/);
    assert.match(communityUpload, /uploadVideoAsset\(\{/);
    assert.match(communityUpload, /purpose: "community_post"/);
    assert.doesNotMatch(
      communityUpload,
      /catch \(streamError\)|isVideoAssetUploadProvisionError|shouldFallback/,
    );

    const replyUpload = postsSource.split("export const uploadPostReplyMedia =")[1];
    assert.match(replyUpload, /uploadReplyVideoToStream\(\{/);
    assert.doesNotMatch(
      replyUpload,
      /catch \(streamError\)|isVideoAssetUploadProvisionError|shouldFallback/,
    );

    assert.match(replyStreamSource, /purpose: "community_reply"/);
    assert.doesNotMatch(replyStreamSource, /isCloudflareStreamUploadEnabled|shouldFallback/);
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

  it("prioriza TUS em redes móveis preservando leitura de contrato básico legado", () => {
    const requestSource = readSource("../api/req/video-assets/index.ts");
    const uploadSource = readSource("./video-asset-upload.ts");

    assert.match(requestSource, /"X-Lectum-Video-Upload-Methods": ACCEPTED_VIDEO_UPLOAD_METHODS/);
    assert.match(requestSource, /const ACCEPTED_VIDEO_UPLOAD_METHODS = "tus"/);
    assert.match(uploadSource, /provisioned\.upload_method === "basic"/);
    assert.match(uploadSource, /uploadBasicDirect\(\{/);
    assert.match(uploadSource, /uploadTus\(\{/);
    const transportSource = readSource("./video-upload-transport.ts");
    assert.match(transportSource, /new FormData\(\)/);
    assert.match(transportSource, /request\.open\("POST", uploadUrl\)/);
  });

  it("cleanup usa endpoint de tentativa sem fallback para remoção explícita", () => {
    const source = readSource("../api/req/video-assets/index.ts");
    const cleanupRequest = source
      .split("export const cancelVideoAssetUpload =")[1]
      ?.split("export const cleanupDetachedVideoAsset")[0];
    assert.ok(cleanupRequest);
    assert.match(cleanupRequest, /route: `\$\{route\}\/uploads\/:id`/);
    assert.doesNotMatch(cleanupRequest, /deleteVideoAsset|catch\s*\(/);
    const cleanup = source
      .split("export const cleanupDetachedVideoAsset =")[1]
      ?.split("const requestVideoAssetPlayback")[0];
    assert.match(cleanup, /await cancelVideoAssetUpload\(assetId\)/);
    assert.doesNotMatch(cleanup, /deleteVideoAsset\(/);
  });

  it("abort do upload não chama a remoção deliberada do vídeo de perfil", () => {
    const source = readSource("./video-asset-upload.ts");
    assert.match(source, /await cancelVideoAssetUpload\(provisioned\.asset_id\)/);
    assert.doesNotMatch(source, /deleteVideoAsset/);
    const transport = readSource("./video-upload-transport.ts");
    assert.match(transport, /\.abort\(false\)/);
    assert.doesNotMatch(transport, /\.abort\(true\)|\.terminate\(/);
    const profile = readSource("../api/req/psychologist-free-profile/index.ts");
    const removal = profile.split("export const deletePsychologistFreeProfileVideo =")[1];
    assert.match(removal, /route: `\$\{route\}\/video`, method: "DELETE"/);
    assert.match(removal, /await deleteVideoAsset\(assetId\)/);
  });

  it("não conecta o player com token ausente, inválido ou perto da expiração", () => {
    const now = Date.parse("2030-01-02T03:04:05.000Z");

    assert.equal(isVideoPlaybackFresh(null, now), false);
    assert.equal(isVideoPlaybackFresh("invalid", now), false);
    assert.equal(isVideoPlaybackFresh("2030-01-02T03:04:15.000Z", now), false);
    assert.equal(isVideoPlaybackFresh("2030-01-02T03:05:05.000Z", now), true);
  });
});

describe("diagnóstico seguro do upload direto", () => {
  it("limita retries a falhas transientes e números a intervalos fechados", () => {
    for (const status of [0, 408, 409, 423, 429, 500, 502, 503, 599])
      assert.equal(isRetryableVideoUploadStatus(status), true);
    for (const status of [200, 201, 400, 401, 403, 404, 413, 422, 600, -1, NaN])
      assert.equal(isRetryableVideoUploadStatus(status), false);
    assert.deepEqual(VIDEO_UPLOAD_RETRY_DELAYS_MS, [0, 1000, 3000, 5000, 10000]);
    assert.equal(boundedUploadNumber(Infinity, 100), 0);
    assert.equal(boundedUploadNumber(-1, 100), 0);
    assert.equal(boundedUploadNumber(1000, 100), 100);
  });
  it("erro público não carrega causa, URL nem objeto remoto", () => {
    const error = new VideoUploadFailure(503);
    assert.equal(error.httpStatus, 503);
    assert.equal(error.reason, "http");
    assert.deepEqual(Object.keys(error).sort(), ["httpStatus", "name", "reason"]);
    assert.equal(new VideoUploadFailure(0).reason, "network");
    assert.equal(new VideoUploadFailure(0, "processing_timeout").reason, "processing_timeout");
    for (const malformed of [
      null,
      "secret",
      new Error("https://example.com/secret"),
      { originalResponse: {} },
    ])
      assert.equal(tusHttpStatus(malformed), 0);
    assert.doesNotMatch(error.message, /503|provider|http|token|URL/);
  });
  it("diagnóstico best-effort não desconecta sessão nem afeta o resultado", () => {
    const api = readSource("../api/req/video-assets/index.ts").split(
      "export const reportVideoAssetUploadEvent",
    )[1];
    assert.match(api, /timeout: 2_000/);
    assert.match(api, /hideError: true/);
    assert.match(api, /signOutOnUnauthorized: false/);
    assert.match(api, /catch/);
    assert.doesNotMatch(api, /console\.|throw /);
    const upload = readSource("./video-asset-upload.ts");
    assert.match(upload, /report\("transfer_complete"\)/);
    assert.match(upload, /report\("ready"\)/);
    assert.match(upload, /document.removeEventListener\("visibilitychange", onVisibilityChange\)/);
    assert.doesNotMatch(upload, /userAgent|file.name|console\./);
  });
});
