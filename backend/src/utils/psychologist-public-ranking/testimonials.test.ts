import assert from "node:assert/strict";
import { before, type TestContext, test } from "node:test";
import type { Prisma } from "@/external/generated/prisma/client";
import { recalculatePsychologistRating } from "@/modules/api/private/account/repositories/support/account-query";
import { getPublicTestimonialCounts, visibleTestimonialsWhere } from "../testimonial-summary";
import {
  type PsychologistRankingCandidate,
  psychologistPublicRankingWeights,
  type RankingContext,
  REVIEW_COUNT_SCORE_TARGET,
  scoreByTarget,
} from "./scoring";

process.env.DATABASE_URL ??= "postgresql://lectum:lectum@localhost:5432/lectum_test";
process.env.JWT_SECRET_KEY ??= "lectum-test-jwt-secret-key-32-bytes";

let prisma: typeof import("@/infra/database/prisma").default;
let ranking: typeof import("./ranking");
let getRankingContext: typeof import("./context").getRankingContext;
let sortItems: typeof import("@/modules/api/admin/private/psychologists/list/use-cases/services/items").sortItems;
type AdminItem = Parameters<typeof sortItems>[0][number];

before(async () => {
  prisma = (await import("@/infra/database/prisma")).default;
  ranking = await import("./ranking");
  ({ getRankingContext } = await import("./context"));
  ({ sortItems } = await import(
    "@/modules/api/admin/private/psychologists/list/use-cases/services/items"
  ));
});

const candidate = (id = "professional"): PsychologistRankingCandidate => ({
  user_id: id,
  rating_avg: 500,
  rating_count: 999,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  academic_formations: null,
  academic_graduation_year: null,
  academic_institution: null,
  academic_title: null,
  available_days: null,
  bio: null,
  cfp_verified_at: null,
  cover_image_url: null,
  cpf: null,
  crp: null,
  gender: null,
  headline: null,
  languages: null,
  modality: null,
  professional_address_city: null,
  professional_address_state: null,
  subscriptions: [],
  target_audience: null,
  video_url: null,
  whatsapp: null,
  user: {
    id,
    avatar: null,
    psychologist_approaches: [],
    psychologist_services: [],
    psychologist_specialties: [],
  },
});

const context = (count = 0): RankingContext => ({
  publicTestimonialCounts: new Map([["professional", count]]),
  favoriteCounts: new Map(),
  latestActivityAt: new Map(),
  now: new Date("2026-10-29"),
  professionalStartDates: new Map(),
  qualifiedVideoViewsSinceProfessionalStart: new Map(),
  seedDate: "2026-10-29",
  searchImpressionsSinceProfessionalStart: new Map(),
  videoStats: new Map(),
  viewerId: null,
  whatsappClickCounts: new Map(),
});

const stub = (
  t: TestContext,
  target: object,
  key: string,
  implementation: (...args: never[]) => unknown,
) => {
  const original = Reflect.get(target, key);
  Reflect.set(target, key, t.mock.fn(implementation));
  t.after(() => Reflect.set(target, key, original));
};

test("ranking preserves all non-testimonial weights and its total budget", () => {
  assert.deepEqual(psychologistPublicRankingWeights, {
    video: 0.25,
    whatsapp: 0.25,
    favorites: 0.15,
    reviewCount: 0.24,
    completeness: 0.07,
    recency: 0.04,
  });
  assert.equal(
    Object.values(psychologistPublicRankingWeights).reduce((sum, weight) => sum + weight, 0),
    1,
  );
  assert.equal(REVIEW_COUNT_SCORE_TARGET, 30);
});

test("legacy averages and cached counts never affect score", () => {
  const expected = ranking.calculateRanking(candidate(), context(4));
  for (const rating_avg of [0, 100, 300, 500, 9999]) {
    assert.deepEqual(
      ranking.calculateRanking({ ...candidate(), rating_avg, rating_count: 0 }, context(4)),
      expected,
    );
  }
  assert.equal(expected.publicTestimonialCount, 4);
  assert.equal(expected.components.review_count, scoreByTarget(4, 30));
  assert.equal(ranking.calculateRanking(candidate(), context()).components.review_count, 0);
});

test("public count alone increases the testimonial portion; other signals remain equal", () => {
  const zero = ranking.calculateRanking(candidate(), context(0));
  let previous = zero.baseScore;
  for (const count of [1, 5, 30, 100]) {
    const current = ranking.calculateRanking(candidate(), context(count));
    assert.ok(current.baseScore > previous);
    assert.ok(
      Math.abs(current.baseScore - zero.baseScore - 0.24 * scoreByTarget(count, 30)) < 1e-12,
    );
    const { review_count: _oldCount, ...oldSignals } = zero.components;
    const { review_count: _newCount, ...newSignals } = current.components;
    assert.deepEqual(newSignals, oldSignals);
    previous = current.baseScore;
  }
});

