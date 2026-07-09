"use client";

import {
  Activity,
  AlertTriangle,
  CalendarDays,
  DoorOpen,
  Download,
  Globe2,
  Loader2,
  type LucideIcon,
  MapPinned,
  MousePointerClick,
  PieChart,
  RefreshCw,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAdminTrafficExport, useAdminTrafficSummary } from "@/api/callers/traffic";
import { resolveApiError } from "@/api/handle";
import type {
  AdminTrafficSummary,
  TrafficBreakdownItem,
  TrafficEntryPage,
  TrafficMetric,
  TrafficRankingItem,
  TrafficSummaryQuery,
} from "@/api/req/traffic";
import { cn } from "@/lib/utils";

const QUICK_RANGES = [7, 30, 90] as const;
const CHART_COLORS = [
  "var(--admin-primary)",
  "var(--admin-success)",
  "var(--admin-warning)",
  "var(--admin-danger)",
  "var(--admin-muted)",
  "var(--admin-subtle)",
];
const SKELETON_KEYS = [
  "sessions",
  "visitors",
  "pageviews",
  "devices",
  "locations",
  "entry",
] as const;

const numberFormatter = new Intl.NumberFormat("pt-BR");

const pad = (value: number) => String(value).padStart(2, "0");
const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const getQuickRange = (days: number): TrafficSummaryQuery => {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - (days - 1));

  return {
    from: toInputDate(from),
    to: toInputDate(today),
  };
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(dateFromInput(value));

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
};

const formatMetricValue = (metric: TrafficMetric) => {
  if (metric.unavailable) return "Indisponível";
  if (metric.unit === "percentage") {
    return `${numberFormatter.format(metric.value)}%`;
  }
  if (metric.unit === "seconds") return formatDuration(metric.value);
  if (metric.unit === "decimal") {
    return metric.value.toLocaleString("pt-BR", {
      maximumFractionDigits: 2,
      minimumFractionDigits: metric.value % 1 === 0 ? 0 : 1,
    });
  }

  return numberFormatter.format(metric.value);
};

