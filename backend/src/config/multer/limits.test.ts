import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveUploadLimits } from "./limits";

describe("upload limits", () => {
  it("preserva os limites de fallback por finalidade", () => {
    const limits = resolveUploadLimits({});

    assert.equal(limits.psychologist.avatarMb, 5);
    assert.equal(limits.psychologist.videoSimpleMb, 50);
    assert.equal(limits.psychologist.videoMultipartTotalMb, 300);
    assert.equal(limits.community.postMediaMb, 200);
    assert.equal(limits.postReply.multipartTotalMb, 200);
  });

  it("aceita overrides independentes validos", () => {
    const limits = resolveUploadLimits({
      UPLOAD_LIMIT_ADMIN_COMMUNITY_AVATAR_MB: "6",
      UPLOAD_LIMIT_ADMIN_SEO_OG_IMAGE_MB: "7",
      UPLOAD_LIMIT_COMMUNITY_POST_MEDIA_MB: "210",
      UPLOAD_LIMIT_PATIENT_AVATAR_MB: "8",
      UPLOAD_LIMIT_POST_REPLY_MEDIA_MULTIPART_CHUNK_MB: "11",
      UPLOAD_LIMIT_POST_REPLY_MEDIA_MULTIPART_MB: "350",
      UPLOAD_LIMIT_POST_REPLY_MEDIA_SIMPLE_MB: "220",
      UPLOAD_LIMIT_PSYCHOLOGIST_AVATAR_MB: "9",
      UPLOAD_LIMIT_PSYCHOLOGIST_COVER_IMAGE_MB: "10",
      UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_COVER_MB: "12",
      UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_MULTIPART_CHUNK_MB: "13",
      UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_MULTIPART_MB: "450",
      UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_SIMPLE_MB: "60",
    });

    assert.equal(limits.admin.seoOgImageMb, 7);
    assert.equal(limits.community.avatarMb, 6);
    assert.equal(limits.community.postMediaMb, 210);
    assert.equal(limits.patient.avatarMb, 8);
    assert.equal(limits.postReply.multipartChunkMb, 11);
    assert.equal(limits.postReply.multipartTotalMb, 350);
    assert.equal(limits.postReply.simpleMb, 220);
    assert.equal(limits.psychologist.avatarMb, 9);
    assert.equal(limits.psychologist.coverImageMb, 10);
    assert.equal(limits.psychologist.videoCoverMb, 12);
    assert.equal(limits.psychologist.videoMultipartChunkMb, 13);
    assert.equal(limits.psychologist.videoMultipartTotalMb, 450);
    assert.equal(limits.psychologist.videoSimpleMb, 60);
  });

  it("usa fallback para valores perigosos ou invalidos", () => {
    const limits = resolveUploadLimits({
      UPLOAD_LIMIT_ADMIN_SEO_OG_IMAGE_MB: "1000",
      UPLOAD_LIMIT_POST_REPLY_MEDIA_MULTIPART_CHUNK_MB: "4",
      UPLOAD_LIMIT_POST_REPLY_MEDIA_SIMPLE_MB: "501",
      UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_MULTIPART_MB: "4",
      UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_SIMPLE_MB: "4",
    });

    assert.equal(limits.admin.seoOgImageMb, 5);
    assert.equal(limits.postReply.multipartChunkMb, 10);
    assert.equal(limits.postReply.simpleMb, 200);
    assert.equal(limits.psychologist.videoMultipartTotalMb, 300);
    assert.equal(limits.psychologist.videoSimpleMb, 50);
  });
});
