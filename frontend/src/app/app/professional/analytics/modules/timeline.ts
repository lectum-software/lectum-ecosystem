import type {
  AnalyticsTimeline,
  PsychologistAnalyticsPeriod,
} from "@/api/generator/types/psychologist-analytics";
export const dayLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
export function timelineDates(timeline: AnalyticsTimeline, period?: PsychologistAnalyticsPeriod) {
  const observed = [...new Set(timeline.series.flatMap((s) => s.points.map((p) => p.date)))].sort();
  if (timeline.granularity === "week") return observed;
  const localDay = (date: string) =>
    new Date(new Date(date).getTime() - 10800000).toISOString().slice(0, 10);
  const end = period ? localDay(period.end_at) : observed.at(-1);
  const start = period && period.key !== "all" ? localDay(period.start_at) : (observed[0] ?? end);
  if (!start || !end) return [];
  const dates: string[] = [];
  for (
    let day = new Date(`${start}T12:00:00Z`);
    day.toISOString().slice(0, 10) <= end;
    day.setUTCDate(day.getUTCDate() + 1)
  )
    dates.push(day.toISOString().slice(0, 10));
  return dates;
}
export const pointerDayIndex = (clientX: number, left: number, width: number, count: number) =>
  Math.max(
    0,
    Math.min(count - 1, Math.round(((clientX - left) / Math.max(1, width)) * (count - 1))),
  );

export const WHATSAPP_ORIGIN_COLORS: Record<string, string> = {
  presentation_video: "var(--lectum-primary)",
  communities: "var(--lectum-success)",
  profile: "var(--lectum-warning)",
  favorites: "var(--lectum-primary-strong)",
};