const formatChange = (value: number | null) => {
  if (value === null) return "sem base";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

const isValidRange = (range: TrafficSummaryQuery) => {
  if (!range.from || !range.to) return false;

  return dateFromInput(range.from) <= dateFromInput(range.to);
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const hasPeriodRecords = (summary: AdminTrafficSummary) => {
  const overviewValues = summary.overview_cards.some((card) => card.value > 0);
  const breakdownValues =
    summary.traffic_sources.total > 0 ||
    summary.devices.total > 0 ||
    summary.user_types.total > 0 ||
    summary.locations.total > 0 ||
    summary.entry_pages.total > 0 ||
    summary.top_communities.total > 0 ||
    summary.top_psychologists.total > 0;

  return overviewValues || breakdownValues;
};

const CardShell = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <section
    className={cn("rounded-card border border-border bg-surface shadow-admin-soft", className)}
  >
    {children}
  </section>
);

const toneClasses = {
  blue: "bg-primary-soft text-primary",
  green: "bg-surface-muted text-success",
  orange: "bg-surface-muted text-warning",
  pink: "bg-surface-muted text-danger",
  purple: "bg-primary-soft text-primary",
};

const cardIcons: Record<string, { icon: LucideIcon; tone: keyof typeof toneClasses }> = {
  anonymous_visitors: { icon: Users, tone: "blue" },
  bounce_rate: { icon: DoorOpen, tone: "orange" },
  logged_psychologists: { icon: Users, tone: "purple" },
  new_visitors: { icon: Users, tone: "purple" },
  pageviews: { icon: Activity, tone: "blue" },
  pages_per_session: { icon: MousePointerClick, tone: "blue" },
  pwa_installs: { icon: Smartphone, tone: "purple" },
  registration_rate: { icon: TrendingUp, tone: "green" },
  sessions: { icon: Globe2, tone: "blue" },
  unique_visitors: { icon: Users, tone: "blue" },
};

const TrendBadge = ({ metric }: { metric: TrafficMetric }) => {
  if (metric.unavailable)
    return <span className="text-xs font-bold text-warning">Indisponível</span>;

  const lowerIsBetter = metric.id === "bounce_rate";
  const trendClass = cn(
    "text-xs font-black",
    metric.trend === "flat" && "text-muted",
    metric.trend === "unavailable" && "text-muted",
    metric.trend === "up" && (lowerIsBetter ? "text-danger" : "text-success"),
    metric.trend === "down" && (lowerIsBetter ? "text-success" : "text-danger"),
  );

  return <span className={trendClass}>{formatChange(metric.change_percent)}</span>;
};

const MetricCard = ({ metric }: { metric: TrafficMetric }) => {
  const config = cardIcons[metric.id] ?? { icon: Activity, tone: "purple" as const };
  const Icon = config.icon;

  return (
    <CardShell className="min-h-40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn("grid h-12 w-12 place-items-center rounded-full", toneClasses[config.tone])}
        >
          <Icon aria-hidden className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
          real
        </span>
      </div>
      <div className="mt-5 space-y-2">
        <p className="text-sm font-black text-foreground">{metric.label}</p>
        <p className="text-3xl font-black tracking-tight text-foreground">
          {formatMetricValue(metric)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <TrendBadge metric={metric} />
          <span className="text-xs font-medium text-muted">vs. período anterior</span>
        </div>
        <p className="text-xs leading-relaxed text-muted">{metric.description}</p>
      </div>
    </CardShell>
  );
};

const LoadingGrid = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
    {SKELETON_KEYS.map((key) => (
      <CardShell className="h-40 animate-pulse bg-surface-muted" key={`traffic-skeleton-${key}`} />
    ))}
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-muted text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black">Não foi possível carregar Tráfego</h2>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-border-strong"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </CardShell>
);

const EmptyState = ({ period }: { period: AdminTrafficSummary["period"] }) => (
  <CardShell className="border-dashed p-5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Activity aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-black">Período sem tráfego capturado</h2>
        <p className="mt-1 text-sm text-muted">
          Nenhuma sessão, pageview ou evento real foi encontrado entre {formatDate(period.from)} e{" "}
          {formatDate(period.to)}. Ajuste o período ou aguarde a captura do tracking público.
        </p>
      </div>
    </div>
  </CardShell>
);

const DonutChart = ({
  ariaLabel,
  items,
  total,
}: {
  ariaLabel: string;
  items: TrafficBreakdownItem[];
  total: number;
}) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const visibleItems = items.filter((item) => item.count > 0);
  const segments = visibleItems.reduce<{
    cumulative: number;
    items: Array<{
      dash: number;
      item: TrafficBreakdownItem;
      strokeDashoffset: number;
    }>;
  }>(
    (accumulator, item) => {
      const share = total > 0 ? item.count / total : 0;
      const dash = share * circumference;

      return {
        cumulative: accumulator.cumulative + dash,
        items: [
          ...accumulator.items,
          {
            dash,
            item,
            strokeDashoffset: -accumulator.cumulative,
          },
        ],
      };
    },
    { cumulative: 0, items: [] },
  ).items;

  return (
    <figure className="mt-5">
      <div className="grid gap-5 sm:grid-cols-[190px_1fr] sm:items-center">
        <svg aria-label={ariaLabel} role="img" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            fill="none"
            r={radius}
            stroke="var(--admin-surface-muted)"
            strokeWidth="18"
          />
          {segments.map(({ dash, item, strokeDashoffset }, index) => (
            <circle
              cx="60"
              cy="60"
              fill="none"
              key={item.id}
              r={radius}
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={strokeDashoffset}
              strokeWidth="18"
              transform="rotate(-90 60 60)"
            />
          ))}
          <text
            fill="var(--admin-foreground)"
            fontSize="15"
            fontWeight="900"
            textAnchor="middle"
            x="60"
            y="58"
          >
            {numberFormatter.format(total)}
          </text>
          <text
            fill="var(--admin-muted)"
            fontSize="8"
            fontWeight="700"
            textAnchor="middle"
            x="60"
            y="72"
          >
            total
          </text>
        </svg>

        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
              Nenhum dado real capturado no período.
            </p>
          ) : (
            items.map((item, index) => (
              <div className="flex items-center justify-between gap-3" key={item.id}>
                <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <span
                    aria-hidden
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  {item.label}
                </span>
                <span className="text-sm font-black text-foreground">{item.percentage}%</span>
              </div>
            ))
          )}
        </div>
      </div>
      <details className="mt-3 rounded-2xl bg-surface-muted p-3 text-xs text-muted">
        <summary className="cursor-pointer font-black text-foreground">
          Resumo textual do gráfico
        </summary>
        <p className="mt-2">
          {items.length > 0
            ? items
                .map(
                  (item) =>
                    `${item.label}: ${numberFormatter.format(item.count)} (${item.percentage}%)`,
                )
                .join("; ")
            : "Sem dados disponíveis."}
        </p>
      </details>
    </figure>
  );
};

