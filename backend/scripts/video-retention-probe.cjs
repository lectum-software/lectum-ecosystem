// Real compiled modules + disposable PostgreSQL. No Cloudflare calls or provider mocks.
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { spawnSync } = require("node:child_process");
assert.equal(process.env.NODE_ENV, "test");
assert.match(
  new URL(process.env.DATABASE_URL).hostname,
  /^lectum-video-retention178-db-[a-f0-9]{20}$/,
);
assert.equal(new URL(process.env.DATABASE_URL).pathname, "/lectum_audit");
const { prisma } = require("/app/dist/external/prisma/client.js");
const { VideoAssetRepository } = require("/app/dist/modules/video-assets/repository.js");
const {
  retainVideoObject,
  retentionRecordMatchesObject,
  VideoRetentionRepository,
} = require("/app/dist/modules/video-assets/retention/repository.js");
const { videoRetentionIdentity } = require("/app/dist/modules/video-assets/retention/policy.js");
const { videoAssetPlaybackReference } = require("/app/dist/infra/video-stream/reference.js");
const assets = new VideoAssetRepository();
const retained = new VideoRetentionRepository();
let passed = 0;
let step = "start";
const check = async (name, action) => {
  step = name;
  await action();
  passed++;
  console.log("CHECK_OK", name);
};
const source = {
  provider: "cloudflare_r2",
  namespace: "isolated-audit-bucket",
  objectKey: "psychologist/video/retained.mp4",
  reason: "legacy_r2_inventory",
  sizeBytes: 4096n,
  etag: '"isolated-etag"',
};
let user, profile, oldVideo, newVideo, firstRecord;
const makeVideo = (extra = {}) =>
  prisma.video_asset.create({
    data: {
      owner_id: user.id,
      purpose: "profile_presentation",
      context_id: profile.id,
      provider_uid: randomBytes(16).toString("hex"),
      mime_type: "video/mp4",
      size_bytes: 4096n,
      upload_expires_at: new Date(Date.now() + 3600000),
      status: "ready",
      ready_at: new Date(),
      ...extra,
    },
  });
