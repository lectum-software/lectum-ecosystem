import assert from "node:assert/strict";
import { before, test } from "node:test";
import { crpExperienceYears } from "@/utils/professional-experience";
import type { IPostContentVideosDTO } from "../../DTOs/IPostContentVideoDTO";
import type { AuthorResult, PostResult, ReplyBaseResult } from "../support/post-response";
import type * as Repository from "./PostContentVideoRepository";

process.env.DATABASE_URL ??= "postgresql://lectum:lectum@localhost:5432/lectum_test";
process.env.JWT_SECRET_KEY ??= "lectum-test-jwt-secret-key-32-bytes";
let PostContentVideoRepository: typeof Repository.PostContentVideoRepository;
before(async () => {
  ({ PostContentVideoRepository } = await import("./PostContentVideoRepository"));
});

const author: AuthorResult = {
  id: "professional",
  name: "Ana",
  active: true,
  deleted: false,
  avatar: null,
  role: "psicologo",
  psychologist_profile: {
    deleted: false,
    published: true,
    gender: "feminino",
    professional_first_name: "Ana",
    professional_last_name: "Silva",
    crp: "06/123456",
    crp_status: "aprovado",
    cfp_verified_at: null,
    crp_registration_date: new Date("2012-01-01T12:00:00Z"),
    show_experience_tag: true,
    updatedAt: new Date("2026-08-14T12:00:00Z"),
    whatsapp: null,
    video_url: "https://media.example/presentation.mp4",
    subscriptions: [
      {
        id: "subscription",
        source: "admin_grant",
        createdAt: new Date("2026-08-13T12:00:00Z"),
        grant_started_at: null,
      },
    ],
  },
};
const now = new Date("2026-10-28T10:00:00Z");
const post: PostResult = {
  id: "post",
  title: "Original title",
  content: "Full original content ".repeat(400),
  author,
  community: {
    id: "community",
    slug: "anxiety",
    name: "Anxiety",
    description: null,
    category: null,
    members_count: 0,
    createdAt: now,
  },
  media_type: "video",
  media_url: "https://media.example/post.mp4",
  media_items: [],
  thumbnail_url: null,
  anonymous: false,
  status: "publicado",
  upvotes_count: 4,
  downvotes_count: 0,
  replies_count: 9,
  saves_count: 0,
  createdAt: now,
  edited_at: null,
};
type Reply = ReplyBaseResult & {
  author_id: string;
  parent_reply: { id: string; content: string; title: string | null; deleted: boolean } | null;
};
const reply = (id: string, overrides: Partial<Reply> = {}): Reply => ({
  id,
  author,
  author_id: author.id,
  title: null,
  content: `Content ${id}`,
  media_type: "video",
  media_url: `https://media.example/${id}.mp4`,
  thumbnail_url: null,
  parent_reply_id: null,
  parent_reply: null,
  upvotes_count: 1,
  downvotes_count: 0,
  createdAt: now,
  edited_at: null,
  _count: { replies: 2 },
  ...overrides,
});

