import assert from "node:assert/strict";
import test from "node:test";
import { createCommunityVideoUploadOperation } from "./community-video-upload-lifecycle.ts";
import {
  MEDIA_UPLOAD_CLEANUP_TIMEOUT_MS,
  MediaUploadCanceledError,
  scheduleBestEffortCleanup,
  throwIfMediaUploadCanceled,
} from "./upload-lifecycle.ts";

test("normaliza signal abortado para AbortError controlado", () => {
  const controller = new AbortController();
  controller.abort(new Error("erro embrulhado pelo cliente HTTP"));

  assert.throws(
    () => throwIfMediaUploadCanceled(controller.signal),
    (error) => error instanceof MediaUploadCanceledError && error.name === "AbortError",
  );
  assert.doesNotThrow(() => throwIfMediaUploadCanceled(new AbortController().signal));
});

test("cleanup best effort não bloqueia o fluxo chamador e absorve falhas", async () => {
  let cleanupStarted = false;
  let releaseCleanup;
  const cleanupGate = new Promise((resolve) => {
    releaseCleanup = resolve;
  });

  const scheduled = scheduleBestEffortCleanup(async () => {
    cleanupStarted = true;
    await cleanupGate;
    throw new Error("cleanup_failed");
  });

  assert.equal(MEDIA_UPLOAD_CLEANUP_TIMEOUT_MS, 10_000);
  assert.equal(scheduled, undefined);
  await Promise.resolve();
  assert.equal(cleanupStarted, true);

  releaseCleanup();
  await Promise.resolve();
  await Promise.resolve();
});

test("operação comunitária usa um signal e encerra progresso de forma idempotente", () => {
  const controller = new AbortController();
  const receivedProgress = [];
  let completeCount = 0;
  const operation = createCommunityVideoUploadOperation({
    controller,
    onComplete: () => {
      completeCount += 1;
    },
    onProgress: (progress) => receivedProgress.push(progress),
  });

  operation.onProgress({ percentage: null, phase: "preparing", stage: "analyzing" });
  operation.onProgress({ percentage: 42, phase: "preparing", stage: "optimizing" });
  controller.abort();
  operation.onProgress({ percentage: 50, phase: "uploading", stage: "uploading" });
  operation.complete();
  operation.complete();

  assert.equal(operation.signal, controller.signal);
  assert.equal(operation.signal.aborted, true);
  assert.deepEqual(receivedProgress, [
    { percentage: null, phase: "preparing", stage: "analyzing" },
    { percentage: 42, phase: "preparing", stage: "optimizing" },
  ]);
  assert.equal(completeCount, 1);
});