(async () => {
  try {
    await check("fresh_additive_catalog", async () => {
      assert.equal(await prisma.video_retention_record.count(), 0);
      assert.ok(await prisma.subscription_plan.count());
    });
    await check("hold_and_optional_review_persisted", async () => {
      assert.equal(await retainVideoObject(source), true);
      firstRecord = await retained.findR2Object(source.namespace, source.objectKey);
      assert.equal(firstRecord.deletion_hold, true);
      assert.equal(firstRecord.review_after, null);
      assert.equal(firstRecord.size_bytes, 4096n);
    });
    await check("rerun_preserves_first_observation", async () => {
      assert.equal(
        await retainVideoObject({
          ...source,
          reviewAfter: new Date("2027-01-01"),
          etag: "changed",
        }),
        false,
      );
      const current = await retained.findR2Object(source.namespace, source.objectKey);
      assert.equal(current.retained_at.toISOString(), firstRecord.retained_at.toISOString());
      assert.equal(current.source_etag, firstRecord.source_etag);
      assert.equal(current.review_after, null);
      assert.equal(current.deletion_hold, true);
    });
    await check("changed_object_is_not_silently_accepted", async () => {
      assert.equal(retentionRecordMatchesObject(firstRecord, source.etag, source.sizeBytes), true);
      assert.equal(retentionRecordMatchesObject(firstRecord, "different", source.sizeBytes), false);
      assert.equal(retentionRecordMatchesObject(firstRecord, source.etag, 1n), false);
    });
    await check("concurrent_catalog_is_idempotent", async () => {
      const outcomes = await Promise.all(
        Array.from({ length: 4 }, () =>
          retainVideoObject({ ...source, objectKey: "concurrent.mp4" }),
        ),
      );
      assert.equal(outcomes.filter(Boolean).length, 1);
    });
    await check("retention_rolls_back_with_transaction", async () => {
      await assert.rejects(
        prisma.$transaction(async (transaction) => {
          await retainVideoObject({ ...source, objectKey: "rollback.mp4" }, transaction);
          throw new Error("isolated_rollback");
        }),
      );
      assert.equal(await retained.findR2Object(source.namespace, "rollback.mp4"), null);
    });
    await check("replacement_archives_atomically", async () => {
      user = await prisma.user.create({
        data: {
          name: "Isolated retention audit",
          email: `retention-${randomBytes(6).toString("hex")}@example.test`,
          role: "psicologo",
          active: true,
        },
      });
      profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
      oldVideo = await makeVideo({ createdAt: new Date(Date.now() - 60000) });
      await prisma.psychologist_profile.update({
        where: { id: profile.id },
        data: { video_url: videoAssetPlaybackReference(oldVideo.id) },
      });
      newVideo = await makeVideo();
      assert.equal((await assets.attachReadyProfileAsset(newVideo)).attached, true);
      const retired = await prisma.video_asset.findUnique({ where: { id: oldVideo.id } });
      assert.equal(retired.deleted, true);
      const marker = await prisma.video_retention_record.findUnique({
        where: {
          identity_hash: videoRetentionIdentity(
            "cloudflare_stream",
            "unknown",
            oldVideo.provider_uid,
          ),
        },
      });
      assert.equal(marker.reason, "replaced");
      assert.equal(marker.deletion_hold, true);
      assert.equal(
        (await prisma.psychologist_profile.findUnique({ where: { id: profile.id } })).video_url,
        videoAssetPlaybackReference(newVideo.id),
      );
    });
    await check("retired_video_not_reactivated", async () => {
      assert.equal(await assets.findOwned(oldVideo.id, user.id), null);
      assert.equal((await assets.attachReadyProfileAsset(oldVideo)).attached, false);
    });
    await check("ready_cancellation_is_retained", async () => {
      const result = await assets.cancel(newVideo);
      assert.equal(result.kind, "canceled");
      const marker = await prisma.video_retention_record.findUnique({
        where: {
          identity_hash: videoRetentionIdentity(
            "cloudflare_stream",
            "unknown",
            newVideo.provider_uid,
          ),
        },
      });
      assert.equal(marker.reason, "removed");
      assert.equal(marker.deletion_hold, true);
      assert.equal(await assets.findOwned(newVideo.id, user.id), null);
    });
    await check("unfinished_reservation_is_not_claimed_recoverable", async () => {
      const pending = await makeVideo({ ready_at: null, status: "uploading" });
      assert.equal((await assets.cancel(pending)).kind, "canceled");
      assert.equal(
        await prisma.video_retention_record.findUnique({
          where: {
            identity_hash: videoRetentionIdentity(
              "cloudflare_stream",
              "unknown",
              pending.provider_uid,
            ),
          },
        }),
        null,
      );
    });
    await check("pagination_does_not_repeat_rows", async () => {
      const one = await retained.list({ limit: 1 });
      const two = await retained.list({ limit: 50, after: one[0].identity_hash });
      assert.equal(
        two.some((row) => row.id === one[0].id),
        false,
      );
      assert.equal(one.length + two.length, await prisma.video_retention_record.count());
      const cli = spawnSync(
        process.execPath,
        ["/app/dist/operations/video-assets/video-retention.js", "--list", "--limit=50"],
        {
          encoding: "utf8",
          timeout: 15000,
          env: {
            ...process.env,
            BASE: "https://homolog-api.lectum.com.br",
            WEB_URL: "https://homolog.lectum.com.br",
          },
        },
      );
      assert.equal(cli.status, 0);
      const listing = JSON.parse(cli.stdout);
      assert.equal(listing.mode, "read_only");
      assert.equal(listing.count, one.length + two.length);
      assert.ok(listing.items.every((item) => item.deletionHold && !item.deletionAuthorized));
      for (const forbidden of [
        source.objectKey,
        source.namespace,
        source.etag,
        oldVideo.provider_uid,
        newVideo.provider_uid,
      ]) {
        assert.equal(cli.stdout.includes(forbidden), false);
      }
    });
    await check("legacy_video_helpers_do_not_touch_provider", async () => {
      const {
        deletePublicProfileMedia,
      } = require("/app/dist/modules/profile-media/public-storage.js");
      const {
        deleteExpiredShareArtifactObject,
      } = require("/app/dist/modules/api/private/posts/use-cases/services/share-artifact.js");
      await deletePublicProfileMedia("/public/files/psychologist/video/preserved.mp4");
      assert.equal(
        await deleteExpiredShareArtifactObject("posts/share-artifacts/preserved.mp4"),
        false,
      );
    });
    console.log("PROBE_SUMMARY", JSON.stringify({ passed, failed: 0, total: passed }));
    console.log("VIDEO_RETENTION_POSTGRES_OK");
  } catch {
    console.error("CHECK_FAIL", step);
    console.log("PROBE_SUMMARY", JSON.stringify({ passed, failed: 1, total: passed + 1 }));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
