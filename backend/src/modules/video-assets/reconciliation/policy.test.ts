import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { VideoStreamProviderError } from "@/infra/video-stream/cloudflare-stream";
import type { VideoStreamDetails } from "@/infra/video-stream/types";
import { parseReconcileVideoUploadArguments } from "@/operations/video-assets/reconcile-arguments";
import {
  canReconcileVideoUpload,
  classifyReconciliationProviderFailure,
  planVideoUploadReconciliation,
  type ReconciliationSnapshot,
  reconciliationIdentityRef,
  safeReconciliationError,
  safeReconciliationMimeType,
  safeReconciliationPurpose,
  safeReconciliationStatus,
} from "./policy";

const now = new Date("2026-10-01T12:00:00Z");
const asset: ReconciliationSnapshot = {
  deleted: false,
  status: "uploading",
  error_code: null,
  purpose: "community_reply",
  provider: "cloudflare_stream",
  provider_uid: "a".repeat(32),
  migration_key: null,
  source_provider: null,
  upload_expires_at: new Date("2026-09-29T17:34:24Z"),
};
const remote: VideoStreamDetails = {
  providerUid: "a".repeat(32),
  status: "uploading",
  errorCode: null,
  durationSeconds: null,
  width: null,
  height: null,
};

describe("manual video upload reconciliation policy", () => {
  it("marks expired remote reservations without deleting or fabricating readiness", () => {
    assert.deepEqual(planVideoUploadReconciliation(asset, remote, now), {
      status: "error",
      errorCode: "upload_expired",
      durationSeconds: null,
      width: null,
      height: null,
    });
    const active = { ...asset, upload_expires_at: new Date(now.getTime() + 1) };
    assert.equal(planVideoUploadReconciliation(active, remote, now)?.status, "uploading");
    assert.equal(
      planVideoUploadReconciliation({ ...asset, upload_expires_at: now }, remote, now)?.status,
      "error",
    );
  });

  it("can recover uploading, processing and locally expired uploads from verified readiness", () => {
    for (const local of [
      asset,
      { ...asset, status: "processing" },
      { ...asset, status: "error", error_code: "upload_expired" },
    ]) {
      const result = planVideoUploadReconciliation(
        local,
        { ...remote, status: "ready", durationSeconds: 12, width: 390, height: 844 },
        now,
      );
      assert.equal(result?.status, "ready");
      assert.equal(result?.errorCode, null);
      assert.equal(result?.durationSeconds, 12);
      assert.equal(result?.width, 390);
      assert.equal(result?.height, 844);
    }
  });

  it("does not mistake processing for an expired upload or regress processing", () => {
    assert.equal(
      planVideoUploadReconciliation(
        asset,
        { ...remote, providerUid: "b".repeat(32), status: "ready" },
        now,
      ),
      null,
    );
    assert.equal(
      planVideoUploadReconciliation(asset, { ...remote, status: "processing" }, now)?.status,
      "processing",
    );
    assert.equal(
      planVideoUploadReconciliation({ ...asset, status: "processing" }, remote, now),
      null,
    );
    assert.equal(
      planVideoUploadReconciliation(
        { ...asset, status: "error", error_code: "upload_expired" },
        { ...remote, status: "processing" },
        now,
      )?.status,
      "processing",
    );
  });

  it("protects ready, deleted, canceled, profiles, migrations and unknown states", () => {
    for (const protectedAsset of [
      { ...asset, status: "ready" },
      { ...asset, deleted: true },
      { ...asset, status: "canceled" },
      { ...asset, status: "unknown" },
      { ...asset, status: "error", error_code: "processing_failed" },
      { ...asset, purpose: "profile_presentation" },
      { ...asset, purpose: "unknown" },
      { ...asset, migration_key: "migration" },
      { ...asset, source_provider: "cloudflare_r2" },
      { ...asset, provider: "unknown" },
    ]) {
      assert.equal(canReconcileVideoUpload(protectedAsset), false);
      assert.equal(
        planVideoUploadReconciliation(protectedAsset, { ...remote, status: "ready" }, now),
        null,
      );
    }
    assert.equal(canReconcileVideoUpload({ ...asset, purpose: "community_post" }), true);
    assert.equal(
      planVideoUploadReconciliation(asset, { ...remote, status: "canceled" }, now),
      null,
    );
  });

  it("replaces provider error details and arbitrary DB strings with closed vocabulary", () => {
    assert.equal(safeReconciliationMimeType("video/mp4"), "video/mp4");
    assert.equal(safeReconciliationMimeType("video/quicktime"), "video/quicktime");
    assert.equal(safeReconciliationMimeType("private metadata"), "other");
    const update = planVideoUploadReconciliation(
      asset,
      { ...remote, status: "error", errorCode: "private provider text" },
      now,
    );
    assert.equal(update?.errorCode, "processing_failed");
    assert.equal(safeReconciliationError("private provider text"), "other");
    assert.equal(safeReconciliationPurpose("private text"), "unknown");
    assert.equal(safeReconciliationStatus("private text"), "unknown");
    assert.match(reconciliationIdentityRef("internal-id"), /^[a-f0-9]{16}$/);
    assert.equal(
      reconciliationIdentityRef("internal-id"),
      reconciliationIdentityRef("internal-id"),
    );
    assert.notEqual(
      reconciliationIdentityRef("internal-id"),
      reconciliationIdentityRef("different-id"),
    );
  });

  it("classifies provider failures without returning messages or provider payloads", () => {
    for (const [status, expected] of [
      [404, "not_found"],
      [401, "access_denied"],
      [403, "access_denied"],
      [429, "rate_limited"],
      [500, "unavailable"],
      [null, "unavailable"],
      [200, "unexpected"],
      [400, "unexpected"],
    ] as const) {
      assert.equal(
        classifyReconciliationProviderFailure(new VideoStreamProviderError("get_video", status)),
        expected,
      );
    }
    assert.equal(classifyReconciliationProviderFailure(new Error("private text")), "unexpected");
    assert.equal(
      classifyReconciliationProviderFailure({ status: 404, message: "private text" }),
      "unexpected",
    );
  });

  it("has no provider writes, autoattachment, publication or automatic boot path", () => {
    const service = readFileSync("src/modules/video-assets/reconciliation/service.ts", "utf8");
    const repository = readFileSync(
      "src/modules/video-assets/reconciliation/repository.ts",
      "utf8",
    );
    assert.doesNotMatch(
      service + repository,
      /deleteVideo|provisionUpload|importVideoByUrl|attachReadyProfileAsset|deletePublicProfileMedia|setInterval|setTimeout/,
    );
    assert.match(service, /provider\.getVideo\(asset\.provider_uid\)/);
    assert.match(repository, /updatedAt: asset\.updatedAt/);
    assert.match(repository, /provider_uid: asset\.provider_uid/);
    assert.match(repository, /status: asset\.status/);
    assert.match(repository, /deleted: false/);
    assert.doesNotMatch(repository, /\.(create|delete|deleteMany|update)\(/);
    assert.doesNotMatch(
      readFileSync("src/main/server/bootstrap.ts", "utf8"),
      /reconcileVideoUploads|reconciliation/,
    );
  });
});

describe("manual video upload reconciliation arguments", () => {
  it("defaults to bounded dry-run and requires a unique scope", () => {
    assert.equal(parseReconcileVideoUploadArguments([]), null);
    assert.equal(parseReconcileVideoUploadArguments(["--help"]), null);
    const options = parseReconcileVideoUploadArguments(["--owner-id=example_owner"]);
    assert.equal(options?.apply, false);
    assert.equal(options?.limit, 20);
    assert.equal(options?.confirmation, null);
    assert.equal(options?.offset, 0);
    assert.equal(
      parseReconcileVideoUploadArguments(["--owner-id=example_owner", "--offset=10000"])?.offset,
      10000,
    );
    assert.equal(parseReconcileVideoUploadArguments(["--asset-id=example_asset"])?.limit, 1);
  });

  it("only applies a single explicitly confirmed asset", () => {
    assert.equal(
      parseReconcileVideoUploadArguments([
        "--asset-id=example_asset",
        "--apply",
        "--confirm=production",
      ])?.apply,
      true,
    );
    assert.equal(
      parseReconcileVideoUploadArguments([
        "--",
        "--asset-id=example_asset",
        "--apply",
        "--confirm=homolog",
      ])?.confirmation,
      "homolog",
    );
  });

  it("rejects ambiguous, unbounded and destructive arguments", () => {
    for (const args of [
      ["--apply"],
      ["--owner-id=example_owner", "--apply", "--confirm=production"],
      ["--asset-id=example_asset", "--apply"],
      ["--asset-id=example_asset", "--apply", "--confirm=staging"],
      ["--asset-id=example_asset", "--confirm=production"],
      ["--asset-id=example_asset", "--owner-id=example_owner"],
      ["--asset-id=example_asset", "--limit=2"],
      ["--asset-id=example_asset", "--offset=0"],
      ["--owner-id=example_owner", "--offset=10001"],
      ["--owner-id=example_owner", "--offset=-1"],
      ["--owner-id=example_owner", "--offset=1.5"],
      ["--owner-id=example_owner", "--limit=21"],
      ["--owner-id=example_owner", "--limit=0"],
      ["--owner-id=example_owner", "--limit=1.5"],
      ["--owner-id=example_owner", "--limit=2", "--limit=2"],
      ["--owner-id=example_owner", "--purge"],
      ["--owner-id=example_owner", "--apply=false"],
      ["--owner-id=example_owner", "--dry-run=false"],
      ["--owner-id=example_owner", "--help"],
      ["--asset-id=example_asset", "--apply", "--dry-run", "--confirm=production"],
      ["--asset-id=../secret"],
      ["--asset-id"],
      ["--asset-id="],
      ["--owner-id=too short"],
    ])
      assert.throws(() => parseReconcileVideoUploadArguments(args));
  });
});
