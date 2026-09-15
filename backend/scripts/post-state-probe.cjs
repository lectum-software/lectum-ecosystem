// Somente via post-state-integration.mjs; não executar contra banco existente.
// Real repositories and mappers from the selected image, against fresh PostgreSQL only.
// No HTTP/auth/provider claim; no mocks, rewritten modules or repository source mounts.
const assert = require("node:assert/strict");
assert.equal(process.env.NODE_ENV, "test");
assert.match(new URL(process.env.DATABASE_URL).hostname, /^lectum-poststate178-db-[a-f0-9]{20}$/);
const { prisma } = require("/app/dist/external/prisma/client.js");
const base = "/app/dist/modules/api/private/";
const { PostListRepository } = require(`${base}posts/repositories/queries/PostListRepository.js`);
const { PostCoreRepository } = require(`${base}posts/repositories/queries/PostCoreRepository.js`);
const { PostReplyRepository } = require(`${base}posts/repositories/queries/PostReplyRepository.js`);
const { PostReplyStateRepository } = require(
  `${base}posts/repositories/queries/PostReplyStateRepository.js`,
);
const { CommunityPostRepository } = require(
  `${base}community/repositories/queries/CommunityPostRepository.js`,
);
const { getFollowedCommunityIds } = require(
  `${base}community/repositories/support/community-ranking.js`,
);
const { listPostSelect, replyBaseSelect, toListPostResponse } = require(
  `${base}posts/repositories/support/post-response.js`,
);
let step = "setup",
  passed = 0;
const failures = [];
const safeScalar = (value) =>
  value === undefined
    ? "missing"
    : typeof value === "boolean" || typeof value === "number"
      ? value
      : "non_scalar";
