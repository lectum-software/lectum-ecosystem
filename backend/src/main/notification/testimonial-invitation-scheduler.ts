import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { notification as emitNotification } from "@/main/socket/events/notification";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { toSafeErrorLog } from "@/utils/safe-error-log";
import { messages } from "./constants";
import {
  eligibleVideoProfessionalWhere,
  isTestimonialInvitationsEnabled,
} from "./pending-testimonial-invitation";
import { isChannelAllowed } from "./preferences";
import { sendWebPushToSubscriptions } from "./push";

const key = "depoimentos_pendentes";
export const testimonialBatchRedirect = (id: string) =>
  `/app/depoimentos/pendentes?batch=${encodeURIComponent(id)}`;

export async function finalizeTestimonialBatch(
  tx: Prisma.TransactionClient,
  id: string,
  now: Date,
) {
  const batch = await tx.testimonial_invitation_batch.findFirst({
    where: { id, status: "pending", window_end: { lte: now } },
    include: { members: true },
  });
  if (!batch) return null;
  const patient = await tx.user.findFirst({
    where: { id: batch.patient_id, role: "paciente", active: true, deleted: false },
    select: { notification_preference: { select: { prefs: true } } },
  });
  const inApp = Boolean(
    patient && isChannelAllowed(patient.notification_preference?.prefs, key, "in_app"),
  );
  const push = Boolean(
    patient && isChannelAllowed(patient.notification_preference?.prefs, key, "push"),
  );
  const included: string[] = [];
  if (inApp || push)
    for (const member of batch.members) {
      const eligible = await tx.user.findFirst({
        where: {
          AND: [
            eligibleVideoProfessionalWhere(batch.patient_id, member.reply_id),
            { id: member.psychologist_id },
          ],
        },
        select: { id: true },
      });
      if (eligible) included.push(member.id);
    }
  if (!included.length) {
    await tx.testimonial_invitation_batch.update({
      where: { id },
      data: { status: "skipped", push_status: "skipped" },
    });
    return null;
  }
  const notification = await tx.notification.create({
    data: {
      id: `testimonial-batch-${id}`,
      user_id: batch.patient_id,
      message_key: key,
      deleted: !inApp,
      redirect: testimonialBatchRedirect(id),
      message_props: { source_type: "testimonial_invitation_group", batch_id: id },
    },
  });
  await tx.testimonial_invitation_member.updateMany({
    where: { id: { in: included } },
    data: { included: true },
  });
  await tx.testimonial_invitation_batch.update({
    where: { id },
    data: {
      status: "completed",
      notification_id: notification.id,
      push_status: push ? "pending" : "skipped",
    },
  });
  if (inApp)
    await tx.notification_delivery.create({
      data: {
        user_id: batch.patient_id,
        notification_id: notification.id,
        trigger_key: key,
        source: "automatic",
        channel: "in_app",
        status: "delivered",
        sent_at: now,
        delivered_at: now,
      },
    });
  return inApp ? batch.patient_id : null;
}

export async function deliverTestimonialPushes(now: Date) {
  const batches = await prisma.testimonial_invitation_batch.findMany({
    where: { status: "completed", push_status: "pending", notification_id: { not: null } },
    orderBy: [{ window_end: "asc" }, { id: "asc" }],
    take: 100,
  });
  for (const batch of batches) {
    const claimed = await prisma.testimonial_invitation_batch.updateMany({
      where: { id: batch.id, push_status: "pending" },
      data: { push_status: "sending", push_claimed_at: now },
    });
    if (!claimed.count) continue;
    // At most one provider attempt, including ambiguous timeouts or process restarts.
    const patient = await prisma.user.findFirst({
      where: { id: batch.patient_id, role: "paciente", active: true, deleted: false },
      include: {
        notification_preference: true,
        notification_subscriptions: { where: { deleted: false } },
      },
    });
    const members = await prisma.testimonial_invitation_member.findMany({
      where: { batch_id: batch.id, included: true },
    });
    let eligible = false;
    for (const member of members) {
      if (
        await prisma.user.findFirst({
          where: {
            AND: [
              eligibleVideoProfessionalWhere(batch.patient_id, member.reply_id),
              { id: member.psychologist_id },
            ],
          },
          select: { id: true },
        })
      ) {
        eligible = true;
        break;
      }
    }
    const allowed =
      patient && eligible && isChannelAllowed(patient.notification_preference?.prefs, key, "push");
    const result = allowed
      ? await sendWebPushToSubscriptions({
          ...messages.depoimentos_pendentes({}),
          redirect: testimonialBatchRedirect(batch.id),
          subscriptions: patient.notification_subscriptions,
          action: "leave_testimonial",
        })
      : { status: "skipped" as const, failureReason: "preference_or_eligibility_changed" };
    await prisma.$transaction(async (tx) => {
      await tx.testimonial_invitation_batch.update({
        where: { id: batch.id },
        data: { push_status: result.status },
      });
      await tx.notification_delivery.create({
        data: {
          user_id: batch.patient_id,
          notification_id: batch.notification_id,
          channel: "push",
          source: "automatic",
          trigger_key: key,
          status: result.status,
          failure_reason: result.failureReason,
          sent_at: result.status === "sent" ? now : null,
        },
      });
    });
  }
}

export async function runTestimonialInvitations(now = new Date()) {
  if (!isTestimonialInvitationsEnabled()) return;
  const batches = await prisma.testimonial_invitation_batch.findMany({
    where: { status: "pending", window_end: { lte: now } },
    orderBy: [{ window_end: "asc" }, { id: "asc" }],
    take: 100,
    select: { id: true },
  });
  for (const batch of batches) {
    try {
      const patientId = await withSerializableTransaction((tx) =>
        finalizeTestimonialBatch(tx, batch.id, now),
      );
      if (patientId) await emitNotification([patientId]);
    } catch (error) {
      console.error("[TESTIMONIAL BATCH]", toSafeErrorLog(error, "TestimonialBatchError"));
    }
  }
  await deliverTestimonialPushes(now);
}
