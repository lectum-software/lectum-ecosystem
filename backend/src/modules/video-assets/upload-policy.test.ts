import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { resolveUploadLimits } from "@/config/multer/limits";
import {
  getVideoAssetUploadFailure,
  getVideoAssetUploadLimitBytes,
  getVideoAssetUploadLimitMegabytes,
  isVideoAssetUploadMimeType,
  validateVideoAssetUploadMetadata,
  videoStreamUploadRequired,
} from "./upload-policy";

const readBackendFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("video asset upload policy", () => {
  it("resolve cada finalidade pela env total correspondente", () => {
    const limits = resolveUploadLimits({
      UPLOAD_LIMIT_COMMUNITY_POST_MEDIA_MULTIPART_MB: "777",
      UPLOAD_LIMIT_POST_REPLY_MEDIA_MULTIPART_MB: "888",
      UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_MULTIPART_MB: "999",
    });

    assert.equal(getVideoAssetUploadLimitMegabytes("community_post", limits), 777);
    assert.equal(getVideoAssetUploadLimitMegabytes("community_reply", limits), 888);
    assert.equal(getVideoAssetUploadLimitMegabytes("profile_presentation", limits), 999);
  });

  for (const purpose of ["community_post", "community_reply", "profile_presentation"] as const) {
    it(`aceita o limite exato e recusa o primeiro byte excedente em ${purpose}`, () => {
      const limitBytes = getVideoAssetUploadLimitBytes(purpose);
      const limitMegabytes = getVideoAssetUploadLimitMegabytes(purpose);

      assert.deepEqual(
        validateVideoAssetUploadMetadata({ mimeType: "video/mp4", purpose, size: limitBytes }),
        {
          accepted: true,
          limitBytes,
          mimeType: "video/mp4",
        },
      );
      assert.deepEqual(
        validateVideoAssetUploadMetadata({
          mimeType: "video/mp4",
          purpose,
          size: limitBytes + 1,
        }),
        {
          accepted: false,
          limitBytes,
          limitMegabytes,
          reason: "file_too_large",
        },
      );
    });
  }

  it("normaliza MIME permitido e recusa metadados inválidos", () => {
    const purpose = "community_post";

    assert.equal(isVideoAssetUploadMimeType(" Video/QuickTime; charset=binary "), true);
    assert.equal(isVideoAssetUploadMimeType("image/png"), false);
    assert.equal(
      validateVideoAssetUploadMetadata({
        mimeType: " Video/QuickTime; charset=binary ",
        purpose,
        size: 1,
      }).accepted,
      true,
    );
    assert.deepEqual(
      validateVideoAssetUploadMetadata({ mimeType: "image/png", purpose, size: 1 }),
      { accepted: false, reason: "invalid_metadata" },
    );
    assert.deepEqual(
      validateVideoAssetUploadMetadata({ mimeType: "video/mp4", purpose, size: 0 }),
      { accepted: false, reason: "invalid_metadata" },
    );
  });

  it("expoe erro seguro quando cliente antigo tenta enviar video fora do Stream", () => {
    const response = videoStreamUploadRequired();
    assert.equal(response.status, 409);
    assert.equal(response.success, false);
    assert.equal(response.code, "video_upload_stream_required");
    assert.deepEqual(response.data, {});

    const translations = JSON.parse(readBackendFile("locales/pt/translation.json"));
    assert.equal(
      translations.error.video_upload_stream_required,
      "Envie vídeos pelo fluxo de streaming. Atualize a página e tente novamente.",
    );
  });

  it("bloqueia upload legado de video em R2 nos endpoints de escrita", () => {
    const communityRoutes = readBackendFile("src/modules/api/private/community/index.ts");
    const postsRoutes = readBackendFile("src/modules/api/private/posts/index.ts");
    const profileRoutes = readBackendFile(
      "src/modules/api/private/psychologist/free-profile/index.ts",
    );
    const profileMediaService = readBackendFile(
      "src/modules/api/private/psychologist/free-profile/use-cases/services/profile-media.ts",
    );
    const profileMultipartService = readBackendFile(
      "src/modules/api/private/psychologist/free-profile/use-cases/services/profile-video-multipart.ts",
    );
    const communityMultipartService = readBackendFile(
      "src/modules/api/private/community/use-cases/services/post-media-multipart.ts",
    );
    const replyMultipartService = readBackendFile(
      "src/modules/api/private/posts/use-cases/services/reply-media-multipart.ts",
    );

    assert.match(communityRoutes, /allowed: \["image\/jpeg", "image\/png", "image\/webp"\]/);
    assert.match(postsRoutes, /allowed: \["image\/jpeg", "image\/png", "image\/webp"\]/);
    assert.doesNotMatch(communityRoutes, /allowed: \[[^\]]*video\/mp4/s);
    assert.doesNotMatch(postsRoutes, /allowed: \[[^\]]*video\/mp4/s);
    assert.doesNotMatch(profileRoutes, /single: "video"[\s\S]*allowed:/);

    assert.match(profileMediaService, /return videoStreamUploadRequired\(\);/);
    assert.match(profileMultipartService, /return videoStreamUploadRequired\(\);/);
    assert.match(
      communityMultipartService,
      /mediaType === "video"[\s\S]*videoStreamUploadRequired/,
    );
    assert.match(replyMultipartService, /mediaType === "video"[\s\S]*videoStreamUploadRequired/);
    assert.match(
      replyMultipartService,
      /session\.mediaType === "video"[\s\S]*videoStreamUploadRequired/,
    );
  });

  it("mapeia excesso para 413 semântico com o limite efetivo do backend", () => {
    const purpose = "profile_presentation";
    const limitBytes = getVideoAssetUploadLimitBytes(purpose);
    const limitMegabytes = getVideoAssetUploadLimitMegabytes(purpose);
    const validation = validateVideoAssetUploadMetadata({
      mimeType: "video/mp4",
      purpose,
      size: limitBytes + 1,
    });

    assert.equal(validation.accepted, false);
    if (validation.accepted) assert.fail("o arquivo excedente deveria ser recusado");
    assert.deepEqual(getVideoAssetUploadFailure(validation), {
      code: "exceeded_file_limit",
      data: { limit: limitMegabytes },
      status: 413,
    });
  });
});
