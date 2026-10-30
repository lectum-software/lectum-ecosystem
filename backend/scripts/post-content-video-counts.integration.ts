import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

async function main() {
  const database = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(database.hostname, "127.0.0.1");
  assert.equal(database.port, "55432");
  assert.equal(database.pathname, "/lectum_whatsapp_dev_20261017");

  const { default: prisma } = await import("../src/infra/database/prisma");
  const { PostContentVideoRepository } = await import(
    "../src/modules/api/private/posts/repositories/queries/PostContentVideoRepository"
  );
  const tag = `video-count-${randomUUID()}`;
  const id = (name: string) => `${tag}-${name}`;
  const rollback = new Error("Rollback temporary count regression data");
  let assertionsFinished = false;

  try {
    await prisma
      .$transaction(
        async (transaction) => {
          await transaction.user.create({
            data: {
              id: id("author"),
              email: `${tag}@example.invalid`,
              name: "Local count regression",
              role: "psicologo",
              active: true,
              confirmed: true,
              psychologist_profile: {
                create: { id: id("profile"), crp_status: "aprovado", published: true },
              },
            },
          });
          await transaction.subscription_plan.create({
            data: { id: id("plan"), slug: tag, name: "Local regression entitlement" },
          });
          await transaction.professional_subscription.create({
            data: {
              psychologist_id: id("profile"),
              plan_id: id("plan"),
              status: "ativa",
              source: "admin_grant",
            },
          });
          await transaction.community.create({
            data: { id: id("community"), name: "Local count regression", slug: tag },
          });
          for (const name of ["post", "other-post"]) {
            await transaction.community_post.create({
              data: {
                id: id(name),
                community_id: id("community"),
                author_id: id("author"),
                title: "Local regression",
                content: "Temporary transactional regression data",
                anonymous: false,
                media_type: "video",
                media_url: "http://127.0.0.1:1/count-regression.mp4",
                replies_count: name === "post" ? 6 : 1,
              },
            });
          }
          const rows = [
            { name: "video", parent: null, video: true },
            { name: "comment", parent: "video" },
            { name: "answer", parent: "comment" },
            { name: "other-video", parent: null, video: true },
            { name: "other-comment", parent: "other-video" },
            { name: "removed", parent: "video", deleted: true },
            { name: "orphan", parent: "removed" },
          ];
          for (const row of rows) {
            await transaction.post_reply.create({
              data: {
                id: id(row.name),
                post_id: id("post"),
                author_id: id("author"),
                content: row.name,
                parent_reply_id: row.parent ? id(row.parent) : null,
                deleted: row.deleted ?? false,
                media_type: row.video ? "video" : null,
                media_url: row.video ? "http://127.0.0.1:1/count-regression.mp4" : null,
              },
            });
          }
          await transaction.post_reply.create({
            data: {
              id: id("foreign"),
              post_id: id("other-post"),
              author_id: id("author"),
              content: "Other post",
            },
          });
          const repository = new PostContentVideoRepository(transaction);
          const list = () => repository.list({ p: { id: id("post") }, q: {} });
          const result = await list();
          const video = result?.data.find((item) => item.reply_id === id("video"));
          const other = result?.data.find((item) => item.reply_id === id("other-video"));
          assert.ok(video);
          assert.equal(video.replies_count, 1);
          assert.equal(video.descendants_count, 2);
          assert.equal(other?.descendants_count, 1);
          assert.equal(result?.data.find((item) => item.reply_id === null)?.descendants_count, 6);

          // Count beyond the default inline preview, including replies not loaded on screen.
          let parent = id("answer");
          for (let depth = 0; depth < 5; depth++) {
            const next = id(`deep-${depth}`);
            await transaction.post_reply.create({
              data: {
                id: next,
                post_id: id("post"),
                author_id: id("author"),
                content: "Deep descendant",
                parent_reply_id: parent,
              },
            });
            parent = next;
          }
          const deep = (await list())?.data.find((item) => item.reply_id === id("video"));
          assert.equal(deep?.descendants_count, 7);
          assert.equal(deep?.replies_count, 1);

          await transaction.post_reply.update({
            where: { id: id("comment") },
            data: { deleted: true, deletedAt: new Date() },
          });
          const removed = await list();
          assert.equal(
            removed?.data.find((item) => item.reply_id === id("video"))?.descendants_count,
            0,
          );
          assert.equal(
            removed?.data.find((item) => item.reply_id === id("video"))?.replies_count,
            0,
          );
          assert.equal(
            removed?.data.find((item) => item.reply_id === id("other-video"))?.descendants_count,
            1,
          );
          assertionsFinished = true;
          throw rollback;
        },
        { timeout: 30000 },
      )
      .catch((error: unknown) => {
        if (error !== rollback) throw error;
      });
    assert.equal(assertionsFinished, true);
    assert.equal(await prisma.user.count({ where: { id: id("author") } }), 0);
    assert.equal(await prisma.community.count({ where: { id: id("community") } }), 0);
    console.log(
      "PASS real PostgreSQL video descendant counts; transaction rolled back, no fixtures remain",
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