type Query = { where?: Record<string, unknown>; select?: Record<string, unknown>; take?: number };
const harness = (
  options: {
    missing?: boolean;
    replies?: Reply[];
    eligible?: string[];
    assets?: Array<{ id: string; owner_id: string; context_id: string; purpose: string }>;
    anonymous?: boolean;
    author?: AuthorResult;
  } = {},
) => {
  const calls: Array<{ model: string; query: Query }> = [];
  const rows =
    options.replies ??
    [
      reply("root"),
      reply("deep", {
        parent_reply_id: "root",
        parent_reply: {
          id: "root",
          content: "Full parent ".repeat(700),
          title: "Parent",
          deleted: false,
        },
      }),
    ].map((row) => (options.author ? { ...row, author: options.author } : row));
  const capture = (model: string, query: Query) => calls.push({ model, query });
  const client = {
    community_post: {
      findFirst: async (q: Query) => {
        capture("post", q);
        return options.missing ? null : options.author ? { ...post, author: options.author } : post;
      },
    },
    post_reply: {
      findMany: async (q: Query) => {
        capture("replies", q);
        const ids = q.where?.id as { in: string[] } | undefined;
        return ids ? rows.filter((row) => ids.in.includes(row.id)) : rows;
      },
    },
    user: {
      findMany: async (q: Query) => {
        capture("authors", q);
        return (options.eligible ?? [author.id]).map((id) => ({
          id,
          psychologist_profile: author.psychologist_profile,
        }));
      },
    },
    video_asset: {
      findMany: async (q: Query) => {
        capture("assets", q);
        return options.assets ?? [];
      },
    },
    post_vote: {
      findMany: async (q: Query) => {
        capture("votes", q);
        return [
          { post_id: "post", reply_id: null, value: 1 },
          { post_id: null, reply_id: "deep", value: 1 },
        ];
      },
    },
    post_save: {
      findFirst: async (q: Query) => {
        capture("post-save", q);
        return { id: "saved-post" };
      },
    },
    post_reply_save: {
      findMany: async (q: Query) => {
        capture("reply-saves", q);
        return [{ reply_id: "deep" }];
      },
    },
  };
  const repository = new PostContentVideoRepository(
    client as unknown as ConstructorParameters<typeof PostContentVideoRepository>[0],
    async () => new Map(),
  );
  const list = (q: IPostContentVideosDTO["q"] = {}) =>
    repository.list({
      p: { id: "post" },
      q,
      auth: options.anonymous ? undefined : ({ id: "viewer" } as IPostContentVideosDTO["auth"]),
    });
  return { calls, list };
};

test("published/active community gate fails closed before loading discussion", async () => {
  const { calls, list } = harness({ missing: true });
  assert.equal(await list(), null);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.query.where, {
    id: "post",
    deleted: false,
    status: "publicado",
    community: { active: true, deleted: false },
  });
});

test("initial and focused videos carry public experience without per-author queries", async () => {
  for (const focusReplyId of [undefined, "deep"]) {
    const { calls, list } = harness({ anonymous: true });
    const result = await list({ focusReplyId });
    assert.ok(result?.data.length);
    for (const item of result.data) {
      assert.equal(item.author.show_experience_tag, true);
      assert.equal(
        item.author.formation_years,
        crpExperienceYears(author.psychologist_profile!.crp_registration_date),
      );
      assert.equal(item.author.type_label, "Psicóloga");
    }
    assert.equal(calls.filter((call) => call.model === "authors").length, 1);
    for (const call of calls.filter((call) => call.query.select?.author)) {
      const selection = call.query.select!.author as {
        select: { psychologist_profile: { select: Record<string, unknown> } };
      };
      assert.equal(selection.select.psychologist_profile.select.crp_registration_date, true);
      assert.equal(selection.select.psychologist_profile.select.show_experience_tag, true);
      assert.equal(selection.select.psychologist_profile.select.updatedAt, true);
    }
  }
});

test("hidden experience is absent from every content-video author payload", async () => {
  const hiddenAuthor = {
    ...author,
    psychologist_profile: { ...author.psychologist_profile!, show_experience_tag: false },
  };
  for (const anonymous of [true, false]) {
    const { list } = harness({ author: hiddenAuthor, anonymous });
    const result = await list();
    assert.ok(result?.data.length);
    for (const item of result.data) {
      assert.equal(item.author.show_experience_tag, false);
      assert.equal(item.author.formation_years, null);
    }
  }
});

test("returns original then all depths with full parent context and viewer state", async () => {
  const { calls, list } = harness();
  const result = await list();
  assert.deepEqual(
    result?.data.map((item) => item.id),
    ["post", "root", "deep"],
  );
  assert.equal(result?.data[0]?.responding_to, null);
  assert.equal(result?.data[1]?.responding_to?.content, post.content);
  assert.equal(result?.data[2]?.responding_to?.content, "Full parent ".repeat(700));
  assert.equal(result?.data[2]?.responding_to?.title, "Parent");
  assert.equal(result?.data[2]?.saved, true);
  assert.equal(result?.data[2]?.current_user_vote, 1);
  assert.equal(result?.data[2]?.author.verified, true);
  assert.equal(result?.data[2]?.replies_count, 2);
  const authorQuery = calls.find((call) => call.model === "authors")!.query.where!;
  assert.equal(authorQuery.role, "psicologo");
  assert.equal(authorQuery.active, true);
  assert.equal(authorQuery.deleted, false);
  const profile = (authorQuery.psychologist_profile as { is: Record<string, unknown> }).is;
  assert.equal(profile.deleted, false);
  assert.ok(profile.subscriptions);
  assert.ok(profile.OR);
});

