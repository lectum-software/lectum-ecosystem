import type { PsychologistAnalyticsPeriod } from "../../DTOs/IAnalyticsDTO";

// Inclusive millisecond windows have equal duration and never overlap.
export function previousAnalyticsPeriod(period: PsychologistAnalyticsPeriod) {
  if (period.key === "all") return null;
  const duration = period.end_at.getTime() - period.start_at.getTime() + 1;
  if (!Number.isFinite(duration) || duration <= 0) return null;
  return {
    start_at: new Date(period.start_at.getTime() - duration),
    end_at: new Date(period.start_at.getTime() - 1),
  };
}
