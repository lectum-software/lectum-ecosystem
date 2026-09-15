// Real compiled modules and disposable PostgreSQL only; no provider or source overlays.
const assert = require("node:assert/strict");
const { randomBytes, createHash } = require("node:crypto");
const { readFileSync, existsSync } = require("node:fs");
const { setTimeout: delay } = require("node:timers/promises");
const { Client } = require("/app/node_modules/pg");
assert.equal(process.env.NODE_ENV, "test");
const version = require("/app/package.json").version;
assert.match(version, /^0\.1\.\d+$/);
assert.equal(existsSync("/app/.env"), false);
assert.deepEqual(
  Object.keys(process.env).sort(),
  [
    "ADMIN_JWT_SECRET",
    "CRYPTO_ALGORITHM",
    "DATABASE_URL",
    "JWT_SECRET_KEY",
    "NODE_ENV",
    "PATH",
  ].sort(),
);
const url = new URL(process.env.DATABASE_URL);
assert.match(url.hostname, /^lectum-media-association178-db-[a-f0-9]{20}$/);
assert.equal(url.pathname, "/lectum_audit");
const { prisma } = require("/app/dist/external/prisma/client.js");
const { VideoAssetRepository } = require("/app/dist/modules/video-assets/repository.js");
const services = require("/app/dist/modules/video-assets/service.js");
const stream = require("/app/dist/infra/video-stream/index.js");
const { retireOwnedVideoAssetReference } = require("/app/dist/modules/video-assets/lifecycle.js");
const {
  PostCoreRepository,
} = require("/app/dist/modules/api/private/posts/repositories/queries/PostCoreRepository.js");
const {
  PostReplyRepository,
} = require("/app/dist/modules/api/private/posts/repositories/queries/PostReplyRepository.js");
const {
  PostUpdateRepository,
} = require("/app/dist/modules/api/private/posts/repositories/queries/PostUpdateRepository.js");
const {
  CommunityPostRepository,
} = require("/app/dist/modules/api/private/community/repositories/queries/CommunityPostRepository.js");
const i18n = require("/app/dist/main/server/i18n.js").default;
const assets = new VideoAssetRepository();
const core = new PostCoreRepository();
const replies = new PostReplyRepository(core);
const edits = new PostUpdateRepository(core);
const communityPosts = new CommunityPostRepository();
const monitor = new Client({ connectionString: process.env.DATABASE_URL });
let step = "initialization";
let passed = 0;
let failed = 0;
const outstanding = new Set();
const check = async (name, fn) => {
  step = name;
  const result = await fn();
  passed++;
  console.log("CHECK_OK", name, JSON.stringify(result || {}));
};
const tracked = (promise) => {
  outstanding.add(promise);
  promise.then(
    () => outstanding.delete(promise),
    () => outstanding.delete(promise),
  );
  return promise;
};
const waitForBlockedAssetUpdate = async (blockerPid) => {
  for (let attempt = 0; attempt < 300; attempt++) {
    const r = await monitor.query(
      "SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() " +
        "AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE '%UPDATE%video_assets%' " +
        "AND $1::int = ANY(pg_blocking_pids(pid))",
      [blockerPid],
    );
    if (r.rows[0].n === 1) return;
    await delay(10);
  }
  throw new Error("NativeBarrierNotReached");
};
// SQL lock affects only this ephemeral DB. No trigger, replacement repository, or runtime patch.
const cancelAcrossAssociation = async (asset, associate, options = {}) => {
  const blocker = new Client({ connectionString: process.env.DATABASE_URL });
  await blocker.connect();
  await blocker.query("BEGIN");
  const { rows } = await blocker.query(
    "SELECT pg_backend_pid() AS pid, id FROM video_assets WHERE id=$1 FOR UPDATE",
    [asset.id],
  );
  assert.equal(rows.length, 1);
  let cancellation;
  let association;
  try {
    cancellation = tracked(services.cancelOwnedVideoAsset(asset.id, asset.owner_id, options));
    await waitForBlockedAssetUpdate(rows[0].pid);
    association = await associate();
  } finally {
    await blocker.query("COMMIT");
    await blocker.end();
    if (cancellation) await cancellation;
  }
  const result = await cancellation;
  return { association, cancellation: result };
};
const next = () => randomBytes(8).toString("hex");
let community, plan;
const newOwner = async () => {
  const user = await prisma.user.create({
    data: {
      name: "Isolated Media Audit",
      email: `media-${next()}@example.test`,
      role: "psicologo",
      confirmed: true,
      active: true,
    },
  });
  const profile = await prisma.psychologist_profile.create({
    data: {
      user_id: user.id,
      crp_status: "aprovado",
      published: false,
    },
  });
  await prisma.professional_subscription.create({
    data: {
      psychologist_id: profile.id,
      plan_id: plan.id,
      status: "ativa",
      source: "admin_grant",
    },
  });
  await prisma.community_member.create({
    data: {
      community_id: community.id,
      user_id: user.id,
    },
  });
  return { user, profile };
};
const newPost = (owner) =>
  prisma.community_post.create({
    data: {
      author_id: owner.user.id,
      community_id: community.id,
      title: "Isolated media state",
      content: "Temporary database-only audit content.",
      status: "publicado",
    },
  });
