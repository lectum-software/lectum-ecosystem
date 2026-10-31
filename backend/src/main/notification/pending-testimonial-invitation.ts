import type { Prisma } from "@/external/generated/prisma/client";
import { pendingReviewProfessionalsWhere } from "@/modules/api/private/patient/reviews/repositories/pending-review-policy";
import { isChannelAllowed } from "./preferences";

export type PendingTestimonialInvitation = { actorId: string; patientId: string; replyId: string };
export const TESTIMONIAL_WINDOW_MS = 24 * 60 * 60 * 1000;
export const isTestimonialInvitationsEnabled = () =>
  process.env.TESTIMONIAL_INVITATIONS_ENABLED === "true";

export const eligibleVideoProfessionalWhere = (
  patientId: string,
  replyId: string,
): Prisma.userWhereInput => {
  const where = pendingReviewProfessionalsWhere(patientId, replyId);
  return {
    ...where,
    post_replies: {
      some: {
        ...where.post_replies?.some,
        media_type: "video",
        media_url: { not: null },
        NOT: { media_url: "" },
        post: {
          deleted: false,
          status: "publicado",
          community: { deleted: false },
          notification_mutes: { none: { user_id: patientId, deleted: false } },
        },
      },
    },
  };
};

// Caller owns a Serializable transaction: concurrent first replies cannot split the window.
export const createPendingTestimonialInvitation = async (
  tx: Prisma.TransactionClient,
  params: PendingTestimonialInvitation,
  now = new Date(),
) => {
  if (!isTestimonialInvitationsEnabled()) return false;
  const patient = await tx.user.findFirst({
    where: { id: params.patientId, role: "paciente", active: true, deleted: false },
    select: { notification_preference: { select: { prefs: true } } },
  });
  if (
    !patient ||
    !["in_app", "push"].some((channel) =>
      isChannelAllowed(
        patient.notification_preference?.prefs,
        "depoimentos_pendentes",
        channel as "in_app" | "push",
      ),
    )
  )
    return false;
  const professional = await tx.user.findFirst({
    where: {
      AND: [
        eligibleVideoProfessionalWhere(params.patientId, params.replyId),
        { id: params.actorId },
      ],
    },
    select: { id: true },
  });
  if (!professional) return false;
  const existing = await tx.testimonial_invitation_member.findUnique({
    where: {
      patient_id_psychologist_id: { patient_id: params.patientId, psychologist_id: params.actorId },
    },
    select: { id: true },
  });
  if (existing) return false;
  const batch =
    (await tx.testimonial_invitation_batch.findFirst({
      where: {
        patient_id: params.patientId,
        status: "pending",
        window_start: { lte: now },
        window_end: { gt: now },
      },
      orderBy: { window_start: "desc" },
    })) ??
    (await tx.testimonial_invitation_batch.create({
      data: {
        patient_id: params.patientId,
        window_start: now,
        window_end: new Date(now.getTime() + TESTIMONIAL_WINDOW_MS),
      },
    }));
  await tx.testimonial_invitation_member.create({
    data: {
      batch_id: batch.id,
      patient_id: params.patientId,
      psychologist_id: params.actorId,
      reply_id: params.replyId,
    },
  });
  return true;
};