test("focus plus pagination preserves each video exactly once, only hydrates the page", async () => {
  const { calls, list } = harness();
  const a = await list({ page: 1, limit: 1, focusReplyId: "deep" });
  const b = await list({ page: 2, limit: 1, focusReplyId: "deep", cursor: a!.next_cursor! });
  const c = await list({ page: 3, limit: 1, focusReplyId: "deep", cursor: b!.next_cursor! });
  assert.deepEqual([a?.data[0]?.id, b?.data[0]?.id, c?.data[0]?.id], ["deep", "post", "root"]);
  assert.equal(a?.count, 3);
  assert.equal(a?.pages, 3);
  const fullReads = calls.filter((call) => call.model === "replies" && call.query.where?.id);
  assert.equal(fullReads.length, 2);
  assert.deepEqual(fullReads[0]?.query.where?.id, { in: ["deep"] });
  const indexReads = calls.filter((call) => call.model === "replies" && !call.query.where?.id);
  assert.ok(
    indexReads.every(
      (call) =>
        !call.query.select?.content &&
        !call.query.select?.author &&
        !call.query.select?.parent_reply,
    ),
  );
});

test("ineligible authors and orphan branches never enter count or focused queue", async () => {
  const { list } = harness({
    replies: [
      reply("unverified", { author_id: "unverified" }),
      reply("patient", { author_id: "patient" }),
      reply("orphan", { parent_reply_id: "deleted-parent" }),
      reply("visible"),
    ],
  });
  const result = await list({ focusReplyId: "orphan" });
  assert.deepEqual(
    result?.data.map((item) => item.id),
    ["post", "visible"],
  );
  assert.equal(result?.count, 2);
  assert.equal((await harness({ eligible: [] }).list())?.count, 0);
});

test("presentation/foreign/unready assets and image replies are excluded in a bulk lookup", async () => {
  const { calls, list } = harness({
    replies: [
      reply("presentation", { media_url: author.psychologist_profile!.video_url }),
      reply("stream-presentation", { media_url: "/api/private/video-assets/present123/playback" }),
      reply("stream-foreign", { media_url: "/api/private/video-assets/foreign123/playback" }),
      reply("stream-unready", { media_url: "/api/private/video-assets/unready123/playback" }),
      reply("ready", { media_url: "/api/private/video-assets/ready1234/playback" }),
      reply("image", { media_type: "image" }),
    ],
    assets: [
      {
        id: "present123",
        purpose: "psychologist_presentation",
        owner_id: author.id,
        context_id: "post",
      },
      { id: "foreign123", purpose: "community_reply", owner_id: "other", context_id: "post" },
      { id: "ready1234", purpose: "community_reply", owner_id: author.id, context_id: "post" },
    ],
  });
  const result = await list();
  assert.deepEqual(
    result?.data.map((item) => item.id),
    ["post", "ready"],
  );
  assert.equal(calls.filter((call) => call.model === "assets").length, 1);
  assert.equal(calls.find((call) => call.model === "assets")?.query.where?.status, "ready");
});

test("page-only continuation is rejected rather than silently using unstable offsets", async () => {
  const { calls, list } = harness();
  await assert.rejects(list({ page: 9, limit: 20 }), /cursor invalid/);
  assert.equal(calls.length, 0);
});

test("discussion index cost is capped and overflow fails without truncating the queue", async () => {
  const { calls, list } = harness({
    replies: Array.from({ length: 10_001 }, (_, i) => reply(`v${i}`)),
  });
  await assert.rejects(list(), /cursor capacity/);
  assert.equal(calls.find((call) => call.model === "replies")?.query.take, 10_001);
  assert.equal(calls.length, 2, "reject before author/asset/ranking hydration");
});

