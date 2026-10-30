import type { Prisma } from "@/external/generated/prisma/client";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";

// Only direct replies: answering another participant in the same post is not sufficient.
export const pendingReviewProfessionalsWhere = (
  patientId: string,
  replyId?: string,
): Prisma.userWhereInput => ({
  role: "psicologo",
  active: true,
  deleted: false,
  id: { not: patientId },
  psychologist_profile: {
    is: {
      deleted: false,
      published: true,
      video_url: { not: null },
      NOT: { video_url: "" },
      subscriptions: { some: activeProfessionalEntitlementWhere() },
    },
  },
  received_reviews: { none: { author_id: patientId, deleted: false } },
  post_replies: {
    some: {
      ...(replyId ? { id: replyId } : {}),
      deleted: false,
      post: { deleted: false, status: "publicado", community: { deleted: false } },
      OR: [
        { parent_reply_id: null, post: { author_id: patientId } },
        { parent_reply: { is: { author_id: patientId, deleted: false } } },
      ],
    },
  },
});
