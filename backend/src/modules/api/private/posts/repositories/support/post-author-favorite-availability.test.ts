import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type * as PostResponse from "./post-response";
import type { AuthorResult, ReplyTreeResult } from "./post-response";

process.env.DATABASE_URL ??= "postgresql://lectum:lectum@localhost:5432/lectum_test";
process.env.JWT_SECRET_KEY ??= "lectum-test-jwt-secret-key-32-bytes";

let toAuthorResponse: typeof PostResponse.toAuthorResponse;
let toReplyResponse: typeof PostResponse.toReplyResponse;

type ProfileOverrides = Partial<NonNullable<AuthorResult["psychologist_profile"]>>;

const professionalAuthor = ({
  active = true,
  profile = {},
}: {
  active?: boolean;
  profile?: ProfileOverrides;
} = {}): AuthorResult => ({
  active,
  avatar: null,
  deleted: false,
  id: "professional",
  name: "Tulio Rezende",
  psychologist_profile: {
    cfp_verified_at: new Date("2026-01-01T00:00:00.000Z"),
    crp: "06/123456",
    crp_status: "verificado",
    deleted: false,
    gender: "masculino",
    professional_first_name: "Tulio",
    professional_last_name: "Rezende",
    published: true,
    subscriptions: [{ id: "subscription", source: "admin_grant" }],
    video_url: "/public/files/profile/video.mp4",
    whatsapp: null,
    ...profile,
  },
  role: "psicologo",
});

const reply = (
  id: string,
  author: AuthorResult,
  replies: ReplyTreeResult[] = [],
): ReplyTreeResult => ({
  _count: { replies: replies.length },
  author,
  content: `Resposta ${id}`,
  createdAt: new Date("2026-10-12T12:00:00.000Z"),
  downvotes_count: 0,
  edited_at: null,
  id,
  media_type: null,
  media_url: null,
  parent_reply: null,
  parent_reply_id: null,
  replies,
  thumbnail_url: null,
  title: null,
  upvotes_count: 0,
});

describe("post detail author favorite availability", () => {
  before(async () => {
    ({ toAuthorResponse, toReplyResponse } = await import("./post-response"));
  });

  it("exposes availability on the post detail author contract", () => {
    assert.equal(toAuthorResponse(professionalAuthor()).favorite_available, true);
    assert.equal(toAuthorResponse(professionalAuthor({ active: false })).favorite_available, false);
    assert.equal(
      toAuthorResponse(professionalAuthor({ profile: { published: false } })).favorite_available,
      false,
    );
  });

  it("hides favorite actions on direct and nested replies from an inactive profile", () => {
    const author = professionalAuthor({ active: false });
    const result = toReplyResponse(reply("parent", author, [reply("child", author)]), new Map());

    assert.equal(result.author.favorite_available, false);
    assert.equal(result.replies[0]?.author.favorite_available, false);
  });

  it("exposes the direct parent text used by social video previews", () => {
    const author = professionalAuthor();
    const child = reply("child", author);
    child.parent_reply_id = "parent";
    child.parent_reply = { content: "Comentario que originou a resposta" };

    const result = toReplyResponse(child, new Map());

    assert.equal(result.parent_content, "Comentario que originou a resposta");
  });
});
