import assert from "node:assert/strict";
import test from "node:test";
import {
  groupOtherProfessionalReplyAuthors,
  otherProfessionalRepliesQuery,
} from "./other-professional-replies";

test("other replies exclude highlights, patients, removed replies and deleted authors", () => {
  const query = otherProfessionalRepliesQuery(new Map([["post", { id: "highlight" }]]));
  assert.deepEqual(query.where, {
    post_id: { in: ["post"] },
    id: { notIn: ["highlight"] },
    deleted: false,
    parent_reply_id: null,
    author: { role: "psicologo", deleted: false },
  });
  assert.deepEqual(query.distinct, ["post_id", "author_id"]);
  assert.equal("media_type" in query.where, false);
});

test("up to three distinct authors per post, including another reply from highlighted author", () => {
  const reply = (id: string, post_id = "post") => ({
    post_id,
    author: { id, name: id, avatar: null, psychologist_profile: null },
  });
  const grouped = groupOtherProfessionalReplyAuthors([
    reply("highlight-author"),
    reply("highlight-author"),
    reply("second"),
    reply("third"),
    reply("fourth"),
    reply("second", "another-post"),
  ]);
  assert.deepEqual(
    grouped.get("post")?.map((author) => author.id),
    ["highlight-author", "second", "third"],
  );
  assert.equal(grouped.get("another-post")?.length, 1);
  assert.equal(groupOtherProfessionalReplyAuthors([]).size, 0);
});

test("uses public professional name and avatar", () => {
  const grouped = groupOtherProfessionalReplyAuthors([
    {
      post_id: "post",
      author: {
        id: "psi",
        name: "Account name",
        avatar: "/avatar.webp",
        psychologist_profile: {
          professional_first_name: "Ana",
          professional_last_name: "Silva",
        },
      },
    },
  ]);
  assert.deepEqual(grouped.get("post"), [{ id: "psi", name: "Ana Silva", avatar: "/avatar.webp" }]);
});
