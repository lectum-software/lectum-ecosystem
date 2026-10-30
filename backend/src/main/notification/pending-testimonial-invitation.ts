import { createHash } from "node:crypto";
import type { Prisma } from "@/external/generated/prisma/client";
import { pendingReviewProfessionalsWhere } from "@/modules/api/private/patient/reviews/repositories/pending-review-policy";
import { isChannelAllowed } from "./preferences";

export type PendingTestimonialInvitation = {
  actorId: string;
  patientId: string;
  replyId: string;
};

// The caller owns the Serializable transaction. The primary key is the concurrency guard.
export const createPendingTestimonialInvitation = async (
  tx: Prisma.TransactionClient,
  params: PendingTestimonialInvitation,
) => {
  const id = `testimonial-invite-${createHash("sha256").update(params.patientId).digest("hex").slice(0, 32)}`;
  const patient = await tx.user.findFirst({
    where: { id: params.patientId, role: "paciente", active: true, deleted: false },
    select: { notification_preference: { select: { prefs: true } } },
  });
  if (
    !patient ||
    !isChannelAllowed(patient.notification_preference?.prefs, "depoimentos_pendentes", "in_app")
  )
    return false;
  const psychologist = await tx.user.findFirst({
    where: {
      AND: [
        pendingReviewProfessionalsWhere(params.patientId, params.replyId),
        { id: params.actorId },
      ],
    },
    select: { id: true },
  });
  if (!psychologist) return false;
  const result = await tx.notification.createMany({
    data: [
      {
        id,
        user_id: params.patientId,
        message_key: "depoimentos_pendentes",
        message_props: { source_type: "testimonial_invitation_group" },
        redirect: "/app/depoimentos/pendentes",
      },
    ],
    skipDuplicates: true,
  });
  if (!result.count) return false;
  const now = new Date();
  await tx.notification_delivery.create({
    data: {
      user_id: params.patientId,
      notification_id: id,
      source: "automatic",
      trigger_key: "depoimentos_pendentes",
      channel: "in_app",
      status: "delivered",
      sent_at: now,
      delivered_at: now,
      metadata: { policy: "single_group_in_app_only" },
    },
  });
  return true;
};
