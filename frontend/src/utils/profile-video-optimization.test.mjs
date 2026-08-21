import assert from "node:assert/strict";
import test from "node:test";
import {
  PROFILE_VIDEO_MAX_OUTPUT_BYTES,
  resolveProfileVideoContainer,
  resolveProfileVideoDimensions,
  resolveProfileVideoEncodingPolicy,
  shouldOptimizeProfileVideo,
  shouldUseOptimizedProfileVideo,
} from "./profile-video-optimization/policy.ts";
import {
  isProfileVideoOptimizationWorkerResponse,
  isProfileVideoUploadCanceled,
  ProfileVideoUploadCanceledError,
  throwIfProfileVideoUploadCanceled,
} from "./profile-video-optimization/types.ts";

const createAnalysis = (overrides = {}) => ({
  audioCodec: "aac",
  container: "mp4",
  durationSeconds: 30,
  fileSize: 20 * 1024 * 1024,
  frameRate: 30,
  height: 1920,
  videoCodec: "avc",
  width: 1080,
  ...overrides,
});

test("limita a maior dimensão sem ampliar ou deformar vídeos", () => {
  assert.deepEqual(resolveProfileVideoDimensions(2160, 3840), { height: 1920, width: 1080 });
  assert.deepEqual(resolveProfileVideoDimensions(3840, 2160), { height: 1080, width: 1920 });
  assert.deepEqual(resolveProfileVideoDimensions(720, 1280), { height: 1280, width: 720 });
});

test("otimiza MOV de alto bitrate e preserva MP4/WebM já eficientes", () => {
  const largeMov = createAnalysis({
    audioCodec: "aac",
    container: "other",
    fileSize: 222_553_640,
    height: 3840,
    videoCodec: "hevc",
    width: 2160,
  });
  const largeMovPolicy = resolveProfileVideoEncodingPolicy(largeMov);
  assert.ok(largeMovPolicy);
  assert.equal(largeMovPolicy.width, 1080);
  assert.equal(largeMovPolicy.height, 1920);
  assert.equal(shouldOptimizeProfileVideo(largeMov, largeMovPolicy), true);

  const efficientMp4 = createAnalysis();
  const efficientMp4Policy = resolveProfileVideoEncodingPolicy(efficientMp4);
  assert.ok(efficientMp4Policy);
  assert.equal(shouldOptimizeProfileVideo(efficientMp4, efficientMp4Policy), false);

  const efficientWebm = createAnalysis({
    audioCodec: "opus",
    container: "webm",
    fileSize: 10 * 1024 * 1024,
    videoCodec: "vp9",
  });
  const efficientWebmPolicy = resolveProfileVideoEncodingPolicy(efficientWebm);
  assert.ok(efficientWebmPolicy);
  assert.equal(shouldOptimizeProfileVideo(efficientWebm, efficientWebmPolicy), false);
});

test("adapta bitrate ao teto e recusa saída que exigiria qualidade insuficiente", () => {
  const fiveMinutes = createAnalysis({ durationSeconds: 300, fileSize: 250 * 1024 * 1024 });
  const policy = resolveProfileVideoEncodingPolicy(fiveMinutes);
  assert.ok(policy);
  assert.ok(policy.estimatedOutputBytes <= PROFILE_VIDEO_MAX_OUTPUT_BYTES);
  assert.ok(policy.videoBitrate < 5_000_000);

  assert.equal(resolveProfileVideoEncodingPolicy(createAnalysis({ durationSeconds: 700 })), null);
});

test("só usa saída otimizada quando ela é válida, menor e está abaixo do teto", () => {
  assert.equal(shouldUseOptimizedProfileVideo(100, 60), true);
  assert.equal(shouldUseOptimizedProfileVideo(100, 100), false);
  assert.equal(shouldUseOptimizedProfileVideo(100, 0), false);
  assert.equal(
    shouldUseOptimizedProfileVideo(
      PROFILE_VIDEO_MAX_OUTPUT_BYTES * 2,
      PROFILE_VIDEO_MAX_OUTPUT_BYTES + 1,
    ),
    false,
  );
});

test("classifica containers e valida somente mensagens conhecidas do worker", () => {
  assert.equal(resolveProfileVideoContainer("video/mp4; codecs=avc1"), "mp4");
  assert.equal(resolveProfileVideoContainer("video/webm"), "webm");
  assert.equal(resolveProfileVideoContainer("video/quicktime"), "other");

  assert.equal(
    isProfileVideoOptimizationWorkerResponse({
      percentage: 42,
      stage: "optimizing",
      type: "progress",
    }),
    true,
  );
  assert.equal(
    isProfileVideoOptimizationWorkerResponse({ reason: "unsupported", type: "use-original" }),
    true,
  );
  assert.equal(
    isProfileVideoOptimizationWorkerResponse({
      buffer: new ArrayBuffer(8),
      outputSize: 8,
      type: "optimized",
    }),
    true,
  );
  assert.equal(isProfileVideoOptimizationWorkerResponse({ type: "canceled" }), true);
  assert.equal(
    isProfileVideoOptimizationWorkerResponse({ reason: "technical-detail", type: "use-original" }),
    false,
  );
  assert.equal(
    isProfileVideoOptimizationWorkerResponse({ percentage: 150, type: "progress" }),
    false,
  );
});

test("cancelamento é controlado e não entra no fallback de falha", () => {
  const controller = new AbortController();
  controller.abort();

  assert.throws(
    () => throwIfProfileVideoUploadCanceled(controller.signal),
    ProfileVideoUploadCanceledError,
  );
  assert.equal(isProfileVideoUploadCanceled(new ProfileVideoUploadCanceledError()), true);
  assert.equal(isProfileVideoUploadCanceled(new Error("falha")), false);
});