const BarList = ({
  items,
  total,
}: {
  items: Array<{ count: number; id: string; label: string; percentage: number }>;
  total: number;
}) => (
  <div className="mt-5 space-y-4">
    {items.length === 0 ? (
      <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhum dado real capturado no período.
      </p>
    ) : (
      items.map((item) => (
        <div key={item.id}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-black text-foreground">{item.label}</span>
            <span className="font-bold text-muted">
              {numberFormatter.format(item.count)} ({item.percentage}%)
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, item.percentage)}%` }}
            />
          </div>
        </div>
      ))
    )}
    <p className="text-xs text-muted">Total considerado: {numberFormatter.format(total)}.</p>
  </div>
);

const PanelTitle = ({
  icon: Icon,
  source,
  title,
}: {
  icon: LucideIcon;
  source?: string;
  title: string;
}) => (
  <div className="flex items-start justify-between gap-3">
    <div className="flex items-center gap-2">
      <Icon aria-hidden className="h-5 w-5 text-primary" />
      <h2 className="text-lg font-black text-foreground">{title}</h2>
    </div>
    {source ? (
      <span className="rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
        {source}
      </span>
    ) : null}
  </div>
);

const EntryPagesTable = ({ items }: { items: TrafficEntryPage[] }) => (
  <div className="mt-5 overflow-x-auto">
    <table className="w-full min-w-[460px] text-left text-sm">
      <caption className="sr-only">Páginas de entrada por sessões</caption>
      <thead className="text-xs text-muted">
        <tr>
          <th className="py-3 font-black">Página de entrada</th>
          <th className="py-3 font-black">Sessões</th>
          <th className="py-3 font-black">%</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {items.map((item) => (
          <tr key={item.path}>
            <td className="py-3">
              <p className="font-black text-foreground">{item.label}</p>
              <p className="text-xs text-muted">{item.path}</p>
            </td>
            <td className="py-3 font-bold text-foreground">{numberFormatter.format(item.count)}</td>
            <td className="py-3 font-bold text-muted">{item.percentage}%</td>
          </tr>
        ))}
      </tbody>
    </table>
    {items.length === 0 ? (
      <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhuma pageview de entrada real no período.
      </p>
    ) : null}
  </div>
);

const MetricList = ({ items }: { items: TrafficMetric[] }) => (
  <div className="mt-4 divide-y divide-border">
    {items.map((item) => (
      <div className="flex items-center justify-between gap-3 py-3" key={item.id}>
        <div>
          <p className="font-black text-foreground">{item.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{item.description}</p>
        </div>
        <div className="text-right">
          <p className="font-black text-foreground">{formatMetricValue(item)}</p>
          <TrendBadge metric={item} />
        </div>
      </div>
    ))}
  </div>
);

const RankingList = ({ items }: { items: TrafficRankingItem[] }) => (
  <div className="mt-4 divide-y divide-border">
    {items.length === 0 ? (
      <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhuma visualização com target real no período.
      </p>
    ) : (
      items.map((item, index) => (
        <div className="flex items-center justify-between gap-3 py-3" key={item.id}>
          <div className="min-w-0">
            <p className="truncate font-black text-foreground">
              #{index + 1} {item.label}
            </p>
            <p className="text-xs text-muted">{item.path}</p>
          </div>
          <div className="text-right">
            <p className="font-black text-foreground">
              {numberFormatter.format(item.sessions)} sessões
            </p>
            <p className="text-xs font-bold text-muted">
              {numberFormatter.format(item.count)} pageviews
            </p>
          </div>
        </div>
      ))
    )}
  </div>
);

const LocationPanel = ({ locations }: { locations: AdminTrafficSummary["locations"] }) => (
  <CardShell className="p-5">
    <PanelTitle icon={MapPinned} source={locations.source} title="Acessos por localização" />
    <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div>
        <h3 className="text-sm font-black text-foreground">Top estados</h3>
        <BarList items={locations.states} total={locations.total} />
      </div>
      <div className="rounded-card bg-surface-muted p-4">
        <h3 className="text-sm font-black text-foreground">Mapa de acessos simplificado</h3>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Sem pacote de mapa nesta versão. O ranking abaixo usa visitor_location real e mantém uma
          alternativa acessível ao mapa visual do protótipo.
        </p>
        <div className="mt-4 space-y-3">
          {locations.countries.slice(0, 5).map((item, index) => (
            <div className="flex items-center justify-between gap-3" key={item.id}>
              <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                {item.label}
              </span>
              <span className="text-sm font-black text-foreground">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </CardShell>
);

const TrafficHeader = ({
  isExporting,
  onExport,
  range,
  setRange,
}: {
  isExporting: boolean;
  onExport: () => void;
  range: TrafficSummaryQuery;
  setRange: (range: TrafficSummaryQuery) => void;
}) => (
  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 text-xs font-black text-muted">
        <span>Dashboard</span>
        <span className="mx-2 text-subtle">›</span>
        <span className="text-primary">Tráfego</span>
      </nav>
      <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">Tráfego</h1>
      <p className="mt-2 text-sm font-medium text-muted">
        Acompanhe o comportamento de acesso e as principais origens de tráfego da plataforma.
      </p>
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-black text-muted">
          De
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            max={range.to}
            onChange={(event) => setRange({ ...range, from: event.target.value })}
            type="date"
            value={range.from}
          />
        </label>
        <label className="text-xs font-black text-muted">
          Até
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            min={range.from}
            onChange={(event) => setRange({ ...range, to: event.target.value })}
            type="date"
            value={range.to}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2 sm:w-44">
        {QUICK_RANGES.map((days) => (
          <button
            className="h-9 rounded-full border border-border bg-surface px-3 text-xs font-black text-muted transition hover:border-primary hover:text-primary"
            key={days}
            onClick={() => setRange(getQuickRange(days))}
            type="button"
          >
            {days} dias
          </button>
        ))}
      </div>
      <button
        className="inline-flex h-11 min-w-44 items-center justify-center gap-2 rounded-control border border-primary bg-surface px-4 text-sm font-black text-primary shadow-control transition hover:bg-primary-soft disabled:opacity-60"
        disabled={isExporting || !isValidRange(range)}
        onClick={onExport}
        type="button"
      >
        {isExporting ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : (
          <Download aria-hidden className="h-4 w-4" />
        )}
        Exportar relatório
      </button>
    </div>
  </div>
);

const TrafficContent = ({ summary }: { summary: AdminTrafficSummary }) => (
  <div className="space-y-6">
    {!hasPeriodRecords(summary) ? <EmptyState period={summary.period} /> : null}

    <section>
      <h2 className="mb-4 text-xl font-black text-foreground">Visão geral</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summary.overview_cards.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>

    <div className="grid gap-4 xl:grid-cols-3">
      <CardShell className="p-5">
        <PanelTitle
          icon={PieChart}
          source={summary.traffic_sources.source}
          title="Origem do tráfego"
        />
        <DonutChart
          ariaLabel="Distribuição de sessões por origem de tráfego"
          items={summary.traffic_sources.items}
          total={summary.traffic_sources.total}
        />
      </CardShell>
      <CardShell className="p-5">
        <PanelTitle icon={Smartphone} source={summary.devices.source} title="Dispositivos" />
        <DonutChart
          ariaLabel="Distribuição de sessões por dispositivo"
          items={summary.devices.items}
          total={summary.devices.total}
        />
      </CardShell>
      <CardShell className="p-5">
        <PanelTitle icon={Users} source={summary.user_types.source} title="Tipo de usuário" />
        <DonutChart
          ariaLabel="Distribuição de sessões por tipo de usuário"
          items={summary.user_types.items}
          total={summary.user_types.total}
        />
      </CardShell>
    </div>

    <LocationPanel locations={summary.locations} />

    <div className="grid gap-4 xl:grid-cols-3">
      <CardShell className="p-5">
        <PanelTitle
          icon={DoorOpen}
          source={summary.entry_pages.source}
          title="Páginas de entrada"
        />
        <EntryPagesTable items={summary.entry_pages.items} />
      </CardShell>
      <CardShell className="p-5">
        <PanelTitle
          icon={MousePointerClick}
          source={summary.conversions.source}
          title="Conversões geradas"
        />
        <MetricList items={summary.conversions.items} />
      </CardShell>
      <CardShell className="p-5">
        <PanelTitle
          icon={TrendingUp}
          source={summary.quality.source}
          title="Qualidade do tráfego"
        />
        <MetricList items={summary.quality.items} />
      </CardShell>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <CardShell className="p-5">
        <PanelTitle
          icon={Activity}
          source={summary.top_communities.source}
          title="Tráfego por comunidade"
        />
        <RankingList items={summary.top_communities.items} />
      </CardShell>
      <CardShell className="p-5">
        <PanelTitle
          icon={Users}
          source={summary.top_psychologists.source}
          title="Tráfego por psicólogo"
        />
        <RankingList items={summary.top_psychologists.items} />
      </CardShell>
    </div>

    {summary.unavailable.length > 0 ? (
      <CardShell className="bg-primary-soft/70 p-5">
        <div className="flex gap-3">
          <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-black text-foreground">Limitações exibidas honestamente</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
              {summary.unavailable.map((item) => (
                <li key={item.id}>
                  <strong className="text-foreground">{item.label}:</strong> {item.description}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardShell>
    ) : null}
  </div>
);

export const AdminTrafficClient = () => {
  const [range, setRange] = useState<TrafficSummaryQuery>(() => getQuickRange(30));
  const validRange = isValidRange(range);
  const query = useAdminTrafficSummary(range, { enabled: validRange });
  const exportMutation = useAdminTrafficExport();
  const queryError = query.error ? resolveApiError(query.error) : null;
  const periodCopy = useMemo(() => {
    if (!range.from || !range.to) return "Selecione um período válido";

    return `${formatDate(range.from)} — ${formatDate(range.to)}`;
  }, [range]);

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync(range);
      downloadBlob(result.blob, result.filename);
      toast.success("Exportação real de tráfego gerada com sucesso.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <div className="space-y-6">
      <TrafficHeader
        isExporting={exportMutation.isPending}
        onExport={() => void handleExport()}
        range={range}
        setRange={setRange}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <CalendarDays aria-hidden className="h-4 w-4" />
        <span className="font-bold">Período consultado:</span>
        <span>{periodCopy}</span>
        {query.data ? <span>({query.data.period.days} dias)</span> : null}
      </div>

      {!validRange ? (
        <ErrorState
          message="A data inicial precisa ser menor ou igual à data final."
          onRetry={() => setRange(getQuickRange(30))}
        />
      ) : null}

      {validRange && query.isLoading ? <LoadingGrid /> : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? <TrafficContent summary={query.data} /> : null}
    </div>
  );
};
