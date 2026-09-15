import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  resolveVideoUploadRef,
  toVideoUploadClientEventLog,
  type VideoUploadClientEvent,
  videoUploadClientEventSchema,
} from "./upload-diagnostics-policy";

const event: VideoUploadClientEvent = {
  event: "transfer_start",
  phase: "transfer",
  method: "tus",
  reason: "none",
  httpStatus: 0,
  progress: 0,
  elapsedMs: 0,
  retryCount: 0,
  online: true,
  visibility: "visible",
  wasHidden: false,
};

describe("closed video upload diagnostics", () => {
  it("accepts every event, phase, method, reason and visibility in the closed vocabulary", () => {
    const alternatives = {
      event: ["transfer_start", "transfer_complete", "ready", "failed", "canceled"],
      phase: ["transfer", "processing"],
      method: ["tus", "basic"],
      reason: [
        "none",
        "network",
        "http",
        "transport",
        "processing",
        "processing_timeout",
        "canceled",
        "unknown",
      ],
      visibility: ["visible", "hidden"],
    };
    for (const [key, values] of Object.entries(alternatives)) {
      for (const value of values) {
        assert.equal(
          videoUploadClientEventSchema.safeParse({ ...event, [key]: value }).success,
          true,
        );
      }
      assert.equal(
        videoUploadClientEventSchema.safeParse({ ...event, [key]: "free text" }).success,
        false,
      );
    }
  });

  for (const [key, max] of Object.entries({
    httpStatus: 599,
    progress: 100,
    elapsedMs: 86_400_000,
    retryCount: 100,
  })) {
    it(`strictly bounds ${key} without coercion`, () => {
      for (const value of [0, max]) {
        assert.equal(
          videoUploadClientEventSchema.safeParse({ ...event, [key]: value }).success,
          true,
        );
      }
      for (const value of [-1, max + 1, 0.5, "1", null, true, NaN, Infinity]) {
        assert.equal(
          videoUploadClientEventSchema.safeParse({ ...event, [key]: value }).success,
          false,
        );
      }
    });
  }

  it("requires each field and real booleans, rejects null, arrays and unknown fields", () => {
    for (const key of Object.keys(event)) {
      const incomplete = { ...event } as Record<string, unknown>;
      delete incomplete[key];
      assert.equal(videoUploadClientEventSchema.safeParse(incomplete).success, false);
    }
    for (const key of ["online", "wasHidden"]) {
      for (const value of [true, false]) {
        assert.equal(
          videoUploadClientEventSchema.safeParse({ ...event, [key]: value }).success,
          true,
        );
      }
      for (const value of ["true", "false", 0, 1, null]) {
        assert.equal(
          videoUploadClientEventSchema.safeParse({ ...event, [key]: value }).success,
          false,
        );
      }
    }
    for (const input of [
      null,
      [],
      {},
      "text",
      { ...event, url: "forbidden" },
      { ...event, purpose: "community_post" },
    ]) {
      assert.equal(videoUploadClientEventSchema.safeParse(input).success, false);
    }
  });

  it("logs only the event allowlist, database purpose and deterministic opaque upload reference", () => {
    const assetId = "isolated-asset-reference";
    const expectedRef = createHash("sha256").update(assetId).digest("hex").slice(0, 16);
    const log = toVideoUploadClientEventLog(
      {
        ...event,
        url: "not-logged",
        purpose: "community_post",
        uploadRef: "not-trusted",
      } as VideoUploadClientEvent,
      { id: assetId, purpose: "community_reply" },
    );
    assert.deepEqual(log, { ...event, purpose: "community_reply", uploadRef: expectedRef });
    assert.equal(resolveVideoUploadRef(assetId), expectedRef);
    assert.notEqual(resolveVideoUploadRef("another-asset-reference"), expectedRef);
    assert.match(expectedRef, /^[a-f0-9]{16}$/);
    assert.equal(JSON.stringify(log).includes(assetId), false);
    assert.equal(
      toVideoUploadClientEventLog(event, { id: assetId, purpose: "unexpected DB text" }).purpose,
      null,
    );
  });
});
