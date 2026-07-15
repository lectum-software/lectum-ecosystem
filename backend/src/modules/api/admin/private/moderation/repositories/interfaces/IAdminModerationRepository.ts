import type { Prisma } from "@/external/generated/prisma/client";
import type { AdminModerationEventsQuery } from "../../DTOs/IAdminModerationDTO";

export const adminModerationEventSelect = {
  id: true,
  createdAt: true,
  target_type: true,
  target_id: true,
  community_id: true,
  author_id: true,
  decision: true,
  categories: true,
  severity: true,
  status: true,
  reason_code: true,
  matched_rules: true,
  title_snapshot: true,
  content_excerpt: true,
  reviewed_at: true,
  resolved_at: true,
  community: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  author: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
} satisfies Prisma.content_moderation_eventSelect;

export const adminModerationEventDetailSelect = {
  ...adminModerationEventSelect,
  admin_note: true,
  content_snapshot: true,
  reviewed_by_admin_id: true,
} satisfies Prisma.content_moderation_eventSelect;

export type AdminModerationEventRecord = Prisma.content_moderation_eventGetPayload<{
  select: typeof adminModerationEventSelect;
}>;

export type AdminModerationEventDetailRecord = Prisma.content_moderation_eventGetPayload<{
  select: typeof adminModerationEventDetailSelect;
}>;

export type ReplyTargetRecord = {
  id: string;
  post_id: string;
  post: {
    community: {
      slug: string;
    };
  };
};

export interface IAdminModerationRepository {
  countPending(): Promise<number>;
  countUrgentPending(): Promise<number>;
  findEvent(id: string): Promise<AdminModerationEventDetailRecord | null>;
  listEvents(query: AdminModerationEventsQuery): Promise<AdminModerationEventRecord[]>;
  listLatestPending(limit: number): Promise<AdminModerationEventRecord[]>;
  listReplyTargets(replyIds: string[]): Promise<ReplyTargetRecord[]>;
  markReviewing(id: string, adminId: string): Promise<AdminModerationEventDetailRecord | null>;
  resolveEvent(
    id: string,
    input: { adminId: string; note: string },
  ): Promise<AdminModerationEventDetailRecord | null>;
}
