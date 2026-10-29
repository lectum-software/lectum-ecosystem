import assert from "node:assert/strict";
import { before, type TestContext, test } from "node:test";
import type { Prisma } from "@/external/generated/prisma/client";
import type { IPostVoteDTO } from "../../DTOs/IPostDTO";

process.env.DATABASE_URL ??= "postgresql://lectum:lectum@localhost:5432/lectum_test";
process.env.JWT_SECRET_KEY ??= "lectum-test-jwt-secret-key-32-bytes";

let prisma: typeof import("@/infra/database/prisma").default;
let PostEngagementRepository: typeof import("./PostEngagementRepository").PostEngagementRepository;
let vote: typeof import("../../use-cases/services/media-actions").vote;

before(async () => {
  prisma = (await import("@/infra/database/prisma")).default;
  ({ PostEngagementRepository } = await import("./PostEngagementRepository"));
  ({ vote } = await import("../../use-cases/services/media-actions"));
});

const request = (value: number, replyId?: string): IPostVoteDTO => ({
  auth: { id: "voter", role: "paciente" },
  b: { value: value as IPostVoteDTO["b"]["value"], replyId },
  p: { id: "post" },
});

// Prisma delegate methods are proxy-backed, so MockTracker.method cannot inspect them.
const stub = (
  t: TestContext,
  target: object,
  key: string,
  implementation: (...args: never[]) => unknown,
) => {
  const original = Reflect.get(target, key);
  const replacement = t.mock.fn(implementation);
  Reflect.set(target, key, replacement);
  t.after(() => {
    Reflect.set(target, key, original);
  });
  return replacement;
};

for (const replyId of [undefined, "reply"]) {
  const target = replyId ? "reply" : "post";

  test(`${target}: negative and invalid votes are rejected before database access`, async (t) => {
    const lookup = stub(t, prisma.community_post, "findFirst", () => {
      throw new Error("Rejected votes must not access storage");
    });
    const transaction = stub(t, prisma, "$transaction", () => {
      throw new Error("Rejected votes must not mutate storage");
    });
    for (const value of [-1, 0, 2, -2]) {
      assert.deepEqual(await new PostEngagementRepository().vote(request(value, replyId)), {
        kind: "invalid_vote_value",
      });
      assert.equal((await vote(request(value, replyId))).status, 422);
    }
    assert.equal(lookup.mock.callCount(), 0);
    assert.equal(transaction.mock.callCount(), 0);
  });

  for (const previous of [null, 1, -1] as const) {
    test(`${target}: upvote toggles and undoes from legacy state ${previous}`, async (t) => {
      let row =
        previous === null ? null : { id: "vote", value: previous as number, deleted: false };
      let upvotes = previous === 1 ? 5 : 4;
      let downvotes = previous === -1 ? 3 : 2;
      const originalDownvotes = downvotes;
      let writes = 0;

      stub(t, prisma.community_post, "findFirst", async () => ({ id: "post" }));
      stub(t, prisma.post_reply, "findFirst", async () => ({ id: "reply" }));
      const updateCounts = async (args: {
        data: { upvotes_count: { increment: number }; downvotes_count: { increment: number } };
      }) => {
        writes++;
        upvotes += args.data.upvotes_count.increment;
        downvotes += args.data.downvotes_count.increment;
        return { upvotes_count: upvotes, downvotes_count: downvotes };
      };
      const transaction = {
        post_vote: {
          findUnique: async () => row,
          create: async ({ data }: { data: { value: number } }) => {
            row = { id: "vote", value: data.value, deleted: false };
          },
          update: async ({ data }: { data: { value: number; deleted: boolean } }) => {
            row = { id: "vote", value: data.value, deleted: data.deleted };
          },
        },
        community_post: { update: updateCounts },
        post_reply: { update: updateCounts },
      };
      stub(t, prisma, "$transaction", async (callback: (tx: Prisma.TransactionClient) => unknown) =>
        callback(transaction as unknown as Prisma.TransactionClient),
      );
      const repository = new PostEngagementRepository();
      for (const expected of previous === 1 ? [null, 1, null] : [1, null, 1]) {
        const result = await repository.vote(request(1, replyId));
        assert.equal(result.kind, "ok");
        if (result.kind !== "ok") throw new Error("Expected a successful vote");
        assert.equal(result.data.target_type, target);
        assert.equal(result.data.value, expected);
        assert.equal(result.data.upvotes_count, expected === 1 ? 5 : 4);
        assert.equal(result.data.downvotes_count, originalDownvotes - (previous === -1 ? 1 : 0));
      }
      assert.equal(writes, 3);
      assert.equal(row?.id, "vote");
    });
  }
}
