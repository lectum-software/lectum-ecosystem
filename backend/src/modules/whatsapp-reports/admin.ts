import prisma from "@/infra/database/prisma";
import { acquiredPatientsSummary } from "./counts";
import { reportView } from "./repository";

export async function adminWhatsappReports(psychologistId: string, from: string, to: string) {
  const start = new Date(`${from}T00:00:00.000-03:00`);
  const end = new Date(`${to}T23:59:59.999-03:00`);
  const where = {
    psychologist_id: psychologistId,
    deleted: false,
    week_end: { gt: start, lte: new Date(end.getTime() + 1) },
  };
  const [summary, totalWeeks, weeks] = await Promise.all([
    acquiredPatientsSummary(psychologistId, start, end),
    prisma.professional_whatsapp_week.count({ where }),
    prisma.professional_whatsapp_week.findMany({
      where,
      orderBy: { week_start: "desc" },
      take: 104,
    }),
  ]);
  return {
    ...summary,
    answered_weeks: totalWeeks - summary.unanswered_weeks,
    total_weeks: totalWeeks,
    source: "psychologist_reported" as const,
    weeks: weeks.map(reportView),
  };
}