const newAsset = (owner, purpose, contextId, extra = {}) =>
  prisma.video_asset.create({
    data: {
      owner_id: owner.user.id,
      provider: "cloudflare_stream",
      provider_uid: randomBytes(16).toString("hex"),
      purpose,
      context_id: contextId,
      status: "ready",
      mime_type: "video/mp4",
      size_bytes: 1n,
      upload_expires_at: new Date(Date.now() + 60_000),
      ready_at: new Date(),
      ...extra,
    },
  });
const reference = (asset) => stream.videoAssetPlaybackReference(asset.id);
const admission = (asset) =>
  services.resolveReadyOwnedVideoAssetReference({
    ownerId: asset.owner_id,
    purpose: asset.purpose,
    contextId: asset.context_id,
    reference: reference(asset),
  });
const profilePair = async () => {
  const owner = await newOwner();
  const old = await newAsset(owner, "profile_presentation", owner.profile.id, {
    createdAt: new Date(Date.now() - 60_000),
  });
  await prisma.psychologist_profile.update({
    where: { id: owner.profile.id },
    data: { video_url: reference(old) },
  });
  const current = await newAsset(owner, "profile_presentation", owner.profile.id);
  return { owner, old, current };
};
const storedProfile = (owner) =>
  prisma.psychologist_profile.findUniqueOrThrow({ where: { id: owner.profile.id } });
const storedAsset = (asset) => prisma.video_asset.findUniqueOrThrow({ where: { id: asset.id } });
const assertUnavailable = async (asset) => {
  assert.equal(await assets.findById(asset.id), null);
  assert.equal((await services.authorizePublicVideoAssetPlayback(asset.id)).status, 404);
};

