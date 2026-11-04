import assert from "node:assert/strict";
import { before, type TestContext, test } from "node:test";

function replace(t: TestContext, target: object, key: string, replacement: unknown) {
  const original = Reflect.get(target, key);
  Reflect.set(target, key, replacement);
  t.after(() => {
    Reflect.set(target, key, original);
  });
}
type Query = {
  where: { deleted: boolean; user_id?: string; community_id?: string; community: { slug: string } };
};

process.env.DATABASE_URL ??= "postgresql://localhost:5432/lectum_test";
process.env.JWT_SECRET_KEY ??= "lectum-test-jwt-secret-key-32-bytes";

let prisma: typeof import("@/infra/database/prisma").default;
let communities: typeof import("@/modules/api/private/community/use-cases/services");
let replies: typeof import("@/modules/api/private/posts/use-cases/services/queries-replies");

before(async () => {
  prisma = (await import("@/infra/database/prisma")).default;
  communities = await import("@/modules/api/private/community/use-cases/services");
  replies = await import("@/modules/api/private/posts/use-cases/services/queries-replies");
});

test("nonmember post is rejected before any write", async (t) => {
  replace(t, prisma.community_member, "findFirst", async (query: Query) => {
    assert.equal(query.where.deleted, false);
    assert.equal(query.where.user_id, "author");
    assert.equal(query.where.community.slug, "community");
    return null;
  });
  replace(t, prisma.community_post, "create", async () => assert.fail("unexpected write"));
  const result = await communities.createPost({
    auth: { id: "author", role: "psicologo" },
    p: { slug: "community" },
    b: { title: "Post", content: "Content" },
  } as Parameters<typeof communities.createPost>[0]);
  assert.equal(result.status, 422);
  assert.equal(result.code, "community_follow_required");
});

test("professional reply without membership is rejected before any write", async (t) => {
  replace(t, prisma.community_post, "findFirst", async () => ({
    id: "post",
    community_id: "community",
    title: "Post",
    community: { id: "community", name: "Community", slug: "community" },
  }));
  replace(t, prisma.community_member, "findFirst", async (query: Query) => {
    assert.equal(query.where.community_id, "community");
    assert.equal(query.where.deleted, false);
    return null;
  });
  replace(t, prisma.post_reply, "create", async () => assert.fail("unexpected write"));
  const result = await replies.createReply({
    auth: { id: "author", role: "psicologo" },
    p: { id: "post" },
    b: { content: "Reply" },
  } as Parameters<typeof replies.createReply>[0]);
  assert.equal(result.status, 422);
  assert.equal(result.code, "community_follow_required");
});
