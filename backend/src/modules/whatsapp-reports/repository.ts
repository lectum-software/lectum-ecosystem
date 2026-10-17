import prisma from "@/infra/database/prisma";
import { previousWhatsappWeek, reportDates, validAcquiredCount } from "./policy";

const owned = (userId: string, id?: string) => ({
  psychologist_id: userId,
  deleted: false,
  ...(id ? { id } : {}),
});

export const reportView = (report: {
  id: string;
  week_start: Date;
  week_end: Date;
  people_count: number;
  acquired_count: number | null;
  answered_at: Date | null;
}) => ({
  id: report.id,
  ...reportDates(report.week_start, report.week_end),
  week_start: report.week_start,
  week_end: report.week_end,
  people_count: report.people_count,
  acquired_count: report.acquired_count,
  answered_at: report.answered_at,
});

export async function getWhatsappReport(userId: string, id: string) {
  const report = await prisma.professional_whatsapp_week.findFirst({ where: owned(userId, id) });
  return report ? reportView(report) : null;
}

export async function latestWhatsappReport(userId: string, now = new Date()) {
  const week = previousWhatsappWeek(now);
  if (now < week.availableAt) return null;
  const report = await prisma.professional_whatsapp_week.findFirst({
    where: {
      ...owned(userId),
      week_start: week.start,
      available_at: { lte: now },
      auto_opened_at: null,
      answered_at: null,
    },
  });
  return report ? reportView(report) : null;
}

export async function openWhatsappReport(
  userId: string,
  id: string,
  automatic: boolean,
  now = new Date(),
) {
  const week = previousWhatsappWeek(now);
  const changed = await prisma.professional_whatsapp_week.updateMany({
    where: {
      ...owned(userId, id),
      ...(automatic
        ? {
            week_start: week.start,
            available_at: { lte: now },
            auto_opened_at: null,
            answered_at: null,
          }
        : {}),
    },
    data: { auto_opened_at: now },
  });
  return changed.count ? getWhatsappReport(userId, id) : null;
}

export async function answerWhatsappReport(userId: string, id: string, count: unknown) {
  return prisma.$transaction(async (tx) => {
    const report = await tx.professional_whatsapp_week.findFirst({ where: owned(userId, id) });
    if (!report) return { kind: "missing" as const };
    if (!validAcquiredCount(count, report.people_count)) return { kind: "invalid" as const };
    const now = new Date();
    const updated = await tx.professional_whatsapp_week.update({
      where: { id: report.id },
      data: { acquired_count: count, answered_at: now, auto_opened_at: now },
    });
    await tx.notification.update({
      where: { id: report.notification_id },
      data: { read: true, seen_at: now },
    });
    await tx.notification_delivery.updateMany({
      where: {
        notification_id: report.notification_id,
        user_id: userId,
        channel: "in_app",
        deleted: false,
      },
      data: { status: "read", read_at: now },
    });
    return { kind: "ok" as const, data: reportView(updated) };
  });
}
