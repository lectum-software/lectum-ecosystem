import assert from "node:assert/strict";
import test from "node:test";
import { profileReviewSelect, toReviewResponse } from "./profile-base";

test("directory review selects only display identity and returns full author name and avatar", () => {
  assert.deepEqual(profileReviewSelect.author.select, { name: true, avatar: true });
  const review = {
    id: "local-review",
    rating: 5,
    comment: "Relato",
    response: null,
    responded_at: null,
    createdAt: new Date("2026-10-31T12:00:00Z"),
    author: {
      name: "Ana Maria Pereira",
      avatar: "/public/files/avatar/ana.jpg",
      email: "private@example.test",
    },
  };
  assert.deepEqual(toReviewResponse(review).author, {
    name: "Ana Maria Pereira",
    initials: "AP",
    avatar: review.author.avatar,
  });
});
