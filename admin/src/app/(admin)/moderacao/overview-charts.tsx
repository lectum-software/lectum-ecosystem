import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  Eye,
  Flag,
  type LucideIcon,
  ShieldAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import type { AdminModerationReportChartType, AdminModerationSummary } from "@/api/req/moderation";
import {
  aggregateCalendarChartPoints,
  buildSmoothSvgPath,
  parseCalendarChartDate,
} from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";
const numberFormatter = new Intl.NumberFormat("pt-BR");
const overviewDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

const categoryLabels: Record<string, string> = {
  abuse_violence: "Abuso/violência",
  explicit_sexual: "Sexual explícito",
  external_link: "Link externo",
  minor_sexual_risk: "Menor/risco sexual",
  other: "Outro",
  self_harm_suicide: "Autolesão/suicídio",
  sexual_health: "Saúde sexual",
  spam_scam: "Spam/golpe",
};

type ModerationChartPoint = {
  date: string;
  [key: string]: unknown;
};

type ModerationChartMetric = {
  color: string;
  icon: LucideIcon;
  key: string;
  label: string;
};

type OverviewPeriodPreset = "7d" | "30d" | "90d" | "all" | "month" | "today" | "week" | "year";
type OverviewPeriodValue = OverviewPeriodPreset | "custom";
type OverviewRange = {
  from: string;
  to: string;
};

const REPORT_TOTAL_KEY = "total_reports";

const reportTypeOptions = [
  ["all", "Todos"],
  ["psychologist_posts", "Posts de psicólogos"],
  ["patient_posts", "Posts de pacientes"],
  ["psychologist_replies", "Respostas de psicólogos"],
  ["patient_comments", "Comentários de pacientes"],
] as const satisfies readonly (readonly [AdminModerationReportChartType, string])[];

const overviewPeriodOptions = [
  ["all", "Todo o período"],
  ["today", "Hoje"],
  ["week", "Esta semana"],
  ["7d", "Últimos 7 dias"],
  ["month", "Este mês"],
  ["30d", "Últimos 30 dias"],
  ["90d", "Últimos 90 dias"],
  ["year", "Este ano"],
] as const satisfies readonly (readonly [OverviewPeriodPreset, string])[];

const reportChartMetrics = [
  { color: "#0f2a52", icon: AlertTriangle, key: REPORT_TOTAL_KEY, label: "Total de denúncias" },
  { color: "#308ce8", icon: Flag, key: "pending", label: "Pendentes" },
  { color: "#16a34a", icon: X, key: "dismissed", label: "Improcedentes" },
  { color: "#e5484d", icon: CheckCircle2, key: "upheld", label: "Procedentes" },
] satisfies ModerationChartMetric[];

const complianceChartMetrics = [
  {
    color: "#f97316",
    icon: ShieldAlert,
    key: "professional_crp_pending",
    label: "CRP profissional pendente",
  },
  {
    color: "#e5484d",
    icon: AlertTriangle,
    key: "invalid_whatsapp",
    label: "WhatsApp inválido",
  },
] satisfies ModerationChartMetric[];

const operationalChartMetrics = [
  {
    color: "#308ce8",
    icon: Clock3,
    key: "patient_posts_without_coverage_48h",
    label: "Falta de cobertura há 48h",
  },
  {
    color: "#e5484d",
    icon: AlertTriangle,
    key: "registration_errors",
    label: "Erros no cadastro",
  },
  {
    color: "#8b5cf6",
    icon: ShieldAlert,
    key: "unpublished_required_settings",
    label: "Perfis profissionais sem configuração obrigatória",
  },
  {
    color: "#f59f00",
    icon: Eye,
    key: "psychologist_no_traction_after_adaptation",
    label: "Psicólogos assinantes sem tráfego",
  },
] satisfies ModerationChartMetric[];

const sensitiveContentChartMetrics = [
  { color: "#f59f00", icon: Eye, key: "allow_sensitive", label: "Sensível publicado" },
  { color: "#e5484d", icon: X, key: "block", label: "Bloqueado" },
  { color: "#b42318", icon: ShieldAlert, key: "safety_hold", label: "Segurança urgente" },
] satisfies ModerationChartMetric[];

const Card = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <section className={cn(cardClass, className)}>{children}</section>
);

const pad = (value: number) => String(value).padStart(2, "0");

