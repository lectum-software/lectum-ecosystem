import assert from "node:assert/strict";
import test from "node:test";
import {
  getVideoPreparationPurposePolicy,
  resolveVideoContainer,
  resolveVideoDimensions,
  resolveVideoEncodingPolicy,
  resolveVideoOutputFileName,
  shouldOptimizeVideo,
  shouldUseOptimizedVideo,
  VIDEO_MAX_OUTPUT_BYTES,
} from "./video-preparation/policy.ts";
import {
  isVideoOptimizationWorkerResponse,
  isVideoPreparationPurpose,
  isVideoUploadCanceled,
  throwIfVideoUploadCanceled,
  VIDEO_PREPARATION_PURPOSES,
  VideoUploadCanceledError,
} from "./video-preparation/types.ts";

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

test("expõe preparação genérica para cada finalidade mantendo a política conservadora", () => {
  assert.deepEqual(VIDEO_PREPARATION_PURPOSES, [
    "profile-presentation",
    "community-post",
    "community-reply",
  ]);

  const expectedFileNames = {
    "community-post": "video-post.mp4",
    "community-reply": "video-resposta.mp4",
    "profile-presentation": "video-apresentacao.mp4",
  };

  for (const purpose of VIDEO_PREPARATION_PURPOSES) {
    const purposePolicy = getVideoPreparationPurposePolicy(purpose);
    assert.equal(purposePolicy.maxOutputBytes, VIDEO_MAX_OUTPUT_BYTES);
    assert.equal(purposePolicy.maxEdgePx, 1920);
    assert.equal(purposePolicy.maxFrameRate, 30);
    assert.equal(resolveVideoOutputFileName(purpose), expectedFileNames[purpose]);
    assert.equal(isVideoPreparationPurpose(purpose), true);
  }

  assert.equal(isVideoPreparationPurpose("avatar"), false);
});

test("aplica análise, resize e decisão de saída em todos os propósitos de vídeo", () => {
  const inefficientVideo = createAnalysis({
    container: "other",
    fileSize: 180 * 1024 * 1024,
    height: 2160,
    videoCodec: "hevc",
    width: 3840,
  });

  for (const purpose of VIDEO_PREPARATION_PURPOSES) {
    assert.deepEqual(resolveVideoDimensions(3840, 2160, purpose), {
      height: 1080,
      width: 1920,
    });

    const encodingPolicy = resolveVideoEncodingPolicy(inefficientVideo, purpose);
    assert.ok(encodingPolicy);
    assert.equal(shouldOptimizeVideo(inefficientVideo, encodingPolicy, purpose), true);
    assert.equal(shouldUseOptimizedVideo(180 * 1024 * 1024, 70 * 1024 * 1024, purpose), true);
    assert.equal(
      shouldUseOptimizedVideo(
        180 * 1024 * 1024,
        getVideoPreparationPurposePolicy(purpose).maxOutputBytes + 1,
        purpose,
      ),
      false,
    );
  }
});

test("limita a maior dimensão sem ampliar ou deformar vídeos", () => {
  assert.deepEqual(resolveVideoDimensions(2160, 3840, "profile-presentation"), {
    height: 1920,
    width: 1080,
  });
  assert.deepEqual(resolveVideoDimensions(3840, 2160, "profile-presentation"), {
    height: 1080,
    width: 1920,
  });
  assert.deepEqual(resolveVideoDimensions(720, 1280, "profile-presentation"), {
    height: 1280,
    width: 720,
  });
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
  const largeMovPolicy = resolveVideoEncodingPolicy(largeMov, "profile-presentation");
  assert.ok(largeMovPolicy);
  assert.equal(largeMovPolicy.width, 1080);
  assert.equal(largeMovPolicy.height, 1920);
  assert.equal(shouldOptimizeVideo(largeMov, largeMovPolicy, "profile-presentation"), true);

  const efficientMp4 = createAnalysis();
  const efficientMp4Policy = resolveVideoEncodingPolicy(efficientMp4, "profile-presentation");
  assert.ok(efficientMp4Policy);
  assert.equal(
    shouldOptimizeVideo(efficientMp4, efficientMp4Policy, "profile-presentation"),
    false,
  );

  const efficientWebm = createAnalysis({
    audioCodec: "opus",
    container: "webm",
    fileSize: 10 * 1024 * 1024,
    videoCodec: "vp9",
  });
  const efficientWebmPolicy = resolveVideoEncodingPolicy(efficientWebm, "profile-presentation");
  assert.ok(efficientWebmPolicy);
  assert.equal(
    shouldOptimizeVideo(efficientWebm, efficientWebmPolicy, "profile-presentation"),
    false,
  );
});

test("adapta bitrate ao teto e recusa saída que exigiria qualidade insuficiente", () => {
  const fiveMinutes = createAnalysis({ durationSeconds: 300, fileSize: 250 * 1024 * 1024 });
  const policy = resolveVideoEncodingPolicy(fiveMinutes, "profile-presentation");
  assert.ok(policy);
  assert.ok(policy.estimatedOutputBytes <= VIDEO_MAX_OUTPUT_BYTES);
  assert.ok(policy.videoBitrate < 5_000_000);

  assert.equal(
    resolveVideoEncodingPolicy(createAnalysis({ durationSeconds: 700 }), "profile-presentation"),
    null,
  );
});

test("só usa saída otimizada quando ela é válida, menor e está abaixo do teto", () => {
  assert.equal(shouldUseOptimizedVideo(100, 60, "profile-presentation"), true);
  assert.equal(shouldUseOptimizedVideo(100, 100, "profile-presentation"), false);
  assert.equal(shouldUseOptimizedVideo(100, 0, "profile-presentation"), false);
  assert.equal(
    shouldUseOptimizedVideo(
      VIDEO_MAX_OUTPUT_BYTES * 2,
      VIDEO_MAX_OUTPUT_BYTES + 1,
      "profile-presentation",
    ),
    false,
  );
});

test("classifica containers e valida somente mensagens conhecidas do worker", () => {
  assert.equal(resolveVideoContainer("video/mp4; codecs=avc1"), "mp4");
  assert.equal(resolveVideoContainer("video/webm"), "webm");
  assert.equal(resolveVideoContainer("video/quicktime"), "other");

  assert.equal(
    isVideoOptimizationWorkerResponse({
      percentage: 42,
      stage: "optimizing",
      type: "progress",
    }),
    true,
  );
  assert.equal(
    isVideoOptimizationWorkerResponse({ reason: "unsupported", type: "use-original" }),
    true,
  );
  assert.equal(
    isVideoOptimizationWorkerResponse({
      buffer: new ArrayBuffer(8),
      outputSize: 8,
      type: "optimized",
    }),
    true,
  );
  assert.equal(isVideoOptimizationWorkerResponse({ type: "canceled" }), true);
  assert.equal(
    isVideoOptimizationWorkerResponse({ reason: "technical-detail", type: "use-original" }),
    false,
  );
  assert.equal(isVideoOptimizationWorkerResponse({ percentage: 150, type: "progress" }), false);
});

test("cancelamento é controlado e não entra no fallback de falha", () => {
  const controller = new AbortController();
  controller.abort();

  assert.throws(() => throwIfVideoUploadCanceled(controller.signal), VideoUploadCanceledError);
  assert.equal(isVideoUploadCanceled(new VideoUploadCanceledError()), true);
  assert.equal(isVideoUploadCanceled(new Error("falha")), false);
});