test("tie-break uses public count then creation date, never average or stale count", () => {
  const left = {
    item: { ...candidate(), rating_avg: 500, rating_count: 999 },
    ranking: { ...ranking.calculateRanking(candidate(), context(1)), score: 0.5, baseScore: 0.5 },
  };
  const right = {
    item: { ...candidate(), rating_avg: 100, rating_count: 0 },
    ranking: { ...left.ranking, publicTestimonialCount: 2 },
  };
  assert.ok(ranking.compareRankedPsychologistCandidates(left, right) > 0);
  right.ranking.publicTestimonialCount = 1;
  assert.equal(ranking.compareRankedPsychologistCandidates(left, right), 0);
  right.item.createdAt = new Date("2026-02-01");
  assert.ok(ranking.compareRankedPsychologistCandidates(left, right) > 0);
});

test("verified priority and cold-start reservation remain unchanged", () => {
  const base = ranking.calculateRanking(candidate(), context());
  const established = Array.from({ length: 7 }, (_, index) => ({
    item: candidate(`established-${index}`),
    ranking: {
      ...base,
      isVerified: true,
      isProfessionalColdStart: false,
      score: 0.9,
      baseScore: 0.9,
    },
  }));
  const newcomers = Array.from({ length: 3 }, (_, index) => ({
    item: candidate(`new-${index}`),
    ranking: {
      ...base,
      isVerified: true,
      isProfessionalColdStart: true,
      score: 0.1,
      baseScore: 0.1,
    },
  }));
  const ordered = ranking.applyProfessionalColdStartReservation([...established, ...newcomers]);
  assert.deepEqual(
    ordered.flatMap((item, index) => (item.ranking.isProfessionalColdStart ? [index + 1] : [])),
    [4, 7, 10],
  );
  assert.ok(
    ranking.compareRankedPsychologistCandidates(newcomers[0], {
      item: candidate("free"),
      ranking: { ...base, score: 1, baseScore: 1, isVerified: false },
    }) < 0,
  );
});

test("ranking context fetches only public active-author counts and reuses them before pagination", async (t) => {
  stub(t, prisma.psychologist_favorite, "groupBy", async () => []);
  stub(t, prisma.contact_request, "groupBy", async () => []);
  stub(t, prisma.profile_video_watch_session, "findMany", async () => []);
  stub(t, prisma.professional_review, "groupBy", async ({ where }: { where: unknown }) => {
    assert.deepEqual(where, visibleTestimonialsWhere({ in: ["professional"] }));
    return [{ psychologist_id: "professional", _count: { _all: 3 }, _max: { createdAt: null } }];
  });
  const data = await getRankingContext([candidate()], null);
  assert.equal(data.publicTestimonialCounts.get("professional"), 3);
  const [result] = await ranking.rankPsychologistCandidates([candidate()], null);
  assert.equal(result.item.rating_count, 3);
  assert.equal(result.item.rating_avg, 0);
  assert.equal(result.ranking.publicTestimonialCount, 3);
  assert.equal((await getRankingContext([], null)).publicTestimonialCounts.size, 0);
});

test("account deletion persists zero average and current public count, including zero", async () => {
  for (const count of [0, 3]) {
    let writes = 0;
    const tx = {
      professional_review: {
        count: async ({ where }: { where: unknown }) => {
          assert.deepEqual(where, visibleTestimonialsWhere("professional"));
          return count;
        },
      },
      psychologist_profile: {
        updateMany: async (args: unknown) => {
          assert.deepEqual(args, {
            where: { user_id: "professional", deleted: false },
            data: { rating_avg: 0, rating_count: count },
          });
          writes++;
        },
      },
    } as unknown as Prisma.TransactionClient;
    await recalculatePsychologistRating(tx, "professional");
    assert.equal(writes, 1);
  }
});

test("admin count query uses the same public filter and short-circuits empty candidates", async () => {
  let reads = 0;
  const client = {
    professional_review: {
      groupBy: async ({ where }: { where: unknown }) => {
        reads++;
        assert.deepEqual(where, visibleTestimonialsWhere({ in: ["professional"] }));
        return [{ psychologist_id: "professional", _count: { _all: 2 } }];
      },
    },
  } as unknown as Prisma.TransactionClient;
  assert.equal((await getPublicTestimonialCounts(client, [])).size, 0);
  assert.equal(reads, 0);
  assert.equal((await getPublicTestimonialCounts(client, ["professional"])).get("professional"), 2);
  assert.equal(reads, 1);
});

test("legacy admin rating sort uses testimonial count, not average", () => {
  const highStars = { name: "A", rating_avg: 5, rating_count: 1 } as AdminItem;
  const moreTestimonials = { name: "B", rating_avg: 1, rating_count: 3 } as AdminItem;
  assert.deepEqual(sortItems([highStars, moreTestimonials], "rating"), [
    moreTestimonials,
    highStars,
  ]);
  assert.deepEqual(
    sortItems([moreTestimonials, highStars], "rating").map((item) => item.name),
    ["B", "A"],
  );
});
