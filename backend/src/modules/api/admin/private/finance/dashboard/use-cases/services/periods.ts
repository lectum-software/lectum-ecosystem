import { resolveCalendarPeriod } from "@/utils/date-range";
import type {
  AdminFinanceDateRange,
  AdminFinanceGroupBy,
  AdminFinancePeriod,
  AdminFinanceQuery,
} from "../../DTOs/IAdminFinanceDashboardDTO";
import {
  endOfFinanceDate,
  endOfFinanceMonth,
  FINANCE_TIMEZONE,
  financeCalendar,
  toFinanceDateKey,
} from "./finance-calendar";

export {
  addFinanceDays,
  endOfFinanceDate,
  FINANCE_TIMEZONE,
  parseFinanceDateOnly,
  startOfFinanceDate,
  toFinanceDateKey,
} from "./finance-calendar";

export const DEFAULT_PERIOD_DAYS = 30;
export const MAX_PERIOD_DAYS = 3660;
export const resolveGroupBy = (
  value: AdminFinanceQuery["groupBy"],
  days: number,
): AdminFinanceGroupBy => {
  if (value === "month" || value === "week") return value;
  if (days > 180) return "month";
  if (days > 62) return "week";
  return "day";
};

export type FinancePeriodResolution = {
  current: AdminFinanceDateRange;
  days: number;
  groupBy: AdminFinanceGroupBy;
  period: AdminFinancePeriod;
  previous: AdminFinanceDateRange;
};
export type PeriodResult =
  | { period: FinancePeriodResolution; success: true }
  | { code: string; success: false };

export const resolveAdminFinancePeriod = (
  query: AdminFinanceQuery,
  allPeriodStartDate?: Date | null,
  now?: Date,
): PeriodResult => {
  const observedNow = now ?? new Date();
  const resolved = resolveCalendarPeriod(query, {
    allPeriodStartDate,
    calendar: financeCalendar,
    clampFutureAllStart: true,
    defaultDays: DEFAULT_PERIOD_DAYS,
    maxDays: MAX_PERIOD_DAYS,
    now: observedNow,
  });
  if (!resolved || resolved.end > endOfFinanceDate(observedNow))
    return { code: "invalid_analytics_date_range", success: false };
  const { days, end, label, previousEnd, previousStart, start } = resolved;
  const groupBy = resolveGroupBy(query.groupBy, days);
  return {
    period: {
      current: { end, start },
      days,
      groupBy,
      period: {
        days,
        from: toFinanceDateKey(start),
        group_by: groupBy,
        label,
        max_days: MAX_PERIOD_DAYS,
        previous_from: toFinanceDateKey(previousStart),
        previous_to: toFinanceDateKey(previousEnd),
        timezone: FINANCE_TIMEZONE,
        to: toFinanceDateKey(end),
      },
      previous: { end: previousEnd, start: previousStart },
    },
    success: true,
  };
};

export type Bucket = {
  end: Date;
  end_date: string;
  start: Date;
  start_date: string;
};
export const endOfMonth = endOfFinanceMonth;
export const minDate = (left: Date, right: Date) => (left < right ? left : right);
export const maxDate = (left: Date, right: Date) => (left > right ? left : right);

export const buildBuckets = (
  range: AdminFinanceDateRange,
  groupBy: AdminFinanceGroupBy,
): Bucket[] => {
  const buckets: Bucket[] = [];
  const { addDays, endOfDate, startOfDate, startOfMonth } = financeCalendar;
  let cursor = startOfDate(range.start);
  while (cursor <= range.end) {
    let bucketStart = cursor;
    let bucketEnd: Date;
    if (groupBy === "week") bucketEnd = endOfDate(addDays(bucketStart, 6));
    else if (groupBy === "month") {
      bucketStart = maxDate(startOfMonth(cursor), startOfDate(range.start));
      bucketEnd = endOfMonth(cursor);
    } else bucketEnd = endOfDate(cursor);
    const clippedEnd = minDate(bucketEnd, range.end);
    const clippedStart = maxDate(bucketStart, range.start);
    buckets.push({
      end: clippedEnd,
      end_date: toFinanceDateKey(clippedEnd),
      start: clippedStart,
      start_date: toFinanceDateKey(clippedStart),
    });
    cursor = addDays(clippedEnd, 1);
  }
  return buckets;
};
