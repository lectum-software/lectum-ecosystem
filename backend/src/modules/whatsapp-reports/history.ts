import prisma from "@/infra/database/prisma";
import { whatsappPeopleCounts } from "./counts";
import {
  editableWhatsappWeek,
  parseWhatsappWeek,
  previousWhatsappWeek,
  reportDates,
  validAcquiredCount,
  WHATSAPP_WEEK_MS,
} from "./policy";
import { markWhatsappNotificationRead, reportView } from "./repository";

const PAGE_SIZE = 12;

export async function whatsappReportHistory(userId: string, page = 0, now = new Date()) {
  const current = previousWhatsappWeek(now).end;
  const earliestEditable = new Date(current.getTime() - 4 * WHATSAPP_WEEK_MS);
  const where = { psychologist_id: userId, deleted: false, week_start: { lt: earliestEditable } };
  const [archived, total] = await Promise.all([
    prisma.professional_whatsapp_week.findMany({
      where,
      orderBy: { week_start: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.professional_whatsapp_week.count({ where }),
  ]);
  const recent =
    page === 0
      ? await Promise.all(
          Array.from({ length: 5 }, async (_, index) => {
            const start = new Date(current.getTime() - index * WHATSAPP_WEEK_MS);
            const end = new Date(start.getTime() + WHATSAPP_WEEK_MS);
            const [report, people] = await Promise.all([
              prisma.professional_whatsapp_week.findUnique({
                where: {
                  psychologist_id_week_start: { psychologist_id: userId, week_start: start },
                },
              }),
              whatsappPeopleCounts(start, end, userId),
            ]);
            return {
              id: report && !report.deleted ? report.id : null,
              ...reportDates(start, end),
              week_start: start,
              week_end: end,
              people_count: people[0]?.people_count ?? 0,
              acquired_count: report && !report.deleted ? report.acquired_count : null,
              answered_at: report && !report.deleted ? report.answered_at : null,
              editable: !report?.deleted,
            };
          }),
        )
      : [];
  return {
    weeks: [...recent, ...archived.map(reportView)],
    next_page: (page + 1) * PAGE_SIZE < total ? page + 1 : null,
  };
}

export async function saveWhatsappWeek(
  userId: string,
  date: string,
  count: unknown,
  now = new Date(),
) {
  const start = parseWhatsappWeek(date);
  if (!start || !editableWhatsappWeek(start, now)) return { kind: "closed" as const };
  const end = new Date(start.getTime() + WHATSAPP_WEEK_MS);
  const people = (await whatsappPeopleCounts(start, end, userId))[0]?.people_count ?? 0;
  if (!validAcquiredCount(count, people)) return { kind: "invalid" as const };
  return prisma.$transaction(async (tx) => {
    const key = { psychologist_id: userId, week_start: start };
    const existing = await tx.professional_whatsapp_week.findUnique({
      where: { psychologist_id_week_start: key },
    });
    if (existing?.deleted) return { kind: "missing" as const };
    const data = {
      people_count: people,
      acquired_count: count,
      answered_at: now,
      auto_opened_at: now,
    };
    const report = await tx.professional_whatsapp_week.upsert({
      where: { psychologist_id_week_start: key },
      create: {
        ...key,
        ...data,
        week_end: end,
        available_at: new Date(end.getTime() + 9 * 3600000),
        push_status: "skipped",
      },
      update: data,
    });
    await markWhatsappNotificationRead(tx, report.notification_id, userId, now);
    return { kind: "ok" as const, data: reportView(report) };
  });
}
