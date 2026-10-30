import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

async function main() {
  const database = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(database.protocol, "postgresql:");
  assert.equal(database.hostname, "127.0.0.1");
  assert.equal(database.port, "55432");
  assert.equal(database.pathname, "/lectum_task295_visibility_dev_20261030");
  assert.ok(database.search === "" || database.search === "?schema=public");
  const { default: prisma } = await import("../src/infra/database/prisma");
  const { setReplyProfileVisibility } = await import(
    "../src/modules/api/private/posts/use-cases/services/state-actions"
  );
  const { PostRepository } = await import(
    "../src/modules/api/private/posts/repositories/PostRepository"
  );
  const { ProfileRepository } = await import(
    "../src/modules/api/private/directory/psychologists/repositories/ProfileRepository"
  );
  const { PostContentVideoRepository } = await import(
    "../src/modules/api/private/posts/repositories/queries/PostContentVideoRepository"
  );
  const tag = `reply-visibility-${randomUUID()}`;
  const id = (name: string) => `${tag}-${name}`;
  const owner = { id: id("owner"), role: "psicologo" };
  const users = ["owner", "other", "patient"].map(id);
  try {
    // Fail before fixtures if the additive migration has not been applied.
    await prisma.post_reply.findFirst({ select: { hidden_from_profile: true } });
    for (const name of ["owner", "other", "patient"]) {
      await prisma.user.create({
        data: {
          id: id(name),
          email: `${id(name)}@example.invalid`,
          name: "Temporary visibility test",
          role: name === "patient" ? "paciente" : "psicologo",
          active: true,
          confirmed: true,
          ...(name === "owner"
            ? {
                psychologist_profile: {
                  create: {
                    id: id("profile"),
                    published: true,
                    crp_status: "aprovado",
                    video_url: "http://127.0.0.1:1/temporary.mp4",
                  },
                },
              }
            : {}),
        },
      });
    }
    await prisma.subscription_plan.create({
      data: { id: id("plan"), slug: tag, name: "Temporary test" },
    });
    await prisma.professional_subscription.create({
      data: {
        psychologist_id: id("profile"),
        plan_id: id("plan"),
        status: "ativa",
        source: "admin_grant",
      },
    });
    await prisma.community.create({
      data: { id: id("community"), name: "Temporary test", slug: tag },
    });
    for (const name of ["post", "other-post"]) {
      await prisma.community_post.create({
        data: {
          id: id(name),
          author_id: id("patient"),
          community_id: id("community"),
          title: "Temporary discussion",
          content: "Temporary context",
          replies_count: 1,
        },
      });
    }
    await prisma.post_reply.create({
      data: {
        id: id("reply"),
        author_id: owner.id,
        post_id: id("post"),
        content: "Original answer",
        media_type: "video",
        media_url: "http://127.0.0.1:1/temporary-reply.mp4",
      },
    });
    await prisma.post_reply.create({
      data: {
        id: id("deleted"),
        author_id: owner.id,
        post_id: id("post"),
        content: "Deleted answer",
        deleted: true,
      },
    });
    const toggle = (hidden: boolean, auth = owner, postId = id("post"), replyId = id("reply")) =>
      setReplyProfileVisibility({ auth, p: { id: postId, replyId }, b: { hidden } });
    const profile = () => new ProfileRepository().posts({ p: { id: owner.id }, q: {} });
    assert.equal((await profile()).summary.replies_count, 1);
    assert.equal((await toggle(true, { id: id("patient"), role: "paciente" })).status, 403);
    assert.equal((await toggle(true, { id: id("other"), role: "psicologo" })).status, 404);
    assert.equal((await toggle(true, owner, id("other-post"))).status, 404);
    assert.equal((await toggle(true, owner, id("post"), id("deleted"))).status, 404);
    const original = await prisma.post_reply.findUniqueOrThrow({ where: { id: id("reply") } });
    assert.equal(original.hidden_from_profile, false);
    for (const hidden of [true, true, false, false]) {
      assert.equal((await toggle(hidden)).status, 200);
      const publicResult = await profile();
      assert.equal(publicResult.summary.replies_count, hidden ? 0 : 1);
      assert.equal(publicResult.count, hidden ? 0 : 1);
      if (hidden) {
        assert.equal(publicResult.highlighted_publication, null);
        assert.deepEqual(publicResult.data, []);
        assert.deepEqual(publicResult.summary.participation_communities, []);
      }
      assert.ok(!JSON.stringify(publicResult).includes("hidden_from_profile"));
      const repository = new PostRepository();
      const mine = await repository.mine({ auth: owner, q: { type: "replies" } });
      assert.equal(
        mine.data.find((item) => item.reply?.id === id("reply"))?.reply?.hidden_from_profile,
        hidden,
      );
      const discussion = await repository.replies({ p: { id: id("post") }, q: {} });
      assert.ok(discussion?.data.some((reply) => reply.id === id("reply")));
      assert.ok(!JSON.stringify(discussion).includes("hidden_from_profile"));
      const videos = await new PostContentVideoRepository().list({ p: { id: id("post") }, q: {} });
      assert.ok(videos?.data.some((video) => video.reply_id === id("reply")));
      const current = await prisma.post_reply.findUniqueOrThrow({ where: { id: id("reply") } });
      for (const key of [
        "content",
        "deleted",
        "edited_at",
        "parent_reply_id",
        "media_url",
      ] as const)
        assert.deepEqual(current[key], original[key]);
      assert.equal(
        (await prisma.community_post.findUniqueOrThrow({ where: { id: id("post") } }))
          .replies_count,
        1,
      );
    }
    console.log("TASK295 reply profile visibility integration passed");
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.community.deleteMany({ where: { id: id("community") } });
    await prisma.subscription_plan.deleteMany({ where: { id: id("plan") } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("TASK295 reply profile visibility integration failed");
  if (error instanceof Error) {
    console.error(error.name);
    for (const frame of error.stack?.split("\n") ?? []) {
      if (frame.trim().startsWith("at ") && frame.includes("reply-profile-visibility.integration"))
        console.error(frame.trim());
    }
  }
  process.exitCode = 1;
});
