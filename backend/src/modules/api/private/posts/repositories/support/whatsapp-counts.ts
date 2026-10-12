import prisma from "@/infra/database/prisma";
import {
  COMMUNITY_WHATSAPP_POST_TARGET_TYPES,
  COMMUNITY_WHATSAPP_REPLY_TARGET_TYPES,
} from "@/modules/api/private/psychologist/analytics/repositories/support/traffic";

export const getOwnedContentWhatsappCounts = async (
  authorId: string,
  role: string | null | undefined,
  postIds: string[],
  replyIds: string[],
) => {
  const counts = new Map<string, number>();
  if (role !== "psicologo" || (!postIds.length && !replyIds.length)) return counts;
  const groups = await prisma.important_action_event.groupBy({
    by: ["target_type", "target_id"],
    where: {
      action_type: "whatsapp_click",
      deleted: false,
      AND: [
        { OR: [{ user_id: null }, { user_id: { not: authorId } }] },
        {
          OR: [
            {
              target_type: { in: [...COMMUNITY_WHATSAPP_POST_TARGET_TYPES] },
              target_id: { in: postIds },
            },
            {
              target_type: { in: [...COMMUNITY_WHATSAPP_REPLY_TARGET_TYPES] },
              target_id: { in: replyIds },
            },
          ],
        },
      ],
    },
    _count: { _all: true },
  });
  for (const group of groups) {
    const type = (COMMUNITY_WHATSAPP_POST_TARGET_TYPES as readonly string[]).includes(
      group.target_type ?? "",
    )
      ? "post"
      : "reply";
    const key = `${type}:${group.target_id}`;
    counts.set(key, (counts.get(key) ?? 0) + group._count._all);
  }
  return counts;
};
