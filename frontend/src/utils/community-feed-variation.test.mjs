import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const { varyCommunityFeedItems } = await import("./community-feed-variation.ts");

test("feed e destaque não sobrescrevem ranking global calculado pelo backend", () => {
  const base = new URL("../app/app/community/[slug]/", import.meta.url);
  const view = readFileSync(new URL("views/community-feed.tsx", base), "utf8");
  const support = readFileSync(new URL("modules/feed-support.ts", base), "utf8");
  const detail = readFileSync(new URL("views/community-detail.tsx", base), "utf8");
  assert.match(detail, /sort === "featured" \? sortedPosts : replyTip.posts/);
  assert.doesNotMatch(view, /varyCommunityFeedPosts|feedPresentationSeed/);
  assert.match(
    view,
    /const loadedPosts = useMemo\([\s\S]*?flattenCommunityPostPages\(feed.data\?\.pages\)/,
  );
  assert.match(view, /const posts = loadedPosts;/);
  assert.doesNotMatch(support, /communityFeaturedScore|varyCommunityFeedItems/);
  assert.match(
    support,
    /Featured is globally ranked and paginated by the backend\.\s*return items;/,
  );
});

const createPost = (id) => ({
  created_at: "2026-09-15T00:00:00.000Z",
  id,
  status: "publicado",
});

test("mantem ordem original do feed sem seed de apresentacao", () => {
  const posts = ["post-1", "post-2", "post-3", "post-4"].map(createPost);

  assert.deepEqual(
    varyCommunityFeedItems(posts, 0).map((post) => post.id),
    ["post-1", "post-2", "post-3", "post-4"],
  );
});

test("aplica variacao leve em janelas sem remover posts do feed", () => {
  const posts = Array.from({ length: 10 }, (_, index) => createPost(`post-${index + 1}`));
  const varied = varyCommunityFeedItems(posts, 17);

  assert.equal(varied.length, posts.length);
  assert.deepEqual(
    [...varied.map((post) => post.id)].sort(),
    [...posts.map((post) => post.id)].sort(),
  );
  assert.notDeepEqual(
    varied.slice(0, 8).map((post) => post.id),
    posts.slice(0, 8).map((post) => post.id),
  );
  assert.deepEqual([...varied.slice(0, 4).map((post) => post.id)].sort(), [
    "post-1",
    "post-2",
    "post-3",
    "post-4",
  ]);
  assert.deepEqual([...varied.slice(4, 8).map((post) => post.id)].sort(), [
    "post-5",
    "post-6",
    "post-7",
    "post-8",
  ]);
});

test("sessao conserva seed em remount e renova somente no refresh", async () => {
  const { createFeedVariationSession } = await import("./feed-variation-session.ts");
  const session = createFeedVariationSession(() => 0.5);
  assert.equal(session.current(), 0);
  const first = session.initialize();
  assert.ok(first > 0 && first <= 2147483647);
  assert.equal(session.initialize(), first);
  assert.notEqual(session.refresh(), first);
  assert.equal(session.initialize(), session.current());
  const view = readFileSync(
    new URL("../app/app/community/[slug]/views/community-feed.tsx", import.meta.url),
    "utf8",
  );
  assert.match(view, /seed: variationSeed \|\| undefined/);
  assert.match(view, /useInfiniteCommunityFeedPosts\(query, variationSeed > 0\)/);
  assert.match(view, /const posts = loadedPosts/);
});
