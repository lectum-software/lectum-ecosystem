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
  unknown: "var(--lectum-muted)",
  presentation_video: "var(--lectum-primary)",
  communities: "var(--lectum-success)",
  profile: "var(--lectum-warning)",
  favorites: "var(--lectum-primary-strong)",
};

export const timelineSeries = (timeline: AnalyticsTimeline) =>
  timeline.series
    .filter(
      (series) =>
        series.id !== "unknown" ||
        (series.total ?? 0) > 0 ||
        series.points.some((point) => point.value > 0),
    )
    .map((series) => ({
      ...series,
      label: series.id === "favorites" ? "Favoritos" : series.label,
      total: series.total ?? series.points.reduce((sum, point) => sum + point.value, 0),
    }));

export function timelineValues(timeline: AnalyticsTimeline, period?: PsychologistAnalyticsPeriod) {
  const dates = timelineDates(timeline, period);
  const series = timelineSeries(timeline);
  const values = series.map((series) => {
    const points = new Map(series.points.map((point) => [point.date, point.value]));
    return dates.map((date) => points.get(date) ?? 0);
  });
  return {
    dates,
    series,
    values,
    totals: dates.map((_, index) => values.reduce((sum, points) => sum + points[index], 0)),
  };
}

export type ChartPoint = { x: number; y: number };

// Bounded monotone tangents keep the cubic controls between adjacent observations.
export function smoothTimelinePath(points: ChartPoint[]) {
  if (!points.length) return "";
  const slopes = points
    .slice(1)
    .map((point, index) => (point.y - points[index].y) / (point.x - points[index].x));
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0] ?? 0;
    if (index === points.length - 1) return slopes[index - 1];
    const before = slopes[index - 1],
      after = slopes[index];
    return before * after <= 0
      ? 0
      : Math.sign(before) * Math.min(Math.abs(before), Math.abs(after));
  });
  let path = `M ${points[0].x},${points[0].y}`;
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1],
      point = points[index];
    const third = (point.x - previous.x) / 3;
    path += ` C ${previous.x + third},${previous.y + third * tangents[index - 1]} ${point.x - third},${point.y - third * tangents[index]} ${point.x},${point.y}`;
  }
  return path;
}
