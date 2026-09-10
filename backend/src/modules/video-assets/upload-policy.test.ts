import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveUploadLimits } from "@/config/multer/limits";
import {
  getVideoAssetUploadFailure,
  getVideoAssetUploadLimitBytes,
  getVideoAssetUploadLimitMegabytes,
  validateVideoAssetUploadMetadata,
} from "./upload-policy";

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
