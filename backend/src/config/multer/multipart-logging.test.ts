import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMultipartUploadLogEntry } from "./multipart-logging";

describe("multipart upload logging", () => {
  it("mantém somente campos operacionais permitidos", () => {
    const entry = createMultipartUploadLogEntry("PART_SUCCESS", {
      elapsedMs: 81,
      partNumber: 1,
      receivedBytes: 5 * 1024 * 1024,
      scope: "psychologist_profile_video",
      traceId: "c976c9fa-d133-4d43-9cba-caa472bcb17d",
      ...({
        key: "psychologist/video/internal.mov",
        sessionId: "secret-session",
        userId: "private-user",
      } as Record<string, unknown>),
    });

    assert.deepEqual(entry, {
      data: {
        scope: "psychologist_profile_video",
        elapsedMs: 81,
        partNumber: 1,
        receivedBytes: 5 * 1024 * 1024,
        traceId: "c976c9fa-d133-4d43-9cba-caa472bcb17d",
      },
      label: "[UPLOAD_MULTIPART_PART_SUCCESS]",
      level: "info",
    });
  });

  it("remove identificadores e valores fora do formato seguro", () => {
    const entry = createMultipartUploadLogEntry("PART_REJECTED", {
      elapsedMs: -1,
      mimeType: "video/quicktime\nsecret",
      reason: "file_signature",
      scope: "invalid/scope",
      traceId: "encrypted-session-token",
    });

    assert.deepEqual(entry, {
      data: {
        scope: "unknown",
        reason: "file_signature",
      },
      label: "[UPLOAD_MULTIPART_PART_REJECTED]",
      level: "warn",
    });
  });

  it("classifica falhas como erro", () => {
    const entry = createMultipartUploadLogEntry("COMPLETE_FAILED", {
      reason: "infrastructure",
      scope: "psychologist_profile_video",
    });

    assert.equal(entry.level, "error");
  });
});
