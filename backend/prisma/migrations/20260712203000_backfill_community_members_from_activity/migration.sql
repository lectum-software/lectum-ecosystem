-- Backfill community membership from the first real participation signal.
-- A user becomes a community member when they follow/join, create a post, or create a reply.
-- The membership created_at must remain the first historical participation date.

WITH first_activities AS (
  SELECT
    participation.community_id,
    participation.user_id,
    MIN(participation.first_activity_at) AS first_activity_at
  FROM (
    SELECT
      post.community_id,
      post.author_id AS user_id,
      post.created_at AS first_activity_at
    FROM community_posts post
    INNER JOIN communities community ON community.id = post.community_id
    INNER JOIN users author ON author.id = post.author_id
    WHERE post.deleted = FALSE
      AND post.status = 'publicado'
      AND community.deleted = FALSE
      AND author.deleted = FALSE

    UNION ALL

    SELECT
      post.community_id,
      reply.author_id AS user_id,
      reply.created_at AS first_activity_at
    FROM post_replies reply
    INNER JOIN community_posts post ON post.id = reply.post_id
    INNER JOIN communities community ON community.id = post.community_id
    INNER JOIN users author ON author.id = reply.author_id
    WHERE reply.deleted = FALSE
      AND post.deleted = FALSE
      AND post.status = 'publicado'
      AND community.deleted = FALSE
      AND author.deleted = FALSE
  ) participation
  GROUP BY participation.community_id, participation.user_id
)
INSERT INTO community_members (
  id,
  community_id,
  user_id,
  deleted,
  deleted_at,
  created_at,
  updated_at
)
SELECT
  'cm_' || md5(first_activities.community_id || ':' || first_activities.user_id),
  first_activities.community_id,
  first_activities.user_id,
  FALSE,
  NULL,
  first_activities.first_activity_at,
  NOW()
FROM first_activities
ON CONFLICT (community_id, user_id)
DO UPDATE SET
  deleted = FALSE,
  deleted_at = NULL,
  created_at = LEAST(community_members.created_at, EXCLUDED.created_at),
  updated_at = NOW();

UPDATE communities community
SET
  members_count = counters.members_count,
  updated_at = NOW()
FROM (
  SELECT
    community.id,
    COUNT(member.id)::INTEGER AS members_count
  FROM communities community
  LEFT JOIN community_members member
    ON member.community_id = community.id
    AND member.deleted = FALSE
  GROUP BY community.id
) counters
WHERE community.id = counters.id;
