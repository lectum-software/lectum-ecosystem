import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { ModerationResult } from "@/utils/content-moderation";
import { createModerationExcerpt } from "@/utils/content-moderation";

export type ModerationTargetType =
  | "community_post"
  | "post_reply"
  | "submitted_post"
  | "submitted_reply";

export type RecordContentModerationEventInput = {
  authorId: string;
  communityId?: string | null;
  content: string;
  result: ModerationResult;
  targetId?: string | null;
  targetType: ModerationTargetType;
  title?: string | null;
};

const toJson = (value: unknown) => value as Prisma.InputJsonValue;

export const findModerationCommunityBySlug = (slug: string) =>
  prisma.community.findFirst({
    where: {
      deleted: false,
      slug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

export const findModerationPostContext = (postId: string) =>
  prisma.community_post.findFirst({
    where: {
      deleted: false,
      id: postId,
      status: "publicado",
      community: {
        deleted: false,
      },
    },
    select: {
      id: true,
      title: true,
      community_id: true,
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

export const recordContentModerationEvent = async ({
  authorId,
  communityId,
  content,
  result,
  targetId,
  targetType,
  title,
}: RecordContentModerationEventInput) => {
  if (result.decision === "allow") return null;

  const titleSnapshot = title?.trim() || null;
  const contentSnapshot = content.trim();

  return prisma.content_moderation_event.create({
    data: {
      author_id: authorId,
      categories: toJson(result.categories),
      community_id: communityId || null,
      content_excerpt: createModerationExcerpt(contentSnapshot),
      content_snapshot: contentSnapshot || null,
      decision: result.decision,
      matched_rules: toJson(result.matchedRules),
      reason_code: result.reasonCode,
      severity: result.severity,
      status: "pending",
      target_id: targetId || null,
      target_type: targetType,
      title_snapshot: titleSnapshot,
    },
  });
};