const check = async (name, fn) => {
  step = name;
  try {
    await fn();
    passed++;
    console.log("CHECK_OK", name);
  } catch (e) {
    // Infra/schema/timeout não podem ser classificados como uma regressão esperada.
    if (!(e instanceof assert.AssertionError)) throw e;
    failures.push(name);
    console.log(
      "CHECK_FAIL",
      name,
      "actual",
      safeScalar(e.actual),
      "expected",
      safeScalar(e.expected),
    );
  }
};
(async () => {
  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_stat_statements`;
  const owner = await prisma.user.create({
    data: {
      name: "Disposable owner",
      email: "post-state-owner@example.com",
      role: "paciente",
      confirmed: true,
    },
  });
  const other = await prisma.user.create({
    data: {
      name: "Disposable other",
      email: "post-state-other@example.com",
      role: "paciente",
      confirmed: true,
    },
  });
  const list = new PostListRepository(),
    core = new PostCoreRepository();
  const replyRepo = new PostReplyRepository(core),
    replyState = new PostReplyStateRepository();
  const communityRepo = new CommunityPostRepository();
  const cases = [];
  // Membership has no active flag: inactive membership is deleted=true. Also cover inactive/deleted community.
  for (const kind of [
    "active_member",
    "no_member",
    "deleted_member",
    "inactive_community",
    "deleted_community",
  ]) {
    const community = await prisma.community.create({
      data: {
        name: `Disposable ${kind}`,
        slug: `post-state-${kind.replaceAll("_", "-")}`,
        active: kind !== "inactive_community",
        deleted: kind === "deleted_community",
      },
    });
    if (kind !== "no_member")
      await prisma.community_member.create({
        data: {
          user_id: owner.id,
          community_id: community.id,
          deleted: kind === "deleted_member",
          deletedAt: kind === "deleted_member" ? new Date() : null,
        },
      });
    // Another identity follows everything: must never determine owner's following state.
    await prisma.community_member.create({
      data: { user_id: other.id, community_id: community.id },
    });
    const posts = [];
    for (let i = 0; i < 2; i++) {
      const post = await prisma.community_post.create({
        data: {
          community_id: community.id,
          author_id: owner.id,
          title: "Disposable post",
          content: "Local repository regression only",
          anonymous: false,
          status: "publicado",
        },
      });
      const reply = await prisma.post_reply.create({
        data: { post_id: post.id, author_id: owner.id, content: "Disposable comment" },
      });
      await prisma.community_post.update({ where: { id: post.id }, data: { replies_count: 1 } });
      for (const user of [owner, other]) {
        await prisma.post_save.create({ data: { user_id: user.id, post_id: post.id } });
        await prisma.post_reply_save.create({ data: { user_id: user.id, reply_id: reply.id } });
      }
      posts.push({ post, reply });
    }
    cases.push({
      kind,
      community,
      posts,
      visible: !kind.endsWith("_community"),
      following: kind === "active_member",
    });
  }
  const active = cases[0];
  for (const c of cases) {
    await check(`community_posts_${c.kind}`, async () => {
      const r = await communityRepo.posts({
        p: { slug: c.community.slug },
        q: { limit: 50 },
        auth: owner,
      });
      if (!c.visible) return assert.equal(r, null);
      assert.equal(r.data.length, 2);
      assert.equal(r.community.following, c.following);
      for (const p of r.data) assert.equal(p.community.following, c.following);
    });
    if (c.visible)
      await check(`detail_${c.kind}`, async () => {
        const r = await core.show({ p: { id: c.posts[0].post.id }, auth: owner });
        assert.equal(r.post.community.following, c.following);
      });
  }
  for (const method of ["mine", "saved"])
    for (const type of ["posts", "replies", "all"]) {
      const response = await list[method]({ auth: owner, q: { type, limit: 50 } });
      await check(`${method}_${type}_visibility_contract`, async () => {
        assert.equal(response.count, type === "all" ? 12 : 6);
        assert.deepEqual(response.data, response.items);
        assert.equal(response.data.length, response.count);
        assert.ok(
          response.data.every(
            (x) =>
              !cases.filter((c) => !c.visible).some((c) => c.community.id === x.post.community.id),
          ),
        );
      });
      for (const c of cases.filter((c) => c.visible))
        await check(`${method}_${type}_${c.kind}_following`, async () => {
          const items = response.data.filter((x) => x.post.community.id === c.community.id);
          assert.equal(items.length, type === "all" ? 4 : 2);
          for (const item of items) assert.equal(item.post.community.following, c.following);
        });
    }
  await check("saved_other_identity_has_independent_membership", async () => {
    const response = await list.saved({ auth: other, q: { type: "all", limit: 50 } });
    assert.equal(response.count, 12);
    for (const item of response.data) assert.equal(item.post.community.following, true);
  });
  await check("existing_membership_helper_filters_softdeleted_and_inactive", async () => {
    const ids = await getFollowedCommunityIds(
      owner.id,
      cases.map((c) => c.community.id),
    );
    assert.equal(ids.size, 1);
    assert.equal(ids.has(active.community.id), true);
    assert.equal(
      (
        await getFollowedCommunityIds(
          undefined,
          cases.map((c) => c.community.id),
        )
      ).size,
      0,
    );
    assert.equal((await getFollowedCommunityIds(owner.id, [])).size, 0);
  });
  for (const method of ["mine", "saved"])
    await check(`${method}_one_membership_query_for_twelve_items`, async () => {
      await prisma.$executeRaw`SELECT pg_stat_statements_reset()`;
      const response = await list[method]({ auth: owner, q: { type: "all", limit: 50 } });
      assert.equal(response.data.length, 12);
      const rows =
        await prisma.$queryRaw`SELECT COALESCE(SUM(calls),0)::int AS calls FROM pg_stat_statements WHERE query LIKE 'SELECT%' AND query LIKE '%"community_members"%' AND query NOT LIKE '%pg_stat_statements%'`;
      assert.equal(rows[0].calls, 1);
    });
  const selected = await prisma.community_post.findUniqueOrThrow({
    where: { id: active.posts[0].post.id },
    select: listPostSelect,
  });
  await check("legacy_mapper_arguments_still_omit_optional_following", async () => {
    const p = toListPostResponse(selected, 1, true, undefined, true, true);
    assert.equal(Object.hasOwn(p.community, "following"), false);
    assert.equal(p.muted_by_current_user, true);
    assert.equal(p.has_psychologist_reply, true);
    assert.equal(p.current_user_vote, 1);
    assert.equal(p.saved, true);
    assert.equal(p.highlighted_professional_reply, null);
  });
  for (const following of [true, false])
    await check(`mapper_append_following_${following}_preserves_flags`, async () => {
      const p = toListPostResponse(selected, -1, false, undefined, true, true, following);
      assert.equal(p.community.following, following);
      assert.equal(p.muted_by_current_user, true);
      assert.equal(p.has_psychologist_reply, true);
      assert.equal(p.current_user_vote, -1);
      assert.equal(p.saved, false);
    });
  // Exercise real create/delete transactions on a separate thread, not hand-written deletion SQL.
  const threadPost = await prisma.community_post.create({
    data: {
      community_id: active.community.id,
      author_id: owner.id,
      title: "Disposable deletion thread",
      content: "Local regression only",
      anonymous: false,
    },
  });
  const createReply = async (parentReplyId) => {
    const r = await replyRepo.createReply({
      auth: owner,
      p: { id: threadPost.id },
      b: { content: "Disposable nested reply", ...(parentReplyId ? { parentReplyId } : {}) },
    });
    assert.equal(r.kind, "ok");
    return r.data;
  };
  const root = await createReply();
  const child = await createReply(root.id);
  await check("before_delete_parent_count_and_child_match", async () => {
    const r = await replyRepo.replies({ auth: owner, p: { id: threadPost.id }, q: { limit: 50 } });
    assert.equal(r.data.length, 1);
    assert.equal(r.data[0].replies_count, 1);
    assert.equal(r.data[0].replies[0].id, child.id);
    assert.equal(
      (await core.show({ auth: owner, p: { id: threadPost.id } })).post.replies_count,
      2,
    );
  });
  step = "real_delete_child";
  const deletion = await replyState.deleteReply({
    auth: owner,
    p: { id: threadPost.id, replyId: child.id },
  });
  await check("delete_only_child_keeps_parent_and_total_one", async () => {
    assert.equal(deletion.kind, "ok");
    assert.deepEqual(deletion.data.reply_ids, [child.id]);
    assert.equal(deletion.data.deleted_count, 1);
    assert.equal(deletion.data.replies_count, 1);
    assert.equal(
      (await prisma.post_reply.findUniqueOrThrow({ where: { id: root.id } })).deleted,
      false,
    );
    assert.equal(
      (await prisma.post_reply.findUniqueOrThrow({ where: { id: child.id } })).deleted,
      true,
    );
  });
  for (let reload = 0; reload < 2; reload++) {
    await check(`reload_${reload}_list_deleted_child_count_zero`, async () => {
      const r = await replyRepo.replies({
        auth: owner,
        p: { id: threadPost.id },
        q: { limit: 50 },
      });
      assert.equal(r.count, 1);
      assert.equal(r.data[0].replies.length, 0);
      assert.equal(r.data[0].replies_count, 0);
    });
    await check(`reload_${reload}_thread_deleted_child_count_zero`, async () => {
      const r = await replyRepo.replyThread({
        auth: owner,
        p: { id: threadPost.id, replyId: root.id },
      });
      assert.equal(r.replies.length, 0);
      assert.equal(r.replies_count, 0);
    });
  }
  const survivor = await createReply(root.id);
  await check("mixed_active_deleted_children_count_only_active", async () => {
    const r = await replyRepo.replyThread({
      auth: owner,
      p: { id: threadPost.id, replyId: root.id },
    });
    assert.equal(r.replies.length, 1);
    assert.equal(r.replies[0].id, survivor.id);
    assert.equal(r.replies_count, 1);
  });
  let deep = survivor;
  for (let n = 0; n < 4; n++) deep = await createReply(deep.id);
  await check("depth_limit_still_reports_real_unhydrated_child", async () => {
    const r = await replyRepo.replies({ auth: owner, p: { id: threadPost.id }, q: { limit: 50 } });
    const boundary = r.data[0].replies[0].replies[0].replies[0];
    assert.equal(boundary.replies.length, 0);
    assert.equal(boundary.replies_count, 1);
  });
  await check("filtered_selector_return_type_remains_numeric", async () => {
    const r = await prisma.post_reply.findUniqueOrThrow({
      where: { id: root.id },
      select: replyBaseSelect,
    });
    assert.equal(typeof r._count.replies, "number");
    assert.equal(r._count.replies, 1);
  });
  assert.equal(passed + failures.length, 48, "A suíte deve executar todos os 48 cenários.");
  console.log(
    "PROBE_SUMMARY",
    JSON.stringify({ passed, failed: failures.length, total: passed + failures.length }),
  );
  if (failures.length) process.exitCode = 1;
  else console.log("POST_STATE_POSTGRES_OK");
})()
  .catch((e) => {
    console.error(
      "INTEGRATION_FAILED",
      step,
      e.constructor.name,
      typeof e.code === "string" && /^P\d{4}$/.test(e.code) ? e.code : "setup_or_scenario_failed",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
