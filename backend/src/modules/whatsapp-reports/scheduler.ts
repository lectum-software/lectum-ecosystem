import { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { createNotificationDelivery } from "@/main/notification/deliveries";
import { isChannelAllowed } from "@/main/notification/preferences";
import { sendWebPushToSubscriptions } from "@/main/notification/push";
import { notification as emitNotification } from "@/main/socket/events/notification";
import { whatsappPeopleCounts } from "./counts";
import {
  isWhatsappWeekReleased,
  previousWhatsappWeek,
  reportDates,
  WEEKLY_WHATSAPP_KEY,
} from "./policy";

export async function runWeeklyWhatsappReports(now = new Date()) {
  if (process.env.WEEKLY_WHATSAPP_REPORTS_ENABLED !== "true") return;
  const week = previousWhatsappWeek(now);
  if (now < week.availableAt) return;
  if (!isWhatsappWeekReleased(week.availableAt, process.env.WEEKLY_WHATSAPP_REPORTS_START_AT))
    return;
  const candidates = await whatsappPeopleCounts(week.start, week.end);
  for (const candidate of candidates) {
    if (candidate.people_count < 1) continue;
    const existing = await prisma.professional_whatsapp_week.findUnique({
      where: {
        psychologist_id_week_start: {
          psychologist_id: candidate.psychologist_id,
          week_start: week.start,
        },
      },
      select: { id: true },
    });
    if (existing) continue;
    try {
      await prisma.$transaction(async (tx) => {
        const notification = await tx.notification.create({
          data: {
            user_id: candidate.psychologist_id,
            message_key: WEEKLY_WHATSAPP_KEY,
            message_props: {
              ...reportDates(week.start, week.end),
              people_count: candidate.people_count,
            },
          },
        });
        const report = await tx.professional_whatsapp_week.create({
          data: {
            psychologist_id: candidate.psychologist_id,
            week_start: week.start,
            week_end: week.end,
            available_at: week.availableAt,
            people_count: candidate.people_count,
            notification_id: notification.id,
          },
        });
        await tx.notification.update({
          where: { id: notification.id },
          data: {
            redirect: `/app/notificacoes?whatsapp_week=${report.id}`,
          },
        });
        await tx.notification_delivery.create({
          data: {
            user_id: candidate.psychologist_id,
            notification_id: notification.id,
            channel: "in_app",
            source: "automatic",
            status: "delivered",
            trigger_key: WEEKLY_WHATSAPP_KEY,
            sent_at: now,
            delivered_at: now,
          },
        });
      });
      await emitNotification([candidate.psychologist_id]);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"))
        throw error;
    }
  }
  await deliverWeeklyWhatsappPushes(now, week.start);
}

async function deliverWeeklyWhatsappPushes(now: Date, weekStart: Date) {
  const pending = await prisma.professional_whatsapp_week.findMany({
    where: {
      deleted: false,
      push_status: "pending",
      week_start: weekStart,
      available_at: { lte: now },
    },
    take: 100,
    orderBy: { createdAt: "asc" },
  });
  for (const report of pending) {
    const claimed = await prisma.professional_whatsapp_week.updateMany({
      where: { id: report.id, push_status: "pending" },
      data: { push_status: "sending", push_claimed_at: now },
    });
    if (!claimed.count) continue;
    // At-most-once attempt: do not blindly resend after an ambiguous provider timeout.
    const user = await prisma.user.findFirst({
      where: { id: report.psychologist_id, deleted: false, active: true, role: "psicologo" },
      include: {
        notification_preference: true,
        notification_subscriptions: { where: { deleted: false } },
      },
    });
    const allowed =
      user && isChannelAllowed(user.notification_preference?.prefs, WEEKLY_WHATSAPP_KEY, "push");
    const dates = reportDates(report.week_start, report.week_end);
    const result = allowed
      ? await sendWebPushToSubscriptions({
          title: "Seu resumo semanal está disponível",
          body: `De ${dates.start_label} a ${dates.end_label}, ${report.people_count} ${report.people_count === 1 ? "pessoa clicou" : "pessoas clicaram"} no seu WhatsApp pela Lectum. Informe quantas agendaram.`,
          redirect: `/app/notificacoes?whatsapp_week=${report.id}`,
          subscriptions: user.notification_subscriptions,
        })
      : { status: "skipped" as const, failureReason: "preference_disabled" };
    await prisma.professional_whatsapp_week.update({
      where: { id: report.id },
      data: { push_status: result.status },
    });
    await createNotificationDelivery({
      channel: "push",
      source: "automatic",
      status: result.status,
      userId: report.psychologist_id,
      notificationId: report.notification_id,
      triggerKey: WEEKLY_WHATSAPP_KEY,
      failureReason: result.failureReason,
      sentAt: result.status === "sent" ? now : null,
    });
  }
}
