import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/external/generated/prisma/client";
import { deleteOwnReview } from "./delete-own-review";

const fixture = (
  options: {
    author?: string;
    deleted?: boolean;
    count?: number;
    average?: number | null;
    changed?: number;
    failAggregate?: boolean;
  } = {},
) => {
  const calls: { update?: unknown; profile?: unknown; reads: number } = { reads: 0 };
  const tx = {
    professional_review: {
      findFirst: async ({
        where,
      }: {
        where: { id: string; author_id: string; deleted: boolean };
      }) => {
        calls.reads++;
        assert.equal(where.deleted, false);
        return where.id === "review" &&
          where.author_id === (options.author ?? "author") &&
          !options.deleted
          ? { psychologist_id: "professional" }
          : null;
      },
      updateMany: async (args: { where: unknown; data: { deleted: boolean; deletedAt: Date } }) => {
        assert.deepEqual(args.where, { id: "review", author_id: "author", deleted: false });
        assert.equal(args.data.deleted, true);
        assert.ok(args.data.deletedAt instanceof Date);
        calls.update = args;
        return { count: options.changed ?? 1 };
      },
      aggregate: async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, {
          psychologist_id: "professional",
          deleted: false,
          status: "publicada",
        });
        return { _avg: { rating: options.average ?? null }, _count: { _all: options.count ?? 0 } };
      },
    },
    psychologist_profile: {
      update: async (args: unknown) => {
        if (options.failAggregate) throw new Error("aggregate failure");
        calls.profile = args;
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { tx, calls };
};

test("author removal recalculates only published, non-deleted ratings", async () => {
  const { tx, calls } = fixture({ average: 4.3333, count: 3 });
  const result = await deleteOwnReview(tx, "author", "review");
  assert.deepEqual(result, {
    review_id: "review",
    psychologist_id: "professional",
    rating_avg: 433,
    rating_count: 3,
  });
  assert.deepEqual(calls.profile, {
    where: { user_id: "professional" },
    data: { rating_avg: 433, rating_count: 3 },
  });
});

test("deleting the last rating resets average and count to zero", async () => {
  const { tx } = fixture();
  const result = await deleteOwnReview(tx, "author", "review");
  assert.equal(result?.rating_avg, 0);
  assert.equal(result?.rating_count, 0);
});

for (const actor of ["other-author", "professional"]) {
  test(`${actor} cannot delete someone else's review`, async () => {
    const { tx, calls } = fixture();
    assert.equal(await deleteOwnReview(tx, actor, "review"), null);
    assert.equal(calls.update, undefined);
    assert.equal(calls.profile, undefined);
  });
}

test("missing author is rejected before database access", async () => {
  const { tx, calls } = fixture();
  assert.equal(await deleteOwnReview(tx, "", "review"), null);
  assert.equal(calls.reads, 0);
});

test("missing or already deleted review causes no writes", async () => {
  for (const deleted of [false, true]) {
    const { tx, calls } = fixture({ deleted });
    assert.equal(await deleteOwnReview(tx, "author", deleted ? "review" : "missing"), null);
    assert.equal(calls.update, undefined);
    assert.equal(calls.profile, undefined);
  }
});

test("concurrent removal does not update the aggregate twice", async () => {
  const { tx, calls } = fixture({ changed: 0 });
  assert.equal(await deleteOwnReview(tx, "author", "review"), null);
  assert.equal(calls.profile, undefined);
});

test("aggregate update failure propagates so the surrounding transaction rolls back", async () => {
  const { tx } = fixture({ failAggregate: true });
  await assert.rejects(deleteOwnReview(tx, "author", "review"), /aggregate failure/);
});
