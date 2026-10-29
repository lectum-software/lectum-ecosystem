import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { before, test } from "node:test";

process.env.DATABASE_URL ??= "postgresql://lectum:lectum@localhost:5432/lectum_test";
process.env.JWT_SECRET_KEY ??= "lectum-test-jwt-secret-key-32-bytes";

let feed: typeof import("@/modules/api/private/community/repositories/support/community-feed");
let ranking: typeof import("@/modules/api/private/community/repositories/support/community-ranking");
let replies: typeof import("@/modules/api/private/posts/repositories/support/reply-tree");
let post: typeof import("@/modules/api/private/posts/repositories/support/post-response");
let profile: typeof import("@/modules/api/private/directory/psychologists/repositories/support/profile-response");
let admin: typeof import("@/modules/api/admin/private/communities/manage/repositories/support/manage-selects");
let adminRanking: typeof import("@/modules/api/admin/private/communities/manage/use-cases/services/activity-ranking");

before(async () => {
  feed = await import("@/modules/api/private/community/repositories/support/community-feed");
  ranking = await import("@/modules/api/private/community/repositories/support/community-ranking");
  replies = await import("@/modules/api/private/posts/repositories/support/reply-tree");
  post = await import("@/modules/api/private/posts/repositories/support/post-response");
  profile = await import(
    "@/modules/api/private/directory/psychologists/repositories/support/profile-response"
  );
  admin = await import(
    "@/modules/api/admin/private/communities/manage/repositories/support/manage-selects"
  );
  adminRanking = await import(
    "@/modules/api/admin/private/communities/manage/use-cases/services/activity-ranking"
  );
});

test("feed, replies and post previews rank only by positive votes", () => {
  for (const score of [
    feed.communityVoteRankingScore,
    feed.professionalReplyVoteRankingScore,
    replies.replyVoteRankingScore,
    post.professionalReplyPreviewScore,
  ]) {
    for (const downvotes_count of [0, 1, 100000]) {
      assert.equal(score({ downvotes_count, upvotes_count: 5 }), 5);
      assert.equal(score({ downvotes_count, upvotes_count: 0 }), 0);
    }
  }
});

test("profile publication relevance ignores negative vote history", () => {
  const metrics = { upvotes: 10, comments: 2, saves: 1 };
  assert.equal(
    profile.profilePublicationScore({ ...metrics, downvotes: 10000 }),
    profile.profilePublicationScore({ ...metrics, downvotes: 0 }),
  );
});

test("public and admin Top Mentor scores retain moderation but not downvote penalties", () => {
  const base = { ...ranking.emptyTopMentorMetrics(), replies_published: 2, upvotes_received: 3 };
  const historical = { ...base, downvotes_received: 10000 };
  assert.equal(ranking.topMentorScore(base), ranking.topMentorScore(historical));
  assert.equal(admin.adminCommunityMentorScore(base), admin.adminCommunityMentorScore(historical));
  assert.equal(ranking.topMentorScore(base), admin.adminCommunityMentorScore(base));
  assert.equal(admin.adminCommunityMentorScoreBreakdown(historical).downvotes_penalty, 0);
  assert.equal(ranking.topMentorsFormula().downvote_weight, 0);
  assert.equal(admin.adminCommunityMentorFormula().downvote_weight, 0);
  assert.equal(
    ranking.hasTopMentorRankingSignal({
      ...ranking.emptyTopMentorMetrics(),
      downvotes_received: 1,
    }),
    false,
  );
  assert.equal(
    ranking.topMentorScore({ ...historical, removed_posts_penalty: 30 }),
    ranking.topMentorScore(base) - 30,
  );
});

test("admin Top Mentor ties ignore downvotes and retain the name tiebreak", () => {
  type Entry = Parameters<typeof adminRanking.compareRanking>[0];
  const entry = (name: string, downvotes: number): Entry => ({
    member: { user: { id: name, name, psychologist_profile: null } } as Entry["member"],
    metrics: {
      ...admin.emptyAdminCommunityMentorMetrics(),
      replies_published: 1,
      downvotes_received: downvotes,
    },
    score: 3,
  });
  assert.ok(adminRanking.compareRanking(entry("Ana", 10000), entry("Bia", 0)) < 0);
  assert.equal(adminRanking.compareRanking(entry("Ana", 10000), entry("Ana", 0)), 0);
});

test("all public mentor paths omit negative-vote score, eligibility and tiebreak influence", () => {
  for (const path of [
    "src/utils/community-mentor-ranking.ts",
    "src/modules/api/private/community/repositories/queries/CommunityMentorRepository.ts",
    "src/modules/api/private/community/repositories/support/community-ranking.ts",
  ]) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /downvoteDiff|downvotes_received\s*>\s*0/);
    assert.doesNotMatch(source, /const penaltyPoints\s*=\s*metrics\.downvotes_received/);
  }
});
