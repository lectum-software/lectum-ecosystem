/**
 * Operações de calendário no fuso local do processo.
 *
 * Os painéis administrativos já trabalham com períodos no fuso do servidor;
 * estas funções apenas centralizam essa regra sem converter datas para UTC.
 */
const MILLISECONDS_PER_DAY = 86_400_000;

const pad = (value: number) => String(value).padStart(2, "0");

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const startOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const endOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

export const startOfWeek = (date: Date) => {
  const next = startOfDate(date);
  const day = next.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  return addDays(next, -daysSinceMonday);
};

export const startOfMonth = (date: Date) =>
  startOfDate(new Date(date.getFullYear(), date.getMonth(), 1));

export const startOfYear = (date: Date) => startOfDate(new Date(date.getFullYear(), 0, 1));

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseDateOnly = (value: string | undefined, boundary: "end" | "start") => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return boundary === "start" ? startOfDate(date) : endOfDate(date);
};

const calendarDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

export const daysBetweenInclusive = (from: Date, to: Date) =>
  Math.floor((calendarDay(to) - calendarDay(from)) / MILLISECONDS_PER_DAY) + 1;

export const buildDateLabels = (from: Date, days: number) =>
  Array.from({ length: days }, (_, index) => toDateKey(addDays(from, index)));

const CALENDAR_PERIOD_PRESETS = new Set([
  "7d",
  "30d",
  "90d",
  "all",
  "custom",
  "month",
  "today",
  "week",
  "year",
]);

type CalendarPeriodQuery = {
  from?: string;
  period?: null | string;
  to?: string;
};

type CalendarPeriodPreset =
  | "7d"
  | "30d"
  | "90d"
  | "all"
  | "custom"
  | "month"
  | "today"
  | "week"
  | "year";

type ResolveCalendarPeriodOptions = {
  allPeriodStartDate?: Date | null;
  clampFutureAllStart?: boolean;
  defaultDays: number;
  defaultPreset?: "all";
  maxDays: number | ((preset: CalendarPeriodPreset | null) => number);
  now?: Date;
};

export type ResolvedCalendarPeriod = {
  days: number;
  end: Date;
  label: string;
  maxDays: number;
  preset: CalendarPeriodPreset | null;
  previousEnd: Date;
  previousStart: Date;
  start: Date;
};

const fixedDayPreset = (preset: CalendarPeriodPreset | null) => {
  if (preset === "7d") return 7;
  if (preset === "30d") return 30;
  if (preset === "90d") return 90;
  return null;
};

export const resolveCalendarPeriod = (
  query: CalendarPeriodQuery = {},
  options: ResolveCalendarPeriodOptions,
): ResolvedCalendarPeriod | null => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  const rawPreset =
    query.period || (hasCustomFrom || hasCustomTo ? "custom" : (options.defaultPreset ?? null));
  if (rawPreset && !CALENDAR_PERIOD_PRESETS.has(rawPreset)) return null;

  const preset = rawPreset as CalendarPeriodPreset | null;
  const today = options.now ? new Date(options.now) : new Date();
  let start: Date;
  let end: Date;
  let label = `Últimos ${options.defaultDays} dias`;

  if (preset === "custom") {
    if (!hasCustomFrom || !hasCustomTo) return null;

    const customStart = parseDateOnly(query.from, "start");
    const customEnd = parseDateOnly(query.to, "end");
    if (!customStart || !customEnd || customStart > customEnd) return null;

    start = customStart;
    end = customEnd;
    label = "Período personalizado";
  } else if (preset === "today") {
    start = startOfDate(today);
    end = endOfDate(today);
    label = "Hoje";
  } else if (preset === "week") {
    start = startOfWeek(today);
    end = endOfDate(today);
    label = "Esta semana";
  } else if (preset === "month") {
    start = startOfMonth(today);
    end = endOfDate(today);
    label = "Este mês";
  } else if (preset === "year") {
    start = startOfYear(today);
    end = endOfDate(today);
    label = "Este ano";
  } else if (preset === "all") {
    start = startOfDate(options.allPeriodStartDate ?? addDays(today, -(options.defaultDays - 1)));
    end = endOfDate(today);
    if (options.clampFutureAllStart && start > end) start = startOfDate(today);
    label = "Todo o período";
  } else {
    const days = fixedDayPreset(preset) ?? options.defaultDays;
    start = startOfDate(addDays(today, -(days - 1)));
    end = endOfDate(today);
    if (preset) label = `Últimos ${days} dias`;
  }

  const days = daysBetweenInclusive(start, end);
  const maxDays = typeof options.maxDays === "function" ? options.maxDays(preset) : options.maxDays;
  if (days < 1 || days > maxDays) return null;

  return {
    days,
    end,
    label,
    maxDays,
    preset,
    previousEnd: endOfDate(addDays(start, -1)),
    previousStart: startOfDate(addDays(start, -days)),
    start,
  };
};
