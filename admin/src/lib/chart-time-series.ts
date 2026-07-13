const MS_PER_DAY = 86_400_000;

const dateOnlyFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "UTC",
});

const chartMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: "UTC",
});

export type CalendarChartGranularity = "day" | "month";
export type CalendarMetricAggregation = "last" | "sum";
export type CalendarChartPoint<K extends string> = Record<K, number> & {
  chartLabel: string;
  date: string;
  tooltipLabel: string;
};

export type SvgChartPoint = {
  x: number;
  y: number;
};

type AggregateCalendarChartOptions<K extends string> = {
  /**
   * Curto o suficiente para leitura por dia; acima disso o gráfico é consolidado por mês.
   */
  dayThreshold?: number;
  metricAggregations?: Partial<Record<K, CalendarMetricAggregation>>;
};

const toChartDateKey = (date: Date) => date.toISOString().slice(0, 10);

const addChartDays = (date: Date, days: number) => new Date(date.getTime() + days * MS_PER_DAY);

export const parseCalendarChartDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatCalendarShortDate = (date: Date) =>
  `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}`;

export const formatCalendarTooltipDate = (date: Date | string) => {
  const parsed = typeof date === "string" ? parseCalendarChartDate(date) : date;

  return parsed ? dateOnlyFormatter.format(parsed) : String(date);
};

const formatCalendarMonth = (date: Date) => {
  const month = chartMonthFormatter.format(date).replace(".", "");

  return month.charAt(0).toUpperCase() + month.slice(1);
};

export const formatCalendarMonthLabel = (date: Date) =>
  `${formatCalendarMonth(date)}/${date.getUTCFullYear()}`;

const createEmptyCalendarChartPoint = <K extends string>(
  metricKeys: readonly K[],
  date: string,
  chartLabel: string,
  tooltipLabel: string,
): CalendarChartPoint<K> => {
  const point = {
    chartLabel,
    date,
    tooltipLabel,
  } as CalendarChartPoint<K>;
  const metricPoint = point as Record<K, number>;

  for (const key of metricKeys) {
    metricPoint[key] = 0;
  }

  return point;
};

const applyMetricValue = <T extends { date: string }, K extends Extract<keyof T, string>>(
  target: CalendarChartPoint<K>,
  source: T,
  key: K,
  aggregation: CalendarMetricAggregation,
) => {
  const value = Number(source[key] ?? 0);
  const metricTarget = target as Record<K, number>;

  metricTarget[key] = aggregation === "last" ? value : Number(metricTarget[key] ?? 0) + value;
};

const getMonthBucket = (date: Date, firstDate: Date, lastDate: Date) => {
  const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  const monthEnd = addChartDays(nextMonthStart, -1);
  const visibleStart = monthStart < firstDate ? firstDate : monthStart;
  const visibleEnd = monthEnd > lastDate ? lastDate : monthEnd;
  const key = toChartDateKey(monthStart);

  return {
    chartLabel: formatCalendarMonthLabel(monthStart),
    date: key,
    key,
    tooltipLabel: `${formatCalendarMonthLabel(monthStart)} · ${formatCalendarTooltipDate(
      visibleStart,
    )} – ${formatCalendarTooltipDate(visibleEnd)}`,
  };
};

const getDayBucket = (date: Date) => {
  const key = toChartDateKey(date);

  return {
    chartLabel: formatCalendarShortDate(date),
    date: key,
    key,
    tooltipLabel: formatCalendarTooltipDate(date),
  };
};

export const aggregateCalendarChartPoints = <
  T extends { date: string },
  K extends Extract<keyof T, string>,