const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const rawChartPointValue = (point: ModerationChartPoint, key: string) =>
  Number(point[key] ?? 0) || 0;

const reportTotalValue = (point: ModerationChartPoint) =>
  rawChartPointValue(point, "pending") +
  rawChartPointValue(point, "dismissed") +
  rawChartPointValue(point, "upheld");

const withDerivedMetricValues = (
  points: ModerationChartPoint[],
  metrics: ModerationChartMetric[],
) => {
  if (!metrics.some((metric) => metric.key === REPORT_TOTAL_KEY)) return points;

  return points.map((point) => ({
    ...point,
    [REPORT_TOTAL_KEY]: reportTotalValue(point),
  }));
};

const chartPointValue = (point: ModerationChartPoint, key: string) =>
  key === REPORT_TOTAL_KEY ? reportTotalValue(point) : rawChartPointValue(point, key);

const chartMetricValue = (points: ModerationChartPoint[], key: string) =>
  points.reduce((total, point) => total + chartPointValue(point, key), 0);

const overviewToday = () => toInputDate(new Date());

const getOverviewSourceRange = (points: ModerationChartPoint[]): OverviewRange => {
  const dates = points
    .map((point) => point.date)
    .filter((date) => parseCalendarChartDate(date))
    .sort((left, right) => left.localeCompare(right));

  if (dates.length === 0) {
    const today = overviewToday();

    return { from: today, to: today };
  }

  return { from: dates[0], to: dates.at(-1) ?? dates[0] };
};

const addOverviewDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);

  return next;
};

const startOfOverviewWeek = (date: Date) => {
  const day = date.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;

  return addOverviewDays(date, -offset);
};

const startOfOverviewMonth = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const startOfOverviewYear = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), 0, 1));

const dateToOverviewInput = (date: Date) => date.toISOString().slice(0, 10);

const getOverviewRangeForPeriod = (
  period: OverviewPeriodPreset,
  sourceRange: OverviewRange,
): OverviewRange => {
  if (period === "all") return sourceRange;

  const today = parseCalendarChartDate(overviewToday()) ?? new Date();
  const to = dateToOverviewInput(today);

  if (period === "today") return { from: to, to };
  if (period === "week") return { from: dateToOverviewInput(startOfOverviewWeek(today)), to };
  if (period === "month") return { from: dateToOverviewInput(startOfOverviewMonth(today)), to };
  if (period === "7d") return { from: dateToOverviewInput(addOverviewDays(today, -6)), to };
  if (period === "30d") return { from: dateToOverviewInput(addOverviewDays(today, -29)), to };
  if (period === "90d") return { from: dateToOverviewInput(addOverviewDays(today, -89)), to };

  return { from: dateToOverviewInput(startOfOverviewYear(today)), to };
};

const overviewPeriodLabel = (period: OverviewPeriodValue) => {
  if (period === "custom") return "Personalizado";

  return overviewPeriodOptions.find(([value]) => value === period)?.[1] ?? "Período";
};

const rangeIsValid = (range: OverviewRange) =>
  Boolean(range.from && range.to && range.from.localeCompare(range.to) <= 0);

const formatOverviewDate = (value: string) => {
  const parsed = parseCalendarChartDate(value);

  return parsed ? overviewDateFormatter.format(parsed) : value;
};

const formatOverviewPeriod = (
  period: OverviewPeriodValue,
  range: OverviewRange,
  hasPoints: boolean,
) => {
  if (!hasPoints) return "Sem pontos reais para exibir.";

  return `${overviewPeriodLabel(period)} · ${formatOverviewDate(
    range.from,
  )} a ${formatOverviewDate(range.to)}.`;
};

const filterChartPointsByRange = (points: ModerationChartPoint[], range: OverviewRange) => {
  if (!rangeIsValid(range)) return [];

  return points.filter((point) => point.date >= range.from && point.date <= range.to);
};

const OverviewSelect = ({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
  value: string;
}) => (
  <label className="grid min-w-0 gap-1 text-xs font-semibold text-muted sm:w-48 xl:w-48">
    {label}
    <span className="relative">
      <select
        className="h-10 w-full min-w-0 appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-9 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([id, optionLabel]) => (
          <option key={id} value={id}>
            {optionLabel}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
      />
    </span>
  </label>
);

