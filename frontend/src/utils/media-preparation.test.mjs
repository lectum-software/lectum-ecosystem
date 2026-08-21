import assert from "node:assert/strict";
import test from "node:test";
import { mapWithConcurrency } from "./map-with-concurrency.ts";
import {
  requireMediaPreparationFileKind,
  resolveCommunityPostPreparationPurpose,
  resolveMediaPreparationAdapter,
  resolvePostReplyPreparationPurpose,
  resolvePublicMediaKind,
  resolveVideoPreparationPurpose,
} from "./media-preparation/policy.ts";
import {
  isAllowedProfileVideo,
  resolveProfileVideoMimeType,
  withProfileVideoFileType,
} from "./profile-video-upload.ts";

test("resolve adapter e purpose de vídeo somente pela finalidade fechada", () => {
  assert.equal(resolveMediaPreparationAdapter("community-post-video"), "video");
  assert.equal(resolveVideoPreparationPurpose("community-post-video"), "community-post");
  assert.equal(resolveVideoPreparationPurpose("post-reply-video"), "community-reply");
  assert.equal(resolveMediaPreparationAdapter("community-post-image"), "image");
  assert.equal(resolveMediaPreparationAdapter("generated-video-thumbnail"), "passthrough");
});

test("classifica MIME apenas dentro do domínio já autorizado do endpoint", () => {
  assert.equal(
    resolveCommunityPostPreparationPurpose({ type: "video/quicktime" }),
    "community-post-video",
  );
  assert.equal(
    resolveCommunityPostPreparationPurpose({ type: "image/png" }),
    "community-post-image",
  );
  assert.equal(resolvePostReplyPreparationPurpose({ type: "video/webm" }), "post-reply-video");
  assert.equal(resolvePostReplyPreparationPurpose({ type: "image/webp" }), "post-reply-image");
  assert.equal(
    resolveCommunityPostPreparationPurpose({ name: "camera.MOV", type: "" }),
    "community-post-video",
  );
  assert.equal(
    resolvePostReplyPreparationPurpose({ name: "foto.JPEG", type: "" }),
    "post-reply-image",
  );
  assert.equal(resolvePublicMediaKind({ name: "arquivo.pdf", type: "application/pdf" }), null);
  assert.equal(resolvePublicMediaKind({ name: "sem-extensao", type: "" }), null);
  assert.throws(
    () => resolveCommunityPostPreparationPurpose({ name: "arquivo.pdf", type: "application/pdf" }),
    { name: "UnsupportedPublicMediaTypeError" },
  );
  assert.equal(
    requireMediaPreparationFileKind(
      { name: "thumbnail.jpg", type: "image/jpeg" },
      "generated-video-thumbnail",
    ),
    "image",
  );
  assert.throws(
    () =>
      requireMediaPreparationFileKind(
        { name: "arquivo.pdf", type: "application/pdf" },
        "generated-video-thumbnail",
      ),
    { name: "UnsupportedPublicMediaTypeError" },
  );
  assert.throws(
    () =>
      requireMediaPreparationFileKind(
        { name: "foto.jpg", type: "image/jpeg" },
        "community-post-video",
      ),
    { name: "UnsupportedPublicMediaTypeError" },
  );
});

test("normaliza vídeo mobile somente quando o MIME declarado está vazio", () => {
  const mobileFile = new File([Uint8Array.from([1])], "camera.MOV", { type: "" });
  const invalidDeclaredFile = new File([Uint8Array.from([1])], "camera.mp4", {
    type: "application/octet-stream",
  });

  assert.equal(resolveProfileVideoMimeType(mobileFile), "video/quicktime");
  assert.equal(isAllowedProfileVideo(mobileFile), true);
  assert.equal(withProfileVideoFileType(mobileFile).file.type, "video/quicktime");
  assert.equal(resolveProfileVideoMimeType(invalidDeclaredFile), "");
  assert.equal(isAllowedProfileVideo(invalidDeclaredFile), false);
});

test("limita concorrência preservando a ordem dos resultados", async () => {
  let active = 0;
  let peak = 0;
  const output = await mapWithConcurrency([30, 5, 20, 10], 2, async (delay, index) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, delay));
    active -= 1;
    return `${index}:${delay}`;
  });

  assert.equal(peak, 2);
  assert.deepEqual(output, ["0:30", "1:5", "2:20", "3:10"]);
});

test("normaliza limite de concorrência inválido para um worker", async () => {
  let active = 0;
  let peak = 0;
  await mapWithConcurrency([1, 2, 3], 0, async (value) => {
    active += 1;
    peak = Math.max(peak, active);
    await Promise.resolve();
    active -= 1;
    return value;
  });

  assert.equal(peak, 1);
});