>(
  points: readonly T[],
  metricKeys: readonly K[],
  options: AggregateCalendarChartOptions<K> = {},
): CalendarChartPoint<K>[] => {
  const parsedPoints = points.flatMap((point) => {
    const date = parseCalendarChartDate(point.date);

    return date ? [{ date, point }] : [];
  });

  if (parsedPoints.length !== points.length || parsedPoints.length === 0) {
    return points.map((point) => {
      const date = parseCalendarChartDate(point.date);
      const item = createEmptyCalendarChartPoint(
        metricKeys,
        point.date,
        date ? formatCalendarShortDate(date) : point.date,
        date ? formatCalendarTooltipDate(date) : point.date,
      );

      for (const key of metricKeys) {
        applyMetricValue(item, point, key, options.metricAggregations?.[key] ?? "sum");
      }

      return item;
    });
  }

  const sortedPoints = [...parsedPoints].sort(
    (left, right) => left.date.getTime() - right.date.getTime(),
  );
  const firstDate = sortedPoints[0].date;
  const lastDate = sortedPoints.at(-1)?.date ?? firstDate;
  const spanDays = Math.max(
    1,
    Math.round((lastDate.getTime() - firstDate.getTime()) / MS_PER_DAY) + 1,
  );
  const granularity: CalendarChartGranularity =
    spanDays <= (options.dayThreshold ?? 31) ? "day" : "month";
  const bucketMap = new Map<string, CalendarChartPoint<K>>();

  for (const { date, point } of sortedPoints) {
    const bucket =
      granularity === "day" ? getDayBucket(date) : getMonthBucket(date, firstDate, lastDate);
    const existing =
      bucketMap.get(bucket.key) ??
      createEmptyCalendarChartPoint(
        metricKeys,
        bucket.date,
        bucket.chartLabel,
        bucket.tooltipLabel,
      );

    for (const key of metricKeys) {
      applyMetricValue(existing, point, key, options.metricAggregations?.[key] ?? "sum");
    }

    bucketMap.set(bucket.key, existing);
  }

  return [...bucketMap.values()];
};

const formatSvgCoordinate = (value: number) => {
  if (!Number.isFinite(value)) return "0";

  return Number(value.toFixed(2)).toString();
};

const getSvgControlPoint = (
  current: SvgChartPoint,
  previous: SvgChartPoint | undefined,
  next: SvgChartPoint | undefined,
  reverse: boolean,
) => {
  const smoothing = 0.18;
  const previousPoint = previous ?? current;
  const nextPoint = next ?? current;
  const length = Math.hypot(nextPoint.x - previousPoint.x, nextPoint.y - previousPoint.y);
  const angle =
    Math.atan2(nextPoint.y - previousPoint.y, nextPoint.x - previousPoint.x) +
    (reverse ? Math.PI : 0);

  return {
    x: current.x + Math.cos(angle) * length * smoothing,
    y: current.y + Math.sin(angle) * length * smoothing,
  };
};

export const buildSmoothSvgPath = (points: readonly SvgChartPoint[]) => {
  if (points.length === 0) return "";

  const firstPoint = points[0];
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const clampPoint = (point: SvgChartPoint) => ({
    x: Math.min(maxX, Math.max(minX, point.x)),
    y: Math.min(maxY, Math.max(minY, point.y)),
  });

  if (points.length === 1) {
    return `M${formatSvgCoordinate(firstPoint.x)},${formatSvgCoordinate(firstPoint.y)}`;
  }

  return points.reduce((path, point, index, allPoints) => {
    if (index === 0) {
      return `M${formatSvgCoordinate(point.x)},${formatSvgCoordinate(point.y)}`;
    }

    const previousPoint = allPoints[index - 1];
    const startControlPoint = clampPoint(
      getSvgControlPoint(previousPoint, allPoints[index - 2], point, false),
    );
    const endControlPoint = clampPoint(
      getSvgControlPoint(point, previousPoint, allPoints[index + 1], true),
    );

    return `${path} C${formatSvgCoordinate(startControlPoint.x)},${formatSvgCoordinate(
      startControlPoint.y,
    )} ${formatSvgCoordinate(endControlPoint.x)},${formatSvgCoordinate(
      endControlPoint.y,
    )} ${formatSvgCoordinate(point.x)},${formatSvgCoordinate(point.y)}`;
  }, "");
};
