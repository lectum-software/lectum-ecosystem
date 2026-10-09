// Read-only integration against the configured development database; no fixtures/seeds/mocks.
import assert from "node:assert/strict";
import { prisma } from "../src/external/prisma/client.ts";
import { CommunityCoreRepository } from "../src/modules/api/private/community/repositories/queries/CommunityCoreRepository.ts";
import { CommunityPostRepository } from "../src/modules/api/private/community/repositories/queries/CommunityPostRepository.ts";
import { postSelect } from "../src/modules/api/private/community/repositories/support/community-feed.ts";
import { hasFeedVideoReply } from "../src/modules/api/private/community/repositories/support/community-feed-eligibility.ts";
import { loadAvailableProfessionalReplies } from "../src/modules/api/private/community/repositories/support/community-feed-media.ts";

let stage = "development_environment";
try {
  assert.ok(
    ["dev", "development", "local", "test"].includes(process.env.NODE_ENV ?? "development"),
  );
  const feed = new CommunityCoreRepository();
  const community = new CommunityPostRepository();
  stage = "read_persisted_posts";
  const storedPosts = await prisma.community_post.findMany({
    where: { deleted: false, status: "publicado", community: { active: true, deleted: false } },
    select: postSelect,
  });
  stage = "require_persisted_posts";
  assert.ok(storedPosts.length > 0, "Development database has no posts for integration");
  const available = await loadAvailableProfessionalReplies(storedPosts);
  const eligible = available.filter(hasFeedVideoReply);
  stage = "feed_repository";
  const response = await feed.feed({ q: { limit: 50 } });
  assert.equal(response.count, eligible.length);
  assert.equal(response.pages, Math.ceil(eligible.length / 50));
  const ids = new Set();
  for (let page = 1; page <= response.pages; page += 1) {
    const result = page === 1 ? response : await feed.feed({ q: { page, limit: 50 } });
    for (const item of result.data) {
      assert.ok(!ids.has(item.id));
      ids.add(item.id);
      assert.ok(eligible.some((post) => post.id === item.id));
      assert.equal(item.highlighted_professional_reply?.media_type, "video");
      assert.equal(item.highlighted_professional_reply?.parent_reply_id, null);
      assert.equal(item.highlighted_professional_reply?.author.verified, true);
    }
  }
  assert.equal(ids.size, eligible.length);
  assert.equal((await feed.feed({ q: { page: response.pages + 1, limit: 50 } })).data.length, 0);
  const following = await feed.feed({ q: { scope: "following" } });
  assert.equal(following.count, 0);
  assert.equal(following.following_count, 0);
  const slug = storedPosts[0].community.slug;
  const filtered = await feed.feed({ q: { community: slug, limit: 50 } });
  assert.equal(filtered.count, eligible.filter((post) => post.community.slug === slug).length);
  const noResults = await feed.feed({ q: { search: "__no_matching_feed_integration_0542__" } });
  assert.equal(noResults.count, 0);
  assert.equal(noResults.pages, 0);
  for (const sort of ["featured", "new", "commented", "voted", "opportunities"]) {
    const result = await community.posts({ p: { slug }, q: { sort, period: "week", limit: 50 } });
    assert.ok(result);
    if (sort !== "opportunities") {
      assert.equal(result.count, storedPosts.filter((post) => post.community.slug === slug).length);
    }
  }
  console.log(
    JSON.stringify({
      result: "passed",
      writes: 0,
      persistedPosts: storedPosts.length,
      eligibleVideoPosts: eligible.length,
      positiveVideoCoverage: eligible.length > 0,
      excludedFromFeed: storedPosts.length - eligible.length,
      pagesChecked: response.pages,
      communityFiltersChecked: 5,
    }),
  );
} catch {
  console.error(`Read-only feed integration failed at ${stage}; verify development data locally.`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
