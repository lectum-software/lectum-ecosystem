// Real repositories/policy and CLI against disposable PostgreSQL. No provider mocks or uploads.
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const { existsSync } = require("node:fs");
const path = require("node:path");
assert.equal(process.env.NODE_ENV, "test");
assert.equal(process.argv.length, 4);
const [dist, run] = process.argv.slice(2);
assert.match(run, /^[a-f0-9]{20}$/);
assert.equal(dist, path.resolve(__dirname, "../dist"));
const database = new URL(process.env.DATABASE_URL);
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.pathname, `/lectum_reconcile_${run}`);
assert.equal(existsSync(path.join(process.cwd(), ".env")), false);
const { prisma } = require(path.join(dist, "external/prisma/client.js"));
const { VideoUploadReconciliationRepository } = require(
  path.join(dist, "modules/video-assets/reconciliation/repository.js"),
);
const { planVideoUploadReconciliation } = require(
  path.join(dist, "modules/video-assets/reconciliation/policy.js"),
);
const { parseReconcileVideoUploadArguments } = require(
  path.join(dist, "operations/video-assets/reconcile-arguments.js"),
);
const repository = new VideoUploadReconciliationRepository();
let passed = 0;
let step = "setup";
const check = async (name, action) => {
  step = name;
  await action();
  passed++;
  console.log("CHECK_OK", name);
};
const now = new Date();
const prior = new Date(now.getTime() - 60_000);
let owner, parentAuthor, post, profile;
const makeAsset = (extra = {}) =>
  prisma.video_asset.create({
    data: {
      owner_id: owner.id,
      purpose: "community_reply",
      context_id: post.id,
      provider_uid: randomBytes(16).toString("hex"),
      mime_type: "video/mp4",
      size_bytes: 1024n,
      upload_expires_at: prior,
      updatedAt: prior,
      ...extra,
    },
  });
const currentAsset = (asset) => prisma.video_asset.findUniqueOrThrow({ where: { id: asset.id } });
// Explicit policy inputs, not a substitute provider. No service test claims a remote ready state.
const details = (asset, status) => ({
  providerUid: asset.provider_uid,
  status,
  errorCode: null,
  durationSeconds: status === "ready" ? 15 : null,
  height: status === "ready" ? 1920 : null,
  width: status === "ready" ? 1080 : null,
});
const contentSnapshot = async () => ({
  profiles: await prisma.psychologist_profile.findMany({ orderBy: { id: "asc" } }),
  posts: await prisma.community_post.findMany({ orderBy: { id: "asc" } }),
  replies: await prisma.post_reply.findMany({ orderBy: { id: "asc" } }),
  media: await prisma.community_post_media.findMany({ orderBy: { id: "asc" } }),
});
const snapshot = async () => ({
  assets: await prisma.video_asset.findMany({ orderBy: { id: "asc" } }),
  ...(await contentSnapshot()),
});
const cli = (args) =>
  spawnSync(
    process.execPath,
    [path.join(dist, "operations/video-assets/reconcile-video-uploads.js"), ...args],
    { cwd: process.cwd(), env: process.env, encoding: "utf8", timeout: 15_000 },
  );

