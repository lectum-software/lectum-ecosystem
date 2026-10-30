import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type ProfilePostResult,
  type ProfileReplyResult,
  profilePostSelect,
  profileReplySelect,
} from "./profile-base";
import { toPostResponse } from "./profile-response";

const post: ProfilePostResult = {
  id: "post",
  title: "Original post title",
  content: "Original post content",
  anonymous: true,
  status: "publicado",
  media_url: null,
  media_type: null,
  thumbnail_url: null,
  media_items: [],
  upvotes_count: 0,
  downvotes_count: 0,
  replies_count: 2,
  saves_count: 0,
  createdAt: new Date(0),
  edited_at: null,
  community: {
    id: "community",
    name: "Community",
    slug: "community",
    description: null,
    category: null,
    members_count: 0,
    avatar_url: null,
    visual_primary_color: null,
    visual_primary_dark_color: null,
    visual_soft_color: null,
    visual_text_color: null,
    visual_gradient_color: null,
    createdAt: new Date(0),
  },
  author: {
    id: "patient",
    name: "Private patient name",
    avatar: "/private-patient-avatar.png",
    role: "paciente",
    deleted: false,
    psychologist_profile: null,
  },
  replies: [],
};

const reply = (overrides: Partial<ProfileReplyResult> = {}): ProfileReplyResult => ({
  id: "professional-reply",
  title: null,
  content: "Professional answer",
  media_url: "/video.mp4",
  media_type: "video",
  thumbnail_url: null,
  upvotes_count: 0,
  downvotes_count: 0,
  createdAt: new Date(0),
  edited_at: null,
  parent_reply_id: null,
  parent_reply: null,
  post,
  author: {
    ...post.author,
    id: "professional",
    name: "Professional",
    avatar: null,
    role: "psicologo",
  },
  ...overrides,
});

const serialize = (item: ProfileReplyResult) =>
  toPostResponse(item.post, null, false, undefined, item);

describe("profile contribution immediate parent context", () => {
  it("selects only parent text and deletion state, without parent identity or media", () => {
    const expected = { select: { content: true, deleted: true } };
    assert.deepEqual(profileReplySelect.parent_reply, expected);
    assert.deepEqual(profilePostSelect.replies.select.parent_reply, expected);
  });

  it("keeps direct answers associated with the original post", () => {
    const response = serialize(reply());
    assert.equal(response.title, post.title);
    assert.equal(response.content, post.content);
    assert.equal(response.highlighted_professional_reply?.parent_reply_id, null);
    assert.equal(response.highlighted_professional_reply?.parent_content, null);
  });

  it("preserves distinct immediate comments for two answers on the same post", () => {
    for (const content of ["First comment", "Second comment", ""]) {
      const response = serialize(
        reply({ parent_reply_id: "comment", parent_reply: { content, deleted: false } }),
      );
      assert.equal(response.highlighted_professional_reply?.parent_reply_id, "comment");
      assert.equal(response.highlighted_professional_reply?.parent_content, content);
      assert.equal(response.title, post.title);
      assert.equal(response.content, post.content);
      assert.notEqual(response.author.name, post.author.name);
      assert.equal(response.author.avatar, null);
      assert.equal("parent_author" in response.highlighted_professional_reply!, false);
    }
  });

  it("never substitutes the post or leaks text when a nested parent is deleted or missing", () => {
    for (const parent of [null, { content: "Deleted comment", deleted: true }]) {
      const response = serialize(reply({ parent_reply_id: "comment", parent_reply: parent }));
      assert.equal(response.highlighted_professional_reply?.parent_reply_id, "comment");
      assert.equal(response.highlighted_professional_reply?.parent_content, null);
      assert.ok(!JSON.stringify(response).includes("Deleted comment"));
    }
  });
});
