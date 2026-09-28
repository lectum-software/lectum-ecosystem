import assert from "node:assert/strict";
import test from "node:test";
import { mentorPositionForAuthor } from "./mentor-author-ranking.ts";

test("uses the reply author's community position, not the post author's", () => {
  const ranking = [
    { position: 1, professional: { id: "post-author" } },
    { position: 2, professional: { id: "reply-author" } },
  ];
  assert.equal(mentorPositionForAuthor(ranking, "reply-author"), 2);
  assert.equal(mentorPositionForAuthor(ranking, "unranked-author"), undefined);
});

test("does not transfer ranking between communities or invent a loading rank", () => {
  assert.equal(mentorPositionForAuthor(undefined, "reply-author"), undefined);
  assert.equal(mentorPositionForAuthor([], "reply-author"), undefined);
  assert.equal(
    mentorPositionForAuthor([{ position: 1, professional: { id: "other" } }], "reply-author"),
    undefined,
  );
});

test("only top three positions receive a label", () => {
  for (const position of [0, 1, 2, 3, 4, 5, 1.5]) {
    const ranking = [{ position, professional: { id: "author" } }];
    assert.equal(
      mentorPositionForAuthor(ranking, "author"),
      [1, 2, 3].includes(position) ? position : undefined,
    );
  }
});
