import prisma from "@/infra/database/prisma";

// Unknown legacy visitors remain separate: their identity cannot be reconstructed.
export async function whatsappPeopleCounts(
  start: Date,
  endExclusive: Date,
  psychologistId?: string,
) {
  return prisma.$queryRaw<Array<{ psychologist_id: string; people_count: number }>>`
    SELECT c.psychologist_id,
      COUNT(DISTINCT COALESCE('user:' || c.user_id, 'visitor:' || c.visitor_key, 'legacy:' || c.id))::int AS people_count
    FROM contact_requests c
    JOIN users u ON u.id = c.psychologist_id
    WHERE c.deleted = false AND c.channel = 'whatsapp'
      AND c.created_at >= ${start} AND c.created_at < ${endExclusive}
      AND (c.user_id IS NULL OR c.user_id <> c.psychologist_id)
      AND u.deleted = false AND u.active = true AND u.role = 'psicologo'
      AND (${psychologistId ?? null}::text IS NULL OR c.psychologist_id = ${psychologistId ?? null})
    GROUP BY c.psychologist_id
  `;
}

export async function acquiredPatientsSummary(psychologistId: string, start: Date, end: Date) {
  const weeks = await prisma.professional_whatsapp_week.findMany({
    where: {
      psychologist_id: psychologistId,
      deleted: false,
      week_end: { gt: start, lte: new Date(end.getTime() + 1) },
    },
    select: { acquired_count: true },
  });
  const answered = weeks.filter((week) => week.acquired_count !== null);
  return {
    acquired_patients: answered.length
      ? answered.reduce((sum, week) => sum + (week.acquired_count ?? 0), 0)
      : null,
    unanswered_weeks: weeks.length - answered.length,
  };
}
