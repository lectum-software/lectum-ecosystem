import assert from "node:assert/strict";
import { before, type TestContext, test } from "node:test";
import type { IPostReplyProfileVisibilityDTO } from "../../DTOs/IPostDTO";

process.env.DATABASE_URL ??= "postgresql://lectum:lectum@localhost:5432/lectum_test";
process.env.JWT_SECRET_KEY ??= "lectum-test-jwt-secret-key-32-bytes";

let prisma: typeof import("@/infra/database/prisma").default;
let Repository: typeof import("./PostReplyStateRepository").PostReplyStateRepository;
let ProfileRepository: typeof import("@/modules/api/private/directory/psychologists/repositories/ProfileRepository").ProfileRepository;
let PostListRepository: typeof import("./PostListRepository").PostListRepository;
let service: typeof import("../../use-cases/services/state-actions").setReplyProfileVisibility;
let payload: typeof import("../../validator/reply-profile-visibility").replyProfileVisibilityPayload;

before(async () => {
  prisma = (await import("@/infra/database/prisma")).default;
  Repository = (await import("./PostReplyStateRepository")).PostReplyStateRepository;
  ProfileRepository = (
    await import("@/modules/api/private/directory/psychologists/repositories/ProfileRepository")
  ).ProfileRepository;
  PostListRepository = (await import("./PostListRepository")).PostListRepository;
  service = (await import("../../use-cases/services/state-actions")).setReplyProfileVisibility;
  payload = (await import("../../validator/reply-profile-visibility"))
    .replyProfileVisibilityPayload;
});

const stub = (
  t: TestContext,
  target: object,
  key: string,
  implementation: (...args: never[]) => unknown,
) => {
  const original = Reflect.get(target, key);
  Reflect.set(target, key, implementation);
  t.after(() => Reflect.set(target, key, original));
};

const request = (hidden: boolean): IPostReplyProfileVisibilityDTO => ({
  auth: { id: "owner", role: "psicologo" },
  p: { id: "post", replyId: "reply" },
  b: { hidden },
});

test("visibility accepts only an explicit boolean and rejects extra mutation fields", () => {
  for (const hidden of [true, false]) assert.equal(payload.safeParse({ hidden }).success, true);
  for (const hidden of [undefined, null, 0, 1, "", "true", "false", {}, []]) {
    assert.equal(payload.safeParse({ hidden }).success, false);
  }
  assert.equal(payload.safeParse({ hidden: true, author_id: "other" }).success, false);
});

test("patients and missing identities cannot mutate even an owned reply", async (t) => {
  stub(t, prisma.post_reply, "updateMany", () => {
    throw new Error("Unauthorized caller reached storage");
  });
  for (const auth of [{ id: "owner", role: "paciente" }, { role: "psicologo" }, {}]) {
    const data = { ...request(true), auth };
    assert.equal((await service(data)).status, 403);
    assert.deepEqual(await new Repository().setReplyProfileVisibility(data), { kind: "forbidden" });
  }
});

test("missing or nonboolean hidden is rejected before persistence", async (t) => {
  stub(t, prisma.post_reply, "updateMany", () => {
    throw new Error("Invalid request reached storage");
  });
  for (const hidden of [undefined, "true", null, 1]) {
    // Deliberately bypass the DTO to exercise runtime rejection of invalid payloads.
    const data = { ...request(true), b: { hidden } } as unknown as IPostReplyProfileVisibilityDTO;
    assert.equal((await service(data)).status, 400);
  }
});

test("toggle scopes ownership and publication atomically and changes only the profile flag", async (t) => {
  let current = false;
  stub(
    t,
    prisma.post_reply,
    "updateMany",
    async ({ where, data }: { where: unknown; data: { hidden_from_profile: boolean } }) => {
      assert.deepEqual(where, {
        id: "reply",
        post_id: "post",
        author_id: "owner",
        deleted: false,
        author: { role: "psicologo", active: true, deleted: false },
        post: { deleted: false, status: "publicado", community: { active: true, deleted: false } },
      });
      assert.deepEqual(Object.keys(data), ["hidden_from_profile"]);
      current = data.hidden_from_profile;
      return { count: 1 };
    },
  );
  for (const hidden of [true, true, false, false]) {
    assert.deepEqual(await new Repository().setReplyProfileVisibility(request(hidden)), {
      kind: "ok",
      data: { post_id: "post", reply_id: "reply", hidden_from_profile: hidden },
    });
    assert.equal(current, hidden);
  }
});

