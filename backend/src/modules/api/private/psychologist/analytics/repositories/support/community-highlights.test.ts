import assert from "node:assert/strict";
import test from "node:test";
import { type HighlightAction, rankCommunityHighlights } from "./community-highlights";

const event = (
  id: string,
  target: string,
  visitor: string,
  type = "community_post",
): HighlightAction => ({
  id,
  target_id: target,
  target_type: type,
  user_id: null,
  visitor_id: visitor,
  occurred_at: new Date("2026-10-20T12:00:00Z"),
});

test("highlights deduplicate within a content, preserve other contents and separate posts/replies", () => {
  const actions = [
    event("1", "a", "v1"),
    event("2", "a", "v1"),
    event("3", "a", "v2"),
    event("4", "b", "v1"),
    event("5", "r", "v1", "post_reply"),
    event("6", "mentor", "v3", "psychologist"),
  ];
  assert.deepEqual(rankCommunityHighlights(actions, "posts"), [
    { id: "a", whatsapp_clicks: 2 },
    { id: "b", whatsapp_clicks: 1 },
  ]);
  assert.deepEqual(rankCommunityHighlights(actions, "replies"), [{ id: "r", whatsapp_clicks: 1 }]);
});

test("highlights are limited to five, with deterministic ties and no zero entries", () => {
  const actions = ["g", "f", "e", "d", "c", "b", "a"].map((id) => event(id, id, id));
  assert.deepEqual(
    rankCommunityHighlights(actions, "posts").map((item) => item.id),
    ["a", "b", "c", "d", "e"],
  );
  assert.deepEqual(rankCommunityHighlights([], "posts"), []);
});