test("large discussion retains all snapshot videos across repeated vote changes", async () => {
  const rows = Array.from({ length: 249 }, (_, i) =>
    reply(`v${i + 2}`, { upvotes_count: 500 - i }),
  );
  const { list } = harness({ replies: rows });
  const first = (await list({ limit: 20 }))!;
  const expected = ["post", ...rows.map((row) => row.id)];
  const seen = first.data.map((item) => item.id);
  let cursor = first.next_cursor;
  while (cursor) {
    for (const [i, row] of rows.entries()) row.upvotes_count = (i * seen.length) % 1000;
    const next = (await list({ limit: 20, cursor }))!;
    seen.push(...next.data.map((item) => item.id));
    cursor = next.next_cursor;
  }
  assert.deepEqual(seen, expected);
  assert.equal(new Set(seen).size, 250);
});

test("21-video regression: voting promotes unseen v21 without repeating v20 or skipping v21", async () => {
  const rows = Array.from({ length: 20 }, (_, i) => reply(`v${i + 2}`, { upvotes_count: 100 - i }));
  const { list } = harness({ replies: rows });
  const first = await list({ limit: 20 });
  assert.equal(first?.data.at(-1)?.id, "v20");
  rows[19]!.upvotes_count = 1000;
  const second = await list({ limit: 20, cursor: first!.next_cursor! });
  assert.deepEqual(
    second?.data.map((item) => item.id),
    ["v21"],
  );
  assert.equal(second?.next_cursor, null);
  assert.equal(second?.page, 2);
  assert.equal(new Set([...first!.data, ...second!.data].map((item) => item.id)).size, 21);
  assert.equal((await list({ limit: 20 }))?.data[1]?.id, "v21", "new queues use current relevance");
});

test("cursor retries are idempotent after insertion/deletion/reordering and do not cache engagement", async () => {
  const rows = Array.from({ length: 42 }, (_, i) => reply(`v${i + 2}`, { upvotes_count: 100 - i }));
  const { list } = harness({ replies: rows });
  const first = await list({ limit: 20, focusReplyId: "v43" });
  const expected = [
    "v20",
    "v21",
    "v22",
    "v23",
    "v24",
    "v25",
    "v26",
    "v27",
    "v28",
    "v29",
    "v30",
    "v31",
    "v32",
    "v33",
    "v34",
    "v35",
    "v36",
    "v37",
    "v38",
    "v39",
  ];
  rows[30]!.upvotes_count = 2000;
  rows.splice(0, 1);
  rows.push(reply("new-video", { upvotes_count: 4000 }));
  const second = await list({ limit: 20, focusReplyId: "v43", cursor: first!.next_cursor! });
  const retry = await list({ limit: 20, cursor: first!.next_cursor! });
  assert.deepEqual(
    second?.data.map((item) => item.id),
    expected,
  );
  assert.deepEqual(retry?.data, second?.data);
  assert.equal(second?.data.find((item) => item.id === "v32")?.upvotes_count, 2000);
  const last = await list({ limit: 20, cursor: second!.next_cursor! });
  assert.deepEqual(
    last?.data.map((item) => item.id),
    ["v40", "v41", "v42"],
  );
  assert.equal(last?.next_cursor, null);
});

test("continuations revalidate ancestor visibility and professional eligibility without shifting slots", async () => {
  const rows = [
    reply("root", { media_type: null }),
    reply("child", { parent_reply_id: "root" }),
    reply("other"),
  ];
  const eligible = [author.id];
  const { list } = harness({ replies: rows, eligible });
  const first = await list({ limit: 1 });
  assert.equal(first?.data[0]?.id, "post");
  rows.splice(0, 1);
  const second = await list({ limit: 1, cursor: first!.next_cursor! });
  assert.deepEqual(second?.data, []);
  assert.ok(second?.next_cursor, "an empty removed slot does not end the queue");
  eligible.length = 0;
  const third = await list({ limit: 1, cursor: second!.next_cursor! });
  assert.deepEqual(third?.data, []);
  assert.equal(third?.next_cursor, null);
});

test("anonymous visitors receive public videos without querying another user's votes or saves", async () => {
  const { calls, list } = harness({ anonymous: true });
  const result = await list({ focusReplyId: "deep" });
  assert.equal(result?.data[0]?.id, "deep");
  assert.equal(result?.count, 3);
  assert.ok(result?.data.every((item) => item.current_user_vote === null && item.saved === false));
  assert.equal(
    calls.filter((call) => ["votes", "post-save", "reply-saves"].includes(call.model)).length,
    0,
  );
});
