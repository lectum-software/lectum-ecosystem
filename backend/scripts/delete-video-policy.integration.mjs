import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

// Explicit, empty, disposable local database only; never use the product dev database.
const url = new URL(process.env.DATABASE_URL);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.port, "55432");
assert.equal(url.pathname, "/lectum_delete_video_audit_20261011");
process.env.NODE_ENV = "test";
const { prisma } = await import("../src/infra/database/prisma/index.ts");
const { PostStateRepository } = await import(
  "../src/modules/api/private/posts/repositories/queries/PostStateRepository.ts"
);
const { PostReplyStateRepository } = await import(
  "../src/modules/api/private/posts/repositories/queries/PostReplyStateRepository.ts"
);

await test("video deletion policy in real disposable PostgreSQL", async (t) => {
  const users = [];
  const communities = [];
  t.after(async () => {
    try {
      // Only IDs created by this run; cascades remove ephemeral fixture content.
      await prisma.community.deleteMany({ where: { id: { in: communities } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    } finally {
      await prisma.$disconnect();
    }
  });
  for (const model of [prisma.user, prisma.community_post, prisma.post_reply]) {
    assert.equal(await model.count(), 0, "Requires an empty disposable database");
  }
  const actors = {};
  for (const [key, role] of Object.entries({
    patient: "paciente",
    psy: "psicologo",
    other: "psicologo",
  })) {
    const actor = await prisma.user.create({
      data: { name: "Ephemeral policy test", role, email: `${randomUUID()}@example.invalid` },
    });
    actors[key] = actor;
    users.push(actor.id);
  }
  const community = await prisma.community.create({
    data: { name: "Ephemeral policy test", slug: randomUUID() },
  });
  communities.push(community.id);
  const posts = new PostStateRepository();
  const replies = new PostReplyStateRepository();
  const setup = async (owner, replySpecs, replyOwner) => {
    const post = await prisma.community_post.create({
      data: {
        community_id: community.id,
        author_id: actors[owner].id,
        title: "Policy",
        content: "Policy",
      },
    });
    const rows = [];
    if (replyOwner) replySpecs = [{ author: replyOwner }, ...replySpecs];
    for (const spec of replySpecs) {
      rows.push(
        await prisma.post_reply.create({
          data: {
            post_id: post.id,
            author_id: actors[spec.author ?? "other"].id,
            content: "Policy",
            media_type: spec.media ?? null,
            parent_reply_id: spec.parent === undefined ? null : rows[spec.parent].id,
            deleted: spec.deleted ?? false,
          },
        }),
      );
    }
    const count = rows.filter((row) => !row.deleted).length;
    await prisma.community_post.update({ where: { id: post.id }, data: { replies_count: count } });
    return { post, rows, count };
  };
  const cases = [
    { name: "patient post without replies", specs: [] },
    { name: "professional text permits post", specs: [{}] },
    { name: "professional image permits post", specs: [{ media: "image" }] },
    { name: "professional video blocks post", specs: [{ media: "video" }], block: true },
    {
      name: "nested professional video blocks post",
      specs: [{ author: "patient" }, { media: "video", parent: 0 }],
      block: true,
    },
    { name: "deleted video ignored", specs: [{ media: "video", deleted: true }] },
    { name: "patient video ignored", specs: [{ author: "patient", media: "video" }] },
    {
      name: "persisted role wins over supplied role",
      specs: [{ media: "video" }],
      block: true,
      spoof: true,
    },
    {
      name: "psychologist deletes own post with professional video",
      owner: "psy",
      specs: [{ media: "video" }],
    },
    { name: "cannot delete another author's post", specs: [], forbidden: true },
    { name: "patient leaf comment", replyOwner: "patient", specs: [] },
    { name: "text child permits comment cascade", replyOwner: "patient", specs: [{ parent: 0 }] },
    {
      name: "image child permits comment cascade",
      replyOwner: "patient",
      specs: [{ parent: 0, media: "image" }],
    },
    {
      name: "direct video blocks comment",
      replyOwner: "patient",
      specs: [{ parent: 0, media: "video" }],
      block: true,
    },
    {
      name: "indirect video blocks comment",
      replyOwner: "patient",
      specs: [
        { parent: 0, author: "patient" },
        { parent: 1, media: "video" },
      ],
      block: true,
    },
    {
      name: "sibling video does not block comment",
      replyOwner: "patient",
      specs: [{ media: "video" }],
      remaining: 1,
    },
    {
      name: "deleted child video ignored",
      replyOwner: "patient",
      specs: [{ parent: 0, media: "video", deleted: true }],
    },
    {
      name: "patient child video ignored",
      replyOwner: "patient",
      specs: [{ parent: 0, author: "patient", media: "video" }],
    },
    {
      name: "psychologist deletes own reply with professional video",
      replyOwner: "psy",
      specs: [{ parent: 0, media: "video" }],
    },
    {
      name: "cannot delete another author's reply",
      replyOwner: "patient",
      specs: [],
      forbidden: true,
    },
  ];
  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const { post, rows, count } = await setup(
        scenario.owner ?? "patient",
        scenario.specs,
        scenario.replyOwner,
      );
      const auth = { ...actors[scenario.replyOwner ?? scenario.owner ?? "patient"] };
      if (scenario.spoof) auth.role = "psicologo";
      if (scenario.forbidden) auth.id = actors.other.id;
      const beforePost = await prisma.community_post.findUnique({ where: { id: post.id } });
      const beforeRows = await prisma.post_reply.findMany({
        where: { post_id: post.id },
        orderBy: { id: "asc" },
      });
      const result = scenario.replyOwner
        ? await replies.deleteReply({ auth, p: { id: post.id, replyId: rows[0].id } })
        : await posts.deletePost({ auth, p: { id: post.id } });
      const afterPost = await prisma.community_post.findUnique({ where: { id: post.id } });
      const afterRows = await prisma.post_reply.findMany({
        where: { post_id: post.id },
        orderBy: { id: "asc" },
      });
      if (scenario.block || scenario.forbidden) {
        assert.equal(result.kind, scenario.forbidden ? "forbidden" : "professional_replies_block");
        assert.deepEqual(afterPost, beforePost);
        assert.deepEqual(afterRows, beforeRows);
      } else {
        assert.equal(result.kind, "ok");
        const remaining = scenario.remaining ?? 0;
        assert.equal(afterPost.deleted, !scenario.replyOwner);
        assert.equal(afterPost.replies_count, remaining);
        assert.equal(afterRows.filter((row) => !row.deleted).length, remaining);
        assert.equal(
          scenario.replyOwner ? result.data.deleted_count : result.data.replies_deleted_count,
          count - remaining,
        );
        for (const row of afterRows.filter(
          (row) => row.deleted && !beforeRows.find((before) => before.id === row.id).deleted,
        )) {
          assert.ok(row.deletedAt instanceof Date);
        }
      }
    });
  }
});