test("nonowner, wrong-post and deleted/missing replies return not found without disclosure", async (t) => {
  stub(t, prisma.post_reply, "updateMany", async () => ({ count: 0 }));
  assert.equal((await service(request(true))).status, 404);
});

test("public profile filters hidden replies before counts, highlights and community summaries", async (t) => {
  stub(t, prisma.community_post, "findMany", async () => []);
  stub(t, prisma.community_post, "count", async () => 0);
  stub(t, prisma.user, "findMany", async () => []);
  stub(t, prisma.community, "findMany", async () => []);
  let reads = 0;
  const empty = async ({
    where,
  }: {
    where: { hidden_from_profile?: boolean; author_id?: string };
  }) => {
    assert.equal(where.hidden_from_profile, false);
    assert.equal(where.author_id, "owner");
    reads++;
    return [];
  };
  stub(t, prisma.post_reply, "findMany", empty);
  stub(t, prisma.post_reply, "count", async (args: Parameters<typeof empty>[0]) => {
    await empty(args);
    return 0;
  });
  const result = await new ProfileRepository().posts({ p: { id: "owner" }, q: {} });
  assert.equal(reads, 2);
  assert.equal(result.count, 0);
  assert.equal(result.summary.replies_count, 0);
  assert.deepEqual(result.data, []);
  assert.deepEqual(result.summary.participation_communities, []);
  assert.equal(result.highlighted_publication, null);
  assert.ok(!JSON.stringify(result).includes("hidden_from_profile"));
  const { profilePostSelect } = await import(
    "@/modules/api/private/directory/psychologists/repositories/support/profile-base"
  );
  assert.equal(profilePostSelect.replies.where.hidden_from_profile, false);
});

test("private own replies remain in the list with their visibility flag", async (t) => {
  const author = {
    id: "owner",
    active: true,
    deleted: false,
    name: "Owner",
    avatar: null,
    role: "psicologo",
    psychologist_profile: null,
  };
  const post = {
    id: "post",
    title: "Post",
    content: "Context",
    anonymous: false,
    status: "publicado",
    media_items: [],
    media_url: null,
    media_type: null,
    thumbnail_url: null,
    upvotes_count: 0,
    downvotes_count: 0,
    replies_count: 1,
    saves_count: 0,
    createdAt: new Date(0),
    edited_at: null,
    replies: [],
    author,
    community: {
      id: "community",
      name: "Community",
      slug: "community",
      description: null,
      category: null,
      members_count: 0,
      createdAt: new Date(0),
    },
  };
  const reply = {
    id: "reply",
    title: null,
    content: "Still in discussion",
    hidden_from_profile: true,
    media_url: null,
    media_type: null,
    thumbnail_url: null,
    upvotes_count: 0,
    downvotes_count: 0,
    createdAt: new Date(0),
    edited_at: null,
    parent_reply_id: null,
    parent_reply: null,
    author,
    post,
    replies: [],
    _count: { replies: 0, saves: 0 },
  };
  stub(
    t,
    prisma.post_reply,
    "findMany",
    async ({
      where,
      select,
    }: {
      where: { author_id?: string; hidden_from_profile?: boolean };
      select: { hidden_from_profile?: boolean };
    }) => {
      if (!where.author_id) return [];
      assert.equal(where.author_id, "owner");
      assert.equal(where.hidden_from_profile, undefined);
      assert.equal(select.hidden_from_profile, true);
      return [reply];
    },
  );
  stub(t, prisma.post_reply, "count", async () => 1);
  for (const delegate of [
    prisma.post_vote,
    prisma.post_reply_save,
    prisma.post_notification_mute,
    prisma.community_member,
  ])
    stub(t, delegate, "findMany", async () => []);
  stub(t, prisma.important_action_event, "groupBy", async () => []);
  const result = await new PostListRepository().mine({
    auth: request(true).auth,
    q: { type: "replies" },
  });
  assert.equal(result.count, 1);
  assert.equal(result.data[0].reply?.hidden_from_profile, true);
  assert.equal(result.data[0].reply?.content, "Still in discussion");
});