(async () => {
  try {
    await check("isolated_fixture", async () => {
      assert.equal(await prisma.video_asset.count(), 0);
      owner = await prisma.user.create({
        data: {
          name: "Isolated reconciliation owner",
          email: `${randomBytes(10).toString("hex")}@example.test`,
          role: "psicologo",
        },
      });
      parentAuthor = await prisma.user.create({
        data: {
          name: "Isolated parent author",
          email: `${randomBytes(10).toString("hex")}@example.test`,
          active: false,
          deleted: true,
        },
      });
      const community = await prisma.community.create({
        data: { name: "Isolated reconciliation", slug: randomBytes(10).toString("hex") },
      });
      post = await prisma.community_post.create({
        data: {
          community_id: community.id,
          author_id: parentAuthor.id,
          title: "Isolated",
          content: "Isolated",
        },
      });
      profile = await prisma.psychologist_profile.create({ data: { user_id: owner.id } });
    });
    await check("expired_reservation_marked_without_content_writes", async () => {
      const asset = await makeAsset();
      const before = await contentSnapshot();
      const plan = planVideoUploadReconciliation(asset, details(asset, "uploading"), now);
      assert.equal(plan.status, "error");
      assert.equal(plan.errorCode, "upload_expired");
      assert.equal(await repository.apply(asset, plan, now), true);
      const updated = await currentAsset(asset);
      assert.equal(updated.status, "error");
      assert.equal(updated.error_code, "upload_expired");
      assert.equal(updated.ready_at, null);
      assert.equal(updated.deleted, false);
      assert.equal(updated.last_provider_sync_at.getTime(), now.getTime());
      assert.deepEqual(await contentSnapshot(), before);
    });
    await check("expired_ready_recovery_never_autoassociates", async () => {
      const asset = await makeAsset({ status: "error", error_code: "upload_expired" });
      const before = await contentSnapshot();
      const plan = planVideoUploadReconciliation(asset, details(asset, "ready"), now);
      assert.equal(await repository.apply(asset, plan, now), true);
      const updated = await currentAsset(asset);
      assert.equal(updated.status, "ready");
      assert.equal(updated.error_code, null);
      assert.equal(updated.ready_at.getTime(), now.getTime());
      assert.equal(updated.width, 1080);
      assert.deepEqual(await contentSnapshot(), before);
      assert.equal((await repository.associations(updated)).replyAssociated, false);
    });
    await check("late_processing_can_recover_expiration", async () => {
      const asset = await makeAsset({ status: "error", error_code: "upload_expired" });
      const plan = planVideoUploadReconciliation(asset, details(asset, "processing"), now);
      assert.equal(await repository.apply(asset, plan, now), true);
      assert.equal((await currentAsset(asset)).status, "processing");
    });
    await check("processing_never_regresses_to_reservation", async () => {
      const asset = await makeAsset({ status: "processing" });
      assert.equal(planVideoUploadReconciliation(asset, details(asset, "uploading"), now), null);
      assert.deepEqual(await currentAsset(asset), asset);
    });
    for (const [name, change] of [
      ["ready", { status: "ready", ready_at: now }],
      ["canceled", { status: "canceled" }],
      ["deleted", { deleted: true }],
      ["provider_uid", { provider_uid: randomBytes(16).toString("hex") }],
      ["timestamp", { updatedAt: now }],
    ]) {
      await check(`cas_preserves_concurrent_${name}`, async () => {
        const stale = await makeAsset();
        const plan = planVideoUploadReconciliation(stale, details(stale, "uploading"), now);
        // Force an identical timestamp for non-timestamp cases to independently cover each guard.
        const newer = await prisma.video_asset.update({
          where: { id: stale.id },
          data: { updatedAt: stale.updatedAt, ...change },
        });
        assert.equal(await repository.apply(stale, plan, now), false);
        assert.deepEqual(await currentAsset(stale), newer);
      });
    }
    await check("two_real_competing_writes_have_one_winner", async () => {
      const asset = await makeAsset();
      const plan = planVideoUploadReconciliation(asset, details(asset, "ready"), now);
      const results = await Promise.all([
        repository.apply(asset, plan, now),
        repository.apply(asset, plan, now),
      ]);
      assert.equal(results.filter(Boolean).length, 1);
    });
    await check("ready_canceled_deleted_profile_migration_are_read_only", async () => {
      for (const extra of [
        { status: "ready" },
        { status: "canceled" },
        { deleted: true },
        { purpose: "profile_presentation", context_id: profile.id },
        { source_provider: "cloudflare_r2", migration_key: randomBytes(32).toString("hex") },
      ]) {
        const asset = await makeAsset(extra);
        assert.equal(planVideoUploadReconciliation(asset, details(asset, "ready"), now), null);
        assert.equal(
          await repository.apply(
            asset,
            { status: "ready", errorCode: null, width: null, height: null, durationSeconds: null },
            now,
          ),
          false,
        );
        assert.deepEqual(await currentAsset(asset), asset);
      }
    });
    await check("owner_and_original_post_author_are_distinct", async () => {
      const asset = await makeAsset();
      await prisma.post_reply.create({
        data: {
          post_id: post.id,
          author_id: owner.id,
          content: "Isolated",
          media_type: "video",
          media_url: `/api/private/video-assets/${asset.id}/playback`,
        },
      });
      const report = await repository.associations(asset);
      assert.equal(report.canonicalReplyAssociation, true);
      assert.equal(report.ownerIsOriginalPostAuthor, false);
      assert.equal(report.originalPostAuthorActive, false);
      assert.equal(report.originalPostAuthorDeleted, true);
      const listed = await repository.list(
        parseReconcileVideoUploadArguments([`--asset-id=${asset.id}`]),
      );
      assert.equal(listed[0].owner.active, true);
      assert.equal(listed[0].owner.deleted, false);
    });
    await check("cli_defaults_dry_run_no_provider_no_write", async () => {
      const asset = await makeAsset();
      const before = await snapshot();
      const result = cli([`--asset-id=${asset.id}`]);
      assert.equal(result.status, 2);
      const report = JSON.parse(result.stdout);
      assert.equal(report.mode, "dry-run");
      assert.equal(report.count, 1);
      assert.equal(report.items[0].providerConfigured, false);
      assert.equal(report.items[0].providerReadSucceeded, false);
      assert.equal(report.items[0].applied, false);
      assert.deepEqual(await snapshot(), before);
      for (const forbidden of [
        asset.id,
        owner.id,
        post.id,
        asset.provider_uid,
        owner.email,
        database.password,
      ])
        assert.equal(result.stdout.includes(forbidden), false);
    });
    await check("cli_apply_no_provider_reports_failure_without_write", async () => {
      const asset = await makeAsset();
      const before = await snapshot();
      const result = cli([`--asset-id=${asset.id}`, "--apply", "--confirm=homolog"]);
      assert.equal(result.status, 2);
      assert.equal(JSON.parse(result.stdout).items[0].applied, false);
      assert.deepEqual(await snapshot(), before);
    });
    await check("cli_rejects_wrong_environment_and_batch_apply", async () => {
      const asset = await makeAsset();
      const before = await snapshot();
      for (const args of [
        [`--asset-id=${asset.id}`, "--apply", "--confirm=production"],
        [`--owner-id=${owner.id}`, "--apply", "--confirm=homolog"],
      ]) {
        const result = cli(args);
        assert.equal(result.status, 1);
        assert.equal(result.stdout, "");
        assert.match(result.stderr, /VIDEO_UPLOAD_RECONCILIATION_FAILED/);
        assert.equal(result.stderr.includes(process.env.DATABASE_URL), false);
      }
      assert.deepEqual(await snapshot(), before);
    });
    console.log("PROBE_SUMMARY", JSON.stringify({ passed, failed: 0, total: passed }));
    console.log("VIDEO_RECONCILIATION_POSTGRES_OK");
  } catch {
    console.error("CHECK_FAIL", step);
    console.log("PROBE_SUMMARY", JSON.stringify({ passed, failed: 1, total: passed + 1 }));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