(async () => {
  await monitor.connect();
  if (!i18n.isInitialized) await new Promise((resolve) => i18n.on("initialized", resolve));
  await check("CONTROL_immutable_modules_and_disabled_provider", async () => {
    assert.equal(stream.getVideoStreamConfig(), null);
    assert.equal(stream.getVideoStreamProvider(), null);
    const modules = [
      "modules/video-assets/repository.js",
      "modules/video-assets/service.js",
      "modules/api/private/community/repositories/queries/CommunityPostRepository.js",
      "modules/api/private/posts/repositories/queries/PostReplyRepository.js",
      "modules/api/private/posts/repositories/queries/PostUpdateRepository.js",
      "utils/prisma-transaction.js",
    ];
    return {
      version,
      providerConfigured: false,
      moduleSha256: Object.fromEntries(
        modules.map((name) => [
          name,
          createHash("sha256")
            .update(readFileSync(`/app/dist/${name}`))
            .digest("hex"),
        ]),
      ),
    };
  });
  community = await prisma.community.create({
    data: { name: "Isolated Media", slug: `media-${next()}` },
  });
  plan = await prisma.subscription_plan.create({
    data: { name: "Isolated entitlement", slug: `media-${next()}`, price_cents: 1000 },
  });

  await check("CONTROL_ready_owner_context_purpose", async () => {
    const owner = await newOwner();
    const other = await newOwner();
    const asset = await newAsset(owner, "community_post", community.slug);
    const input = {
      ownerId: owner.user.id,
      contextId: community.slug,
      purpose: asset.purpose,
      reference: reference(asset),
    };
    assert.equal(await assets.isReadyOwnedReference(input), true);
    assert.equal(await assets.isReadyOwnedReference({ ...input, ownerId: other.user.id }), false);
    assert.equal(
      await assets.isReadyOwnedReference({ ...input, contextId: "different-context" }),
      false,
    );
    assert.equal(
      await assets.isReadyOwnedReference({ ...input, purpose: "community_reply" }),
      false,
    );
    assert.equal(await core.canAttachReplyMedia(owner.user.id), true);
    return { correct: true, wrongOwner: false, wrongContext: false, wrongPurpose: false };
  });

  await check("CONTROL_M2_attached_post_cancel_409_and_other_owner_noop", async () => {
    const owner = await newOwner(),
      other = await newOwner();
    const asset = await newAsset(owner, "community_post", community.slug);
    assert.equal(await admission(asset), reference(asset));
    const post = await communityPosts.createPost({
      auth: owner.user,
      p: { slug: community.slug },
      b: {
        title: "Native repository",
        content: "Native database mutation.",
        mediaType: "video",
        mediaUrl: reference(asset),
      },
    });
    assert.ok(post);
    assert.equal((await services.cancelOwnedVideoAsset(asset.id, other.user.id)).status, 200);
    assert.equal((await storedAsset(asset)).deleted, false);
    assert.equal((await services.cancelOwnedVideoAsset(asset.id, owner.user.id)).status, 409);
    assert.equal((await storedAsset(asset)).deleted, false);
    return { attachedCancelStatus: 409, wrongOwnerDidNotDelete: true };
  });

  await check("CONTROL_M2_cancel_before_reply_admission_rejected", async () => {
    const owner = await newOwner(),
      post = await newPost(owner);
    const asset = await newAsset(owner, "community_reply", post.id);
    assert.equal((await services.cancelOwnedVideoAsset(asset.id, owner.user.id)).status, 200);
    const result = await replies.createReply({
      auth: owner.user,
      p: { id: post.id },
      b: { content: "Native reply", mediaType: "video", mediaUrl: reference(asset) },
    });
    assert.equal(result.kind, "invalid_media");
    assert.equal(await prisma.post_reply.count({ where: { post_id: post.id } }), 0);
    return { kind: result.kind, committedReplies: 0 };
  });

  for (const mode of ["create_post", "create_reply", "edit_post", "edit_reply"]) {
    await check(`M2_cancel_x_${mode}`, async () => {
      const owner = await newOwner(),
        post = await newPost(owner);
      const isReply = mode.endsWith("reply");
      const asset = await newAsset(
        owner,
        isReply ? "community_reply" : "community_post",
        isReply ? post.id : community.slug,
      );
      let targetReply;
      if (mode === "edit_reply") {
        const result = await replies.createReply({
          auth: owner.user,
          p: { id: post.id },
          b: { content: "Original reply" },
        });
        assert.equal(result.kind, "ok");
        targetReply = result.data;
      }
      let linkedId;
      const result = await cancelAcrossAssociation(asset, async () => {
        assert.equal(await admission(asset), reference(asset));
        if (mode === "create_post") {
          const created = await communityPosts.createPost({
            auth: owner.user,
            p: { slug: community.slug },
            b: {
              title: "Native race",
              content: "Native real DB race.",
              mediaType: "video",
              mediaUrl: reference(asset),
            },
          });
          assert.ok(created);
          linkedId = created.id;
          return "ok";
        }
        if (mode === "create_reply") {
          const created = await replies.createReply({
            auth: owner.user,
            p: { id: post.id },
            b: { content: "Native race", mediaType: "video", mediaUrl: reference(asset) },
          });
          assert.equal(created.kind, "ok");
          linkedId = created.data.id;
          return created.kind;
        }
        const args = {
          auth: owner.user,
          p: { id: post.id, ...(targetReply ? { replyId: targetReply.id } : {}) },
          b: { content: "Edited native race", mediaType: "video", mediaUrl: reference(asset) },
        };
        const edited =
          mode === "edit_post" ? await edits.updatePost(args) : await edits.updateReply(args);
        assert.equal(edited.kind, "ok");
        linkedId = edited.data.id;
        return edited.kind;
      });
      const linked = isReply
        ? await prisma.post_reply.findUniqueOrThrow({ where: { id: linkedId } })
        : await prisma.community_post.findUniqueOrThrow({ where: { id: linkedId } });
      assert.equal(linked.media_url, reference(asset));
      assert.equal(result.cancellation.status, 409);
      assert.equal((await storedAsset(asset)).deleted, false);
      assert.equal((await storedAsset(asset)).status, "ready");
      assert.equal(await assets.isAttached(asset), true);
      assert.equal(await assets.isPlaybackAuthorized(asset), true);
      assert.equal((await services.cancelOwnedVideoAsset(asset.id, owner.user.id)).status, 409);
      return {
        association: result.association,
        cancelStatus: 409,
        domainReferencePersisted: true,
        assetDeleted: false,
        invariantHolds: true,
        barrier: "native_row_lock",
        providerCalled: false,
      };
    });
  }

  await check("CONTROL_M3_normal_attach_then_duplicate_noop", async () => {
    const { owner, old, current } = await profilePair();
    const attached = await assets.attachReadyProfileAsset(current);
    assert.equal(attached.attached, true);
    assert.equal(attached.previousVideoUrl, reference(old));
    assert.equal((await storedAsset(old)).deleted, true);
    assert.equal((await storedProfile(owner)).video_url, reference(current));
    assert.equal((await assets.attachReadyProfileAsset(current)).attached, false);
    assert.equal((await storedAsset(current)).deleted, false);
    return {
      attached: true,
      duplicateAttached: false,
      oldRetiredInDb: true,
      physicalDeleteTested: false,
    };
  });

  await check("CONTROL_M3_cancel_before_stale_attach_preserves_old", async () => {
    const { owner, old, current } = await profilePair();
    assert.equal((await services.cancelOwnedVideoAsset(current.id, owner.user.id)).status, 200);
    assert.equal((await assets.attachReadyProfileAsset(current)).attached, false);
    assert.equal((await storedProfile(owner)).video_url, reference(old));
    assert.equal((await storedAsset(old)).deleted, false);
    return { canceledSnapshotReattached: false, oldPreserved: true };
  });

  await check("CONTROL_M3_explicit_legacy_delete_clears_profile", async () => {
    const { owner, old, current } = await profilePair();
    assert.equal((await assets.attachReadyProfileAsset(current)).attached, true);
    assert.equal(await assets.isAttached(current), true);
    const response = await services.cancelOwnedVideoAsset(current.id, owner.user.id);
    assert.equal(response.status, 200);
    assert.equal((await storedProfile(owner)).video_url, null);
    assert.equal((await storedAsset(old)).deleted, true);
    assert.equal((await storedAsset(current)).deleted, true);
    return { cancelStatus: 200, profileCleared: true, oldRestored: false, uiAbortTested: false };
  });

  for (const onlyUnattached of [true, false]) {
    await check(
      onlyUnattached
        ? "M3_cleanup_x_attach_preserves_committed_profile"
        : "M3_legacy_delete_x_attach_never_dangles",
      async () => {
        const { owner, old, current } = await profilePair();
        const result = await cancelAcrossAssociation(
          current,
          () => assets.attachReadyProfileAsset(current),
          { onlyUnattached },
        );
        assert.equal(result.association.attached, true);
        assert.equal((await storedAsset(old)).deleted, true);
        assert.equal(result.cancellation.status, onlyUnattached ? 409 : 200);
        assert.equal(
          (await storedProfile(owner)).video_url,
          onlyUnattached ? reference(current) : null,
        );
        assert.equal((await storedAsset(current)).deleted, !onlyUnattached);
        if (!onlyUnattached) await assertUnavailable(current);
        assert.equal((await assets.attachReadyProfileAsset(current)).attached, false);
        return {
          attachCommitted: true,
          cancelStatus: result.cancellation.status,
          profileReferencesCanceledAsset: false,
          onlyUnattached,
          providerCalled: false,
        };
      },
    );
  }

  await check("CONTROL_M3_canceled_asset_provider_update_rejected", async () => {
    const { owner, current } = await profilePair();
    await services.cancelOwnedVideoAsset(current.id, owner.user.id);
    const result = await assets.applyProviderUpdate(current, {
      status: "ready",
      durationSeconds: 1,
      errorCode: null,
      height: 1,
      width: 1,
    });
    assert.equal(result, null);
    assert.equal((await storedAsset(current)).status, "canceled");
    return { updateAccepted: false, providerCalled: false };
  });
  for (const mode of ["create_post", "create_reply", "edit_post", "edit_reply"]) {
    await check(`M2_cancel_first_${mode}`, async () => {
      const owner = await newOwner(),
        post = await newPost(owner);
      const isReply = mode.endsWith("reply");
      const asset = await newAsset(
        owner,
        isReply ? "community_reply" : "community_post",
        isReply ? post.id : community.slug,
      );
      const original = await replies.createReply({
        auth: owner.user,
        p: { id: post.id },
        b: { content: "Preserved reply" },
      });
      assert.equal(original.kind, "ok");
      assert.equal((await services.cancelOwnedVideoAsset(asset.id, owner.user.id)).status, 200);
      const b = {
        title: "Native admission",
        content: "No canceled media",
        mediaType: "video",
        mediaUrl: reference(asset),
      };
      const result =
        mode === "create_post"
          ? await communityPosts.createPost({ auth: owner.user, p: { slug: community.slug }, b })
          : mode === "create_reply"
            ? await replies.createReply({ auth: owner.user, p: { id: post.id }, b })
            : mode === "edit_post"
              ? await edits.updatePost({ auth: owner.user, p: { id: post.id }, b })
              : await edits.updateReply({
                  auth: owner.user,
                  p: { id: post.id, replyId: original.data.id },
                  b,
                });
      assert.equal(
        mode === "create_post" ? result : result.kind,
        mode === "create_post" ? null : "invalid_media",
      );
      assert.equal(await assets.isAttached(asset), false);
      return { canceledReferenceAttached: false };
    });
  }

  await check("M3_cancel_dispositions_are_committed_and_idempotent", async () => {
    const { owner, current } = await profilePair();
    assert.equal((await assets.cancel(current, { onlyUnattached: true })).kind, "canceled");
    assert.equal((await assets.cancel(current, { onlyUnattached: true })).kind, "not_found");
    const other = await newOwner();
    const ready = await newAsset(other, "community_post", community.slug);
    assert.equal(
      (await assets.cancel({ id: ready.id, owner_id: owner.user.id })).kind,
      "not_found",
    );
    assert.equal((await storedAsset(ready)).deleted, false);
    return { canceled: true, repeatNotFound: true, wrongOwnerPreserved: true };
  });

  await check("M3_cleanup_api_composition_preserves_attached_profile", async () => {
    const api = require("/app/dist/modules/api/private/video-assets/use-cases/services.js");
    assert.equal(typeof api.cancelUpload, "function");
    const { owner, current } = await profilePair();
    assert.equal((await assets.attachReadyProfileAsset(current)).attached, true);
    const result = await api.cancelUpload({ auth: owner.user, p: { id: current.id } });
    assert.equal(result.status, 409);
    assert.equal((await storedProfile(owner)).video_url, reference(current));
    assert.equal((await storedAsset(current)).deleted, false);
    return { status: result.status, realServiceComposition: true, httpTransportTested: false };
  });

  await check("M3_retirement_requires_unattached_asset", async () => {
    const { owner, current } = await profilePair();
    assert.equal((await assets.attachReadyProfileAsset(current)).attached, true);
    const input = {
      ownerId: owner.user.id,
      purpose: "profile_presentation",
      reference: reference(current),
    };
    assert.equal(await retireOwnedVideoAssetReference(input), false);
    assert.equal((await storedAsset(current)).deleted, false);
    await prisma.psychologist_profile.update({
      where: { id: owner.profile.id },
      data: { video_url: null },
    });
    assert.equal(await retireOwnedVideoAssetReference(input), true);
    assert.equal(await retireOwnedVideoAssetReference(input), false);
    return {
      attachedPreserved: true,
      detachedRetired: true,
      repeatNoop: true,
      providerCalled: false,
    };
  });

  await check("M3_stale_ready_snapshot_cannot_attach_processing_asset", async () => {
    const { owner, old, current } = await profilePair();
    await prisma.video_asset.update({ where: { id: current.id }, data: { status: "processing" } });
    assert.equal((await assets.attachReadyProfileAsset(current)).attached, false);
    assert.equal((await storedProfile(owner)).video_url, reference(old));
    assert.equal((await storedAsset(old)).deleted, false);
    return { staleReadySnapshotRejected: true, oldPreserved: true };
  });

  await check("M2_media_items_association_blocks_cancel", async () => {
    const owner = await newOwner(),
      post = await newPost(owner);
    const asset = await newAsset(owner, "community_post", community.slug);
    await prisma.community_post_media.create({
      data: { post_id: post.id, media_url: reference(asset), media_type: "video", position: 0 },
    });
    assert.equal(await assets.isAttached(asset), true);
    assert.equal(await assets.isPlaybackAuthorized(asset), true);
    assert.equal(
      (await services.cancelOwnedVideoAsset(asset.id, owner.user.id, { onlyUnattached: true }))
        .status,
      409,
    );
    assert.equal((await storedAsset(asset)).deleted, false);
    return { carouselAssociationPreserved: true, playbackAssociationAuthorized: true };
  });

  await check("M2_revalidate_live_target_and_owner_at_write", async () => {
    const owner = await newOwner(),
      other = await newOwner(),
      post = await newPost(owner);
    const original = await replies.createReply({
      auth: owner.user,
      p: { id: post.id },
      b: { content: "Original" },
    });
    assert.equal(original.kind, "ok");
    assert.equal(
      (await edits.updatePost({ auth: other.user, p: { id: post.id }, b: { content: "No" } })).kind,
      "forbidden",
    );
    assert.equal(
      (
        await edits.updateReply({
          auth: other.user,
          p: { id: post.id, replyId: original.data.id },
          b: { content: "No" },
        })
      ).kind,
      "forbidden",
    );
    await prisma.user.update({ where: { id: owner.user.id }, data: { active: false } });
    assert.equal(
      await communityPosts.createPost({
        auth: owner.user,
        p: { slug: community.slug },
        b: { title: "No", content: "No" },
      }),
      null,
    );
    assert.equal(
      (await edits.updatePost({ auth: owner.user, p: { id: post.id }, b: { content: "No" } })).kind,
      "forbidden",
    );
    assert.equal(
      (await replies.createReply({ auth: owner.user, p: { id: post.id }, b: { content: "No" } }))
        .kind,
      "forbidden",
    );
    await prisma.user.update({ where: { id: owner.user.id }, data: { active: true } });
    await prisma.community_post.update({ where: { id: post.id }, data: { deleted: true } });
    assert.equal(
      (await edits.updatePost({ auth: owner.user, p: { id: post.id }, b: { content: "No" } })).kind,
      "not_found",
    );
    assert.equal(
      (
        await edits.updateReply({
          auth: owner.user,
          p: { id: post.id, replyId: original.data.id },
          b: { content: "No" },
        })
      ).kind,
      "not_found",
    );
    return {
      foreignOwnerRejected: true,
      inactiveAuthorRejected: true,
      deletedTargetRejected: true,
    };
  });

  await check("M3_newer_uploading_blocks_older_ready", async () => {
    const { owner, old, current } = await profilePair();
    const newer = await newAsset(owner, "profile_presentation", owner.profile.id, {
      status: "uploading",
      ready_at: null,
      createdAt: new Date(current.createdAt.getTime() + 1_000),
    });
    assert.equal((await assets.attachReadyProfileAsset(current)).attached, false);
    assert.equal((await storedProfile(owner)).video_url, reference(old));
    for (const asset of [old, current, newer])
      assert.equal((await storedAsset(asset)).deleted, false);
    assert.equal((await storedAsset(newer)).status, "uploading");
    return { olderReadyRejected: true, previousPreserved: true, newestUploadingPreserved: true };
  });

  // Database association/CAS only: these source references do not create or read R2 objects.
  for (const mode of ["valid", "source_mismatch", "thumbnail_mismatch"]) {
    await check(`M3_migration_cas_${mode}`, async () => {
      const {
        createR2MigrationIdentity,
      } = require("/app/dist/modules/video-assets/r2-migration/policy.js");
      const {
        R2_MIGRATION_SOURCE_PROVIDER,
      } = require("/app/dist/modules/video-assets/r2-migration/types.js");
      const owner = await newOwner();
      const objectKey = `psychologist/video/isolated-${next()}.mp4`;
      const source = `/public/files/${objectKey}`;
      const cover = `/public/files/psychologist/video/isolated-${next()}.jpg`;
      const previous = await newAsset(owner, "profile_presentation", owner.profile.id, {
        createdAt: new Date(Date.now() - 60_000),
      });
      await prisma.psychologist_profile.update({
        where: { id: owner.profile.id },
        data: { video_url: source, video_cover_url: cover },
      });
      const identity = createR2MigrationIdentity(
        "profile_presentation",
        owner.profile.id,
        objectKey,
      );
      const candidate = await newAsset(owner, "profile_presentation", owner.profile.id, {
        id: identity.assetId,
        migration_key: identity.migrationKey,
        source_provider: R2_MIGRATION_SOURCE_PROVIDER,
        source_reference: source,
        source_thumbnail_reference: cover,
      });
      if (mode !== "valid") {
        await prisma.psychologist_profile.update({
          where: { id: owner.profile.id },
          data:
            mode === "source_mismatch"
              ? { video_url: `/public/files/psychologist/video/changed-${next()}.mp4` }
              : { video_cover_url: `/public/files/psychologist/video/changed-${next()}.jpg` },
        });
      }
      const before = await storedProfile(owner);
      const result = await assets.attachReadyProfileAsset(candidate);
      const after = await storedProfile(owner);
      const stored = await storedAsset(candidate);
      const accepted = mode === "valid";
      assert.equal(result.attached, accepted);
      assert.equal(after.video_url, accepted ? reference(candidate) : before.video_url);
      assert.equal(after.video_cover_url, accepted ? null : before.video_cover_url);
      assert.equal((await storedAsset(previous)).deleted, accepted);
      assert.equal(stored.deleted, false);
      assert.equal(stored.status, "ready");
      assert.equal(stored.source_reference, source);
      assert.equal(stored.source_thumbnail_reference, cover);
      if (accepted) {
        assert.ok(stored.migrated_at instanceof Date);
        assert.equal(result.previousVideoUrl, source);
        assert.equal(result.previousVideoCoverUrl, cover);
        assert.equal((await assets.attachReadyProfileAsset(candidate)).attached, false);
        assert.equal(
          (await storedAsset(candidate)).migrated_at.getTime(),
          stored.migrated_at.getTime(),
        );
      } else {
        assert.equal(stored.migrated_at, null);
        assert.deepEqual(result.retiredProviderUids, []);
      }
      return {
        accepted,
        migratedAtRecorded: accepted,
        originFieldsPreserved: true,
        physicalMigrationTested: false,
        providerCalled: false,
      };
    });
  }

  assert.equal(passed, 28);

  assert.equal(stream.getVideoStreamProvider(), null);
  console.log("PROBE_SUMMARY", JSON.stringify({ passed, failed, total: passed + failed }));
  console.log("VIDEO_ASSET_ASSOCIATION_POSTGRES_OK");
})()
  .catch((error) => {
    failed++;
    console.error(
      "CHECK_FAIL",
      step,
      /^[A-Z0-9_]+$/.test(error?.code || "") ? error.code : "runtime_or_barrier",
    );
    console.log("PROBE_SUMMARY", JSON.stringify({ passed, failed, total: passed + failed }));
    console.error("INTEGRATION_FAILED", "media_database_only");
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([...outstanding]);
    await monitor.end();
    await prisma.$disconnect();
  });
