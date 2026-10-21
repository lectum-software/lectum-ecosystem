import prisma from "@/infra/database/prisma";
import type { PsychologistAnalyticsPeriod } from "../../DTOs/IAnalyticsDTO";
import {
  COMMUNITY_WHATSAPP_POST_TARGET_TYPES,
  COMMUNITY_WHATSAPP_REPLY_TARGET_TYPES,
} from "../support/traffic";

// Same eligible content as community analytics; contacts remain a separate people-based report.
export async function analyticsWhatsappActions(
  userId: string,
  period: Pick<PsychologistAnalyticsPeriod, "start_at" | "end_at">,
) {
  const post = {
    deleted: false,
    status: "publicado",
    community: { active: true, deleted: false },
  } as const;
  const [posts, replies] = await Promise.all([
    prisma.community_post.findMany({ where: { ...post, author_id: userId }, select: { id: true } }),
    prisma.post_reply.findMany({
      where: { author_id: userId, deleted: false, post },
      select: { id: true },
    }),
  ]);
  return prisma.important_action_event.findMany({
    where: {
      deleted: false,
      occurred_at: { gte: period.start_at, lte: period.end_at },
      AND: [
        { OR: [{ user_id: null }, { user_id: { not: userId } }] },
        {
          OR: [
            {
              action_type: { in: ["whatsapp_click", "psychologist_video_whatsapp_click"] },
              target_type: "psychologist",
              target_id: userId,
            },
            {
              action_type: "whatsapp_click",
              target_type: { in: [...COMMUNITY_WHATSAPP_POST_TARGET_TYPES] },
              target_id: { in: posts.map((item) => item.id) },
            },
            {
              action_type: "whatsapp_click",
              target_type: { in: [...COMMUNITY_WHATSAPP_REPLY_TARGET_TYPES] },
              target_id: { in: replies.map((item) => item.id) },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      user_id: true,
      visitor_id: true,
      occurred_at: true,
      action_type: true,
      target_type: true,
      target_id: true,
      page_kind: true,
      path: true,
    },
  });
}
