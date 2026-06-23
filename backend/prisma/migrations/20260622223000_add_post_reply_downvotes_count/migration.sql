-- Add denormalized downvote counter for reply ranking.
ALTER TABLE "post_replies" ADD COLUMN "downvotes_count" INTEGER NOT NULL DEFAULT 0;

UPDATE "post_replies" AS reply
SET "downvotes_count" = vote_counts.count
FROM (
  SELECT "reply_id", COUNT(*)::INTEGER AS count
  FROM "post_votes"
  WHERE "deleted" = false
    AND "reply_id" IS NOT NULL
    AND "value" = -1
  GROUP BY "reply_id"
) AS vote_counts
WHERE reply."id" = vote_counts."reply_id";