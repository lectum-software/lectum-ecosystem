import assert from "node:assert/strict";
import { before, describe, it, type TestContext } from "node:test";
import type { Prisma } from "@/external/generated/prisma/client";
import type { VideoAssetRecord } from "./types";

let prisma: typeof import("@/infra/database/prisma").default;
let VideoAssetRepository: typeof import("./repository").VideoAssetRepository;

before(async () => {
  process.env.DATABASE_URL ??= "postgresql://localhost:5432/lectum_test_unused";
  process.env.JWT_SECRET_KEY ??= "test-only-video-playback-key-not-for-production";
  ({ default: prisma } = await import("@/infra/database/prisma"));
  ({ VideoAssetRepository } = await import("./repository"));
});

const asset = {
  id: "test-reply-video",
  owner_id: "psychologist-author",
  purpose: "community_reply",
  context_id: "published-question",
} as VideoAssetRecord;

const stubReplyLookup = (
  t: TestContext,
  lookup: (args: Prisma.post_replyFindFirstArgs) => Promise<{ id: string } | null>,
) => {
  const original = prisma.post_reply.findFirst;
  const stub = t.mock.fn(lookup);
  // Prisma delegates expose methods through a proxy, not own method descriptors.
  prisma.post_reply.findFirst = stub as unknown as typeof original;
  t.after(() => {
    prisma.post_reply.findFirst = original;
  });
  return stub;
};

describe("reply playback after question author account deletion", () => {
  it("authorizes a retained reply without requiring the question author's account", async (t) => {
    stubReplyLookup(t, async (args) => {
      // The query keeps all content/owner guards, but must not inspect post.author.
      assert.deepEqual(args.where, {
        author_id: asset.owner_id,
        deleted: false,
        media_type: "video",
        media_url: "/api/private/video-assets/test-reply-video/playback",
        author: { active: true, deleted: false },
        post: {
          deleted: false,
          id: asset.context_id,
          status: "publicado",
          community: { active: true, deleted: false },
        },
      });
      assert.deepEqual(args.select, { id: true });
      return { id: "retained-reply" };
    });

    const repository = new VideoAssetRepository();
    assert.equal(await repository.isPlaybackAuthorized(asset, null), true);
    assert.equal(await repository.isPlaybackAuthorized(asset, "another-visitor"), true);
  });

  it("denies visitors when no published association matches the guarded query", async (t) => {
    stubReplyLookup(t, async () => null);
    const repository = new VideoAssetRepository();
    assert.equal(await repository.isPlaybackAuthorized(asset, null), false);
    assert.equal(await repository.isPlaybackAuthorized(asset, "another-visitor"), false);
  });

  it("denies unattached replies without querying content", async (t) => {
    const lookup = stubReplyLookup(t, async () => {
      throw new Error("Unexpected lookup for an unattached asset");
    });
    assert.equal(
      await new VideoAssetRepository().isPlaybackAuthorized({ ...asset, context_id: null }),
      false,
    );
    assert.equal(lookup.mock.callCount(), 0);
  });

  it("preserves owner preview without a public association", async (t) => {
    const lookup = stubReplyLookup(t, async () => {
      throw new Error("Owner preview must not query published content");
    });
    assert.equal(
      await new VideoAssetRepository().isPlaybackAuthorized(
        { ...asset, context_id: null },
        asset.owner_id,
      ),
      true,
    );
    assert.equal(lookup.mock.callCount(), 0);
  });
});
