import type { CalendarOperations } from "@/utils/date-range";

export const FINANCE_TIMEZONE = "America/Sao_Paulo";
const DAY_MS = 86_400_000;
const formatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  second: "2-digit",
  timeZone: FINANCE_TIMEZONE,
  year: "numeric",
});

const civilParts = (date: Date) => {
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return {
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    month: Number(parts.month),
    second: Number(parts.second),
    year: Number(parts.year),
  };
};

// A UTC carrier holds civil components, never a server-local Date constructor.
const civilDate = (year: number, month: number, day: number) => {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};
const civilDay = (date: Date) => {
  const { year, month, day } = civilParts(date);
  return civilDate(year, month, day);
};
const key = (year: number, month: number, day: number) =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export const toFinanceDateKey = (date: Date) => {
  const { year, month, day } = civilParts(date);
  return key(year, month, day);
};

const startOfCivilDay = (date: Date) => {
  const target = date.getTime();
  let candidate = target;
  for (let index = 0; index < 4; index++) {
    const parts = civilParts(new Date(candidate));
    const observed = civilDate(parts.year, parts.month, parts.day);
    observed.setUTCHours(parts.hour, parts.minute, parts.second, 0);
    const delta = observed.getTime() - target;
    if (delta === 0) return new Date(candidate);
    candidate -= delta;
  }

  // Historic São Paulo DST skipped midnight. Use the first instant of that
  // civil day instead of inventing a fixed -03:00 offset or dropping the day.
  const targetKey = key(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  let low = target - DAY_MS;
  let high = target + DAY_MS;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (toFinanceDateKey(new Date(middle)) < targetKey) low = middle + 1;
    else high = middle;
  }
  return new Date(low);
};

export const startOfFinanceDate = (date: Date) => startOfCivilDay(civilDay(date));
export const addFinanceDays = (date: Date, days: number) => {
  const civil = civilDay(date);
  civil.setUTCDate(civil.getUTCDate() + days);
  return startOfCivilDay(civil);
};
export const endOfFinanceDate = (date: Date) => new Date(addFinanceDays(date, 1).getTime() - 1);
const startOfFinanceMonth = (date: Date) => {
  const civil = civilDay(date);
  civil.setUTCDate(1);
  return startOfCivilDay(civil);
};
export const endOfFinanceMonth = (date: Date) => {
  const civil = civilDay(date);
  civil.setUTCMonth(civil.getUTCMonth() + 1, 1);
  return new Date(startOfCivilDay(civil).getTime() - 1);
};

export const parseFinanceDateOnly = (value: string | undefined, boundary: "end" | "start") => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = civilDate(year, month, day);
  if (
    year < 1 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  )
    return null;
  const start = startOfCivilDay(date);
  return boundary === "start" ? start : endOfFinanceDate(start);
};

export const financeCalendar: CalendarOperations = {
  addDays: addFinanceDays,
  daysBetweenInclusive: (from, to) =>
    Math.floor((civilDay(to).getTime() - civilDay(from).getTime()) / DAY_MS) + 1,
  endOfDate: endOfFinanceDate,
  parseDateOnly: parseFinanceDateOnly,
  startOfDate: startOfFinanceDate,
  startOfMonth: startOfFinanceMonth,
  startOfWeek: (date) => {
    const civil = civilDay(date);
    const weekday = civil.getUTCDay();
    civil.setUTCDate(civil.getUTCDate() - (weekday === 0 ? 6 : weekday - 1));
    return startOfCivilDay(civil);
  },
  startOfYear: (date) => startOfCivilDay(civilDate(civilParts(date).year, 1, 1)),
  toDateKey: toFinanceDateKey,
};