const OverviewPeriodControls = ({
  onDateChange,
  onPeriodChange,
  period,
  range,
  rangeError,
  title,
}: {
  onDateChange: (field: "from" | "to", value: string) => void;
  onPeriodChange: (period: OverviewPeriodPreset) => void;
  period: OverviewPeriodValue;
  range: OverviewRange;
  rangeError: string | null;
  title: string;
}) => {
  const id = `moderation-period-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="flex w-full shrink-0 flex-col gap-2 xl:w-auto xl:items-end">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end xl:flex-nowrap">
        <label
          className="grid min-w-0 gap-1 text-xs font-semibold text-muted sm:w-44 xl:w-40"
          htmlFor={id}
        >
          Período
          <span className="relative">
            <select
              className="h-10 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-9 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              id={id}
              onChange={(event) => onPeriodChange(event.target.value as OverviewPeriodPreset)}
              value={period}
            >
              {period === "custom" ? (
                <option disabled hidden value="custom">
                  Personalizado
                </option>
              ) : null}
              {overviewPeriodOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
            />
          </span>
        </label>
        <div className="grid shrink-0 gap-2 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted sm:w-36 xl:w-32">
            De
            <input
              className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
              max={range.to}
              onChange={(event) => onDateChange("from", event.target.value)}
              type="date"
              value={range.from}
            />
          </label>
          <label className="text-xs font-semibold text-muted sm:w-36 xl:w-32">
            Até
            <input
              className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
              min={range.from}
              onChange={(event) => onDateChange("to", event.target.value)}
              type="date"
              value={range.to}
            />
          </label>
        </div>
      </div>
      {rangeError ? <p className="max-w-md text-xs font-bold text-danger">{rangeError}</p> : null}
    </div>
  );
};

const OverviewMetricCard = ({
  active,
  color,
  icon: Icon,
  label,
  onToggle,
  value,
}: {
  active: boolean;
  color: string;
  icon: LucideIcon;
  label: string;
  onToggle: () => void;
  value: number;
}) => {
  const formattedValue = numberFormatter.format(value);

  return (
    <button
      aria-pressed={active}
      className={cn(
        "min-h-[8.75rem] min-w-0 rounded-card border p-3 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:p-4 xl:min-h-[8.25rem] xl:p-3",
        active
          ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
          : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
      )}
      onClick={onToggle}
      title={`${label}: ${formattedValue}. ${active ? "Visível no gráfico" : "Oculto no gráfico"}`}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="grid h-9 w-9 place-items-center rounded-full xl:h-8 xl:w-8"
          style={{ backgroundColor: hexToRgba(color, 0.1), color }}
        >
          <Icon aria-hidden className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 min-w-0 space-y-1.5 xl:mt-3">
        <p
          className="truncate whitespace-nowrap text-xs font-semibold text-foreground"
          title={label}
        >
          {label}
        </p>
        <p className="flex min-w-0 items-baseline gap-1.5 overflow-hidden whitespace-nowrap text-2xl font-bold tracking-tight text-foreground xl:text-[1.65rem]">
          <span className="min-w-0 truncate">{formattedValue}</span>
        </p>
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
          <span className="whitespace-nowrap text-[0.68rem] font-semibold text-muted">
            dados reais
          </span>
          <span className="min-w-0 truncate text-[0.68rem] font-medium text-muted">
            por data de origem
          </span>
        </div>
        <span className="sr-only">{active ? "visível no gráfico" : "oculto no gráfico"}</span>
      </div>
    </button>
  );
};

const OverviewTimelineChart = ({
  ariaLabel,
  metrics,
  points,
  visibleMetricKeys,
}: {
  ariaLabel: string;
  metrics: ModerationChartMetric[];
  points: ModerationChartPoint[];
  visibleMetricKeys: string[];
}) => {
  const width = 1120;
  const height = 280;
  const padding = { bottom: 28, left: 42, right: 28, top: 28 };
  const series = metrics
    .filter((metric) => visibleMetricKeys.includes(metric.key))
    .map((metric) => ({ color: metric.color, key: metric.key }));

  if (series.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Selecione pelo menos um contador para visualizar a evolução.
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Nenhum ponto real de evolução foi encontrado para este período.
      </div>
    );
  }

  const metricKeys = metrics.map((metric) => metric.key);
  const sourcePoints = withDerivedMetricValues(points, metrics);
  const chartPoints = aggregateCalendarChartPoints(
    sourcePoints as ({ date: string } & Record<string, number>)[],
    metricKeys,
  );
  const maxValue = Math.max(
    1,
    ...chartPoints.flatMap((point) => series.map((item) => Number(point[item.key] ?? 0))),
  );
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = (index: number) =>
    padding.left +
    (chartPoints.length <= 1 ? chartWidth / 2 : (index * chartWidth) / (chartPoints.length - 1));
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio));
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));
  const dateLabels = chartPoints.flatMap((point, index) =>
    index % labelStep === 0 || index === chartPoints.length - 1
      ? [{ date: point.date, label: point.chartLabel }]
      : [],
  );

  return (
    <figure className="mt-4 w-full overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
      <div className="mx-auto w-full min-w-[760px] max-w-[1120px]">
        <svg
          aria-label={ariaLabel}
          className="block h-auto w-full"
          height={height}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
          width={width}
        >
          {gridValues.map((value) => {
            const y = getY(value);
            return (
              <g key={`moderation-grid-${value}-${y}`}>
                <line
                  opacity="0.58"
                  stroke="var(--admin-border)"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text fill="var(--admin-muted)" fontSize="11" fontWeight="500" x="8" y={y + 4}>
                  {numberFormatter.format(value)}
                </text>
              </g>
            );
          })}

          {series.map((item) => {
            const linePoints = chartPoints.map((point, index) => ({
              x: getX(index),
              y: getY(Number(point[item.key] ?? 0)),
            }));
            const path = buildSmoothSvgPath(linePoints);

            return (
              <g key={item.key}>
                <path
                  d={path}
                  fill="none"
                  opacity="0.88"
                  stroke={item.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.05"
                />
                {linePoints.map((point, index) => (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    fill="var(--admin-surface)"
                    key={`${item.key}-${chartPoints[index].date}`}
                    opacity={index === linePoints.length - 1 ? "1" : "0.72"}
                    r={index === linePoints.length - 1 ? "3.1" : "2.1"}
                    stroke={item.color}
                    strokeWidth="1.45"
                  />
                ))}
              </g>
            );
          })}
        </svg>
        <div
          className="mt-1 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${dateLabels.length}, 1fr)` }}
        >
          {dateLabels.map(({ date, label }) => (
            <span className="min-w-0 text-center text-[10px] font-bold text-subtle" key={date}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
};

const OverviewChartBlock = ({
  ariaLabel,
  href,
  metrics,
  points,
  selector,
  title,
}: {
  ariaLabel: string;
  href: string;
  metrics: ModerationChartMetric[];
  points: ModerationChartPoint[];
  selector?: ReactNode;
  title: string;
}) => {
  const [period, setPeriod] = useState<OverviewPeriodValue>("all");
  const [customRange, setCustomRange] = useState<OverviewRange>(() =>
    getOverviewSourceRange(points),
  );
  const [visibleMetricKeys, setVisibleMetricKeys] = useState<string[]>(() =>
    metrics.map((metric) => metric.key),
  );
  const sourceRange = useMemo(() => getOverviewSourceRange(points), [points]);
  const displayRange =
    period === "custom" ? customRange : getOverviewRangeForPeriod(period, sourceRange);
  const rangeError = rangeIsValid(displayRange)
    ? null
    : "Informe data inicial menor ou igual à final.";
  const visiblePoints = useMemo(
    () => filterChartPointsByRange(points, displayRange),
    [displayRange, points],
  );
  const activeMetricKeys = metrics
    .map((metric) => metric.key)
    .filter((key) => visibleMetricKeys.includes(key));
  const toggleMetric = (metricKey: string) => {
    setVisibleMetricKeys((current) => {
      if (!current.includes(metricKey)) return [...current, metricKey];

      const next = current.filter((item) => item !== metricKey);
      return next.length > 0 ? next : current;
    });
  };
  const handlePeriodChange = (nextPeriod: OverviewPeriodPreset) => {
    setPeriod(nextPeriod);
    setCustomRange(getOverviewRangeForPeriod(nextPeriod, sourceRange));
  };
  const handleDateChange = (field: "from" | "to", value: string) => {
    setPeriod("custom");
    setCustomRange({ ...displayRange, [field]: value });
  };

  return (
    <Card className="min-w-0 p-5 md:p-6">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">
            {formatOverviewPeriod(period, displayRange, points.length > 0)}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 xl:w-auto xl:items-end">
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end xl:w-auto xl:flex-nowrap xl:justify-end">
            {selector}
            <OverviewPeriodControls
              onDateChange={handleDateChange}
              onPeriodChange={handlePeriodChange}
              period={period}
              range={displayRange}
              rangeError={rangeError}
              title={title}
            />
            <Link
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-semibold text-foreground shadow-control transition hover:border-border-strong hover:text-primary"
              href={href}
            >
              <ExternalLink aria-hidden className="h-4 w-4" />
              Abrir lista
            </Link>
          </div>
        </div>
      </div>
      <fieldset
        className={cn(
          "mt-5 grid grid-cols-2 gap-3",
          metrics.length === 2
            ? "md:grid-cols-2"
            : metrics.length === 4
              ? "md:grid-cols-2 xl:grid-cols-4"
              : "md:grid-cols-3",
        )}
      >
        <legend className="sr-only">Contadores exibidos no gráfico de {title}</legend>
        {metrics.map((metric) => (
          <OverviewMetricCard
            active={activeMetricKeys.includes(metric.key)}
            color={metric.color}
            icon={metric.icon}
            key={metric.key}
            label={metric.label}
            onToggle={() => toggleMetric(metric.key)}
            value={chartMetricValue(visiblePoints, metric.key)}
          />
        ))}
      </fieldset>
      <OverviewTimelineChart
        ariaLabel={ariaLabel}
        metrics={metrics}
        points={visiblePoints}
        visibleMetricKeys={activeMetricKeys}
      />
    </Card>
  );
};

const chartPoints = <T extends { date: string }>(points: T[]): ModerationChartPoint[] =>
  points as ModerationChartPoint[];

const sensitiveCategoryOptionLabel = (category: string) =>
  category === "all" ? "Todas" : (categoryLabels[category] ?? category);

export const ModerationOverviewCharts = ({ summary }: { summary: AdminModerationSummary }) => {
  const [reportType, setReportType] = useState<AdminModerationReportChartType>("all");
  const [sensitiveCategory, setSensitiveCategory] = useState("all");
  const charts = summary.overview_charts;
  const sensitiveCategories = charts.content_sensitive.categories.includes("all")
    ? charts.content_sensitive.categories
    : ["all", ...charts.content_sensitive.categories];
  const activeSensitiveCategory = sensitiveCategories.includes(sensitiveCategory)
    ? sensitiveCategory
    : "all";
  const sensitiveOptions = sensitiveCategories.map((category) => [
    category,
    sensitiveCategoryOptionLabel(category),
  ]) as [string, string][];

  return (
    <div className="space-y-6">
      <OverviewChartBlock
        ariaLabel="Gráfico temporal de denúncias por decisão"
        href="/moderacao/denuncias"
        metrics={reportChartMetrics}
        points={chartPoints(charts.reports[reportType]?.points ?? [])}
        selector={
          <OverviewSelect
            label="Tipo"
            onChange={(value) => setReportType(value as AdminModerationReportChartType)}
            options={reportTypeOptions}
            value={reportType}
          />
        }
        title="Denúncias"
      />
      <OverviewChartBlock
        ariaLabel="Gráfico temporal de pendências de compliance"
        href="/moderacao/compliance"
        metrics={complianceChartMetrics}
        points={chartPoints(charts.compliance.points)}
        title="Compliance"
      />
      <OverviewChartBlock
        ariaLabel="Gráfico temporal de alertas operacionais"
        href="/moderacao/operacionais"
        metrics={operationalChartMetrics}
        points={chartPoints(charts.operational.points)}
        title="Operacionais"
      />
      <OverviewChartBlock
        ariaLabel="Gráfico temporal de conteúdo sensível por decisão"
        href="/moderacao/conteudo-sensivel"
        metrics={sensitiveContentChartMetrics}
        points={chartPoints(
          charts.content_sensitive.by_category[activeSensitiveCategory]?.points ?? [],
        )}
        selector={
          <OverviewSelect
            label="Categoria"
            onChange={setSensitiveCategory}
            options={sensitiveOptions}
            value={activeSensitiveCategory}
          />
        }
        title="Conteúdo sensível"
      />
    </div>
  );
};
