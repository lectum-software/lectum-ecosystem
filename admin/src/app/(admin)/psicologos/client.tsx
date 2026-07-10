"use client";

import {
  Activity,
  AlertTriangle,
  Award,
  BadgeCheck,
  CalendarDays,
  CircleDollarSign,
  Heart,
  type LucideIcon,
  MessageCircle,
  RefreshCw,
  SearchX,
  ShieldCheck,
  Star,
  TrendingDown,
  UserCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { useAdminPsychologistsDashboard } from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPsychologistsDashboard,
  PsychologistsDashboardBooleanBreakdown,
  PsychologistsDashboardBreakdownItem,
  PsychologistsDashboardDailyPoint,
  PsychologistsDashboardMetric,
  PsychologistsDashboardPsychologist,
  PsychologistsDashboardQuery,
  PsychologistsDashboardRankingItem,
} from "@/api/req/psychologists";
import { cn } from "@/lib/utils";

const QUICK_RANGES = [7, 30, 90] as const;
const CHART_COLORS = ["#3b16f3", "#1788ff", "#19b96f", "#ff7a1a", "#f8288f"];
const CARD_ORDER = [
  "total_psychologists",
  "free_psychologists",
  "verified_psychologists",
  "new_signups",
  "subscription_revenue",
  "churn",
] as const;

const numberFormatter = new Intl.NumberFormat("pt-BR");
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const pad = (value: number) => String(value).padStart(2, "0");
const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const getQuickRange = (days: number): PsychologistsDashboardQuery => {
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

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

const formatMetricValue = (metric: PsychologistsDashboardMetric) => {
  if (metric.unit === "currency_cents") return currencyFormatter.format(metric.value / 100);
  if (metric.unit === "percentage") return `${numberFormatter.format(metric.value)}%`;

  return numberFormatter.format(metric.value);
};

const isValidRange = (range: PsychologistsDashboardQuery) => {
  if (!range.from || !range.to) return false;

  return dateFromInput(range.from) <= dateFromInput(range.to);
};

const hasDashboardRecords = (summary: AdminPsychologistsDashboard) => {
  const cardsHaveData = Object.values(summary.cards).some((metric) => metric.value > 0);
  const timelineHasData = summary.timeline.points.some(
    (point) =>
      point.new_signups > 0 ||
      point.paid_subscriptions_started > 0 ||
      point.profile_views > 0 ||
      point.reviews_received > 0 ||
      point.whatsapp_clicks > 0,
  );

  return (
    cardsHaveData || timelineHasData || summary.psychologists.total > 0 || summary.ranking.total > 0
  );
};

const statusLabel: Record<PsychologistsDashboardPsychologist["status"], string> = {
  gratuito: "Gratuito",
  nao_publicado: "Não publicado",
  pendente: "Pendente",
  verificado: "Verificado",
};

const statusClasses: Record<PsychologistsDashboardPsychologist["status"], string> = {
  gratuito: "bg-blue-50 text-blue-700",
  nao_publicado: "bg-orange-50 text-orange-700",
  pendente: "bg-surface-muted text-muted",
  verificado: "bg-emerald-50 text-emerald-700",
};

const CardShell = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <section
    className={cn("rounded-card border border-border bg-surface shadow-admin-soft", className)}
  >
    {children}
  </section>
);

const toneClasses = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
  pink: "bg-pink-50 text-pink-600",
  purple: "bg-primary-soft text-primary",
  red: "bg-red-50 text-danger",
};

const TrendBadge = ({ metric }: { metric: PsychologistsDashboardMetric }) => {
  if (metric.unavailable)
    return <span className="text-xs font-bold text-warning">Indisponível</span>;

  return (
    <span
      className={cn(
        "text-xs font-black",
        metric.trend === "up" && "text-success",
        metric.trend === "down" && "text-danger",
        metric.trend === "flat" && "text-muted",
        metric.trend === "unavailable" && "text-muted",
      )}
    >
      {formatChange(metric.change_percent)}
    </span>
  );
};

const MetricCard = ({
  icon: Icon,
  metric,
  tone,
}: {
  icon: LucideIcon;
  metric: PsychologistsDashboardMetric;
  tone: keyof typeof toneClasses;
}) => (
  <CardShell className="min-h-44 p-5">
    <div className="flex items-start justify-between gap-3">
      <div className={cn("grid h-12 w-12 place-items-center rounded-full", toneClasses[tone])}>
        <Icon aria-hidden className="h-5 w-5" />
      </div>
      {metric.estimated ? (
        <span className="rounded-full bg-primary-soft px-2 py-1 text-[0.65rem] font-black text-primary">
          estimado
        </span>
      ) : null}
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

const LoadingGrid = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
    {CARD_ORDER.map((key) => (
      <CardShell className="h-44 animate-pulse bg-surface-muted" key={`psych-skeleton-${key}`} />
    ))}
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black">Não foi possível carregar Psicólogos</h2>
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

const EmptyState = ({ period }: { period: AdminPsychologistsDashboard["period"] }) => (
  <CardShell className="border-dashed p-5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Activity aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-black">Período sem registros agregáveis</h2>
        <p className="mt-1 text-sm text-muted">
          Nenhuma métrica real foi encontrada entre {formatDate(period.from)} e{" "}
          {formatDate(period.to)}. Ajuste o período para visualizar dados já capturados.
        </p>
      </div>
    </div>
  </CardShell>
);

const Avatar = ({ name, src }: { name: string; src: string | null }) => {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  if (!src) {
    return (
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
        {initials || "PS"}
      </span>
    );
  }

  return (
    <Image
      alt={`Foto de ${name}`}
      className="h-11 w-11 shrink-0 rounded-full object-cover"
      height={44}
      src={src}
      width={44}
    />
  );
};

const TimelineChart = ({ points }: { points: PsychologistsDashboardDailyPoint[] }) => {
  const width = 760;
  const height = 300;
  const padding = { bottom: 44, left: 50, right: 20, top: 24 };
  const series = [
    { color: "#3b16f3", key: "profile_views", label: "Visualizações de perfil" },
    { color: "#1788ff", key: "whatsapp_clicks", label: "Cliques no WhatsApp" },
    { color: "#19b96f", key: "reviews_received", label: "Avaliações recebidas" },
    { color: "#ff7a1a", key: "new_signups", label: "Novos cadastros" },
    { color: "#f8288f", key: "paid_subscriptions_started", label: "Assinaturas pagas iniciadas" },
  ] as const;
  const maxValue = Math.max(1, ...points.flatMap((point) => series.map((item) => point[item.key])));
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = (index: number) =>
    points.length <= 1 ? width / 2 : padding.left + (index * chartWidth) / (points.length - 1);
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio));

  return (
    <figure className="mt-5 overflow-hidden">
      <div className="mb-3 flex flex-wrap gap-3">
        {series.map((item) => (
          <span className="flex items-center gap-2 text-xs font-bold text-muted" key={item.key}>
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg
          aria-label="Gráfico temporal de atividade dos psicólogos"
          className="min-w-[680px]"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {gridValues.map((value) => {
            const y = getY(value);
            return (
              <g key={`psych-grid-${value}-${y}`}>
                <line
                  stroke="var(--admin-border)"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text fill="var(--admin-muted)" fontSize="11" x="8" y={y + 4}>
                  {numberFormatter.format(value)}
                </text>
              </g>
            );
          })}

          {series.map((item) => {
            const path = points
              .map(
                (point, index) =>
                  `${index === 0 ? "M" : "L"}${getX(index)},${getY(point[item.key])}`,
              )
              .join(" ");

            return (
              <g key={item.key}>
                <path
                  d={path}
                  fill="none"
                  stroke={item.color}
                  strokeLinecap="round"
                  strokeWidth="4"
                />
                {points.map((point, index) => (
                  <circle
                    cx={getX(index)}
                    cy={getY(point[item.key])}
                    fill="#fff"
                    key={`${item.key}-${point.date}`}
                    r="4"
                    stroke={item.color}
                    strokeWidth="2"
                  />
                ))}
              </g>
            );
          })}

          {points.map((point, index) => (
            <text
              fill="var(--admin-foreground)"
              fontSize="11"
              key={point.date}
              textAnchor="middle"
              x={getX(index)}
              y={height - 12}
            >
              {formatDate(point.date)}
            </text>
          ))}
        </svg>
      </div>
      <details className="mt-3 rounded-2xl bg-surface-muted p-3 text-xs text-muted">
        <summary className="cursor-pointer font-black text-foreground">
          Resumo textual do gráfico
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {series.map((item) => (
            <p key={item.key}>
              <strong className="text-foreground">{item.label}:</strong>{" "}
              {points
                .map(
                  (point) =>
                    `${formatDate(point.date)}: ${numberFormatter.format(point[item.key])}`,
                )
                .join("; ")}
            </p>
          ))}
        </div>
      </details>
    </figure>
  );
};

const PanelTitle = ({
  icon: Icon,
  source,
  title,
}: {
  icon: LucideIcon;
  source?: string;
  title: string;
}) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex items-center gap-2">
      <Icon aria-hidden className="h-5 w-5 text-primary" />
      <h2 className="text-lg font-black text-foreground">{title}</h2>
    </div>
    {source ? (
      <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
        {source}
      </span>
    ) : null}
  </div>
);

const ProgressList = ({
  emptyCopy = "Sem dados reais para este agrupamento.",
  items,
  total,
}: {
  emptyCopy?: string;
  items: PsychologistsDashboardBreakdownItem[];
  total: number;
}) => (
  <div className="mt-4 space-y-4">
    {items.length === 0 ? (
      <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">{emptyCopy}</p>
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

const DonutChart = ({
  items,
  total,
}: {
  items: PsychologistsDashboardBreakdownItem[];
  total: number;
}) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const segments = items.reduce<{
    cumulative: number;
    items: Array<{
      dash: number;
      item: PsychologistsDashboardBreakdownItem;
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
    <div className="mt-5 grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
      <svg aria-label="Gráfico de distribuição" role="img" viewBox="0 0 120 120">
        <circle cx="60" cy="60" fill="none" r={radius} stroke="#eef2fb" strokeWidth="18" />
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
          <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">Sem dados reais.</p>
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
  );
};

const BooleanDonut = ({ metric }: { metric: PsychologistsDashboardBooleanBreakdown }) => (
  <DonutChart
    items={[
      {
        count: metric.true_count,
        id: "true",
        label: metric.true_label,
        percentage: metric.true_percentage,
      },
      {
        count: metric.false_count,
        id: "false",
        label: metric.false_label,
        percentage: Math.max(0, 100 - metric.true_percentage),
      },
    ]}
    total={metric.true_count + metric.false_count}
  />
);

const PsychologistsTable = ({
  items,
  total,
}: {
  items: PsychologistsDashboardPsychologist[];
  total: number;
}) => (
  <CardShell className="p-5">
    <PanelTitle icon={UsersRound} source="user+psychologist_profile" title="Lista de psicólogos" />
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">Lista resumida de psicólogos administrativos</caption>
        <thead className="text-xs text-muted">
          <tr>
            <th className="py-3 font-black">Psicólogo</th>
            <th className="py-3 font-black">Status</th>
            <th className="py-3 font-black">Plano</th>
            <th className="py-3 font-black">Cidade/UF</th>
            <th className="py-3 font-black">Cadastro em</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={item.name} src={item.avatar} />
                  <div className="min-w-0">
                    <p className="truncate font-black text-foreground">{item.name}</p>
                    <p className="truncate text-xs text-muted">{item.crp || item.email}</p>
                  </div>
                </div>
              </td>
              <td className="py-4">
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-xs font-black",
                    statusClasses[item.status],
                  )}
                >
                  {statusLabel[item.status]}
                </span>
              </td>
              <td className="py-4 font-bold text-foreground">
                {item.plan_name || "Sem plano ativo"}
              </td>
              <td className="py-4 text-muted">
                {[item.city, item.state].filter(Boolean).join(", ") || "Não informado"}
              </td>
              <td className="py-4 text-muted">{formatDateTime(item.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhum psicólogo real encontrado.
        </p>
      ) : null}
    </div>
    <p className="mt-4 text-xs font-bold text-muted">
      Mostrando {numberFormatter.format(items.length)} de {numberFormatter.format(total)}{" "}
      psicólogos.
    </p>
    <Link
      className="mt-3 inline-flex text-sm font-black text-primary hover:text-primary-hover"
      href="/psicologos/lista"
    >
      Ver lista completa
    </Link>
  </CardShell>
);

const RankingList = ({ items }: { items: PsychologistsDashboardRankingItem[] }) => (
  <CardShell className="p-5">
    <PanelTitle
      icon={Award}
      source="ranking público compartilhado"
      title="Ranking dos psicólogos"
    />
    <div className="mt-4 divide-y divide-border">
      {items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhum profissional elegível à descoberta pública no período atual.
        </p>
      ) : (
        items.map((item) => (
          <div className="flex items-center justify-between gap-3 py-3" key={item.id}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="w-8 shrink-0 text-xl font-black text-primary">#{item.position}</span>
              <Avatar name={item.name} src={item.avatar} />
              <div className="min-w-0">
                <p className="truncate font-black text-foreground">
                  {item.name}{" "}
                  {item.verified ? (
                    <BadgeCheck aria-label="Verificado" className="inline h-4 w-4 text-primary" />
                  ) : null}
                </p>
                <p className="text-xs text-muted">{item.crp || "CRP não informado"}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-foreground">{item.score}</p>
              <p className="text-xs font-bold text-muted">score público</p>
            </div>
          </div>
        ))
      )}
    </div>
    <p className="mt-4 text-xs leading-relaxed text-muted">
      Reutiliza a mesma fórmula real do Explorar público: vídeo, WhatsApp, favoritos, avaliações,
      completude, recência e randomização determinística controlada.
    </p>
  </CardShell>
);

const SearchUnavailableCard = ({ summary }: { summary: AdminPsychologistsDashboard }) => (
  <CardShell className="border-dashed p-5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <SearchX aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-black text-foreground">Filtros de busca indisponíveis</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {summary.filters_searches.description}
        </p>
        <p className="mt-2 text-xs font-bold text-muted">
          Fonte: {summary.filters_searches.source}
        </p>
      </div>
    </div>
  </CardShell>
);

const StatsContent = ({ summary }: { summary: AdminPsychologistsDashboard }) => (
  <div className="grid gap-4 xl:grid-cols-3">
    <CardShell className="p-5">
      <PanelTitle icon={ShieldCheck} source={summary.statistics.services.source} title="Serviços" />
      <ProgressList
        items={summary.statistics.services.items}
        total={summary.statistics.services.total}
      />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle
        icon={MessageCircle}
        source={summary.statistics.approaches.source}
        title="Abordagens"
      />
      <ProgressList
        items={summary.statistics.approaches.items}
        total={summary.statistics.approaches.total}
      />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle
        icon={UsersRound}
        source={summary.statistics.target_audience.source}
        title="Público atendido"
      />
      <ProgressList
        items={summary.statistics.target_audience.items}
        total={summary.statistics.target_audience.total}
      />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle
        icon={Activity}
        source={summary.statistics.modalities.source}
        title="Modalidades"
      />
      <ProgressList
        items={summary.statistics.modalities.items}
        total={summary.statistics.modalities.total}
      />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle icon={UsersRound} source={summary.statistics.gender.source} title="Gênero" />
      <DonutChart items={summary.statistics.gender.items} total={summary.statistics.gender.total} />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle
        icon={Award}
        source={summary.statistics.states.source}
        title="Distribuição por estado"
      />
      <ProgressList
        items={summary.statistics.states.items}
        total={summary.statistics.states.total}
      />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle
        icon={Star}
        source={summary.statistics.experience_over_10_years.source}
        title="Mais de 10 anos"
      />
      <BooleanDonut metric={summary.statistics.experience_over_10_years} />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle
        icon={ShieldCheck}
        source={summary.statistics.accepts_insurance.source}
        title="Aceita convênios"
      />
      <BooleanDonut metric={summary.statistics.accepts_insurance} />
    </CardShell>
    <CardShell className="p-5">
      <PanelTitle
        icon={Heart}
        source={summary.statistics.discount_first_session.source}
        title="Desconto 1ª sessão"
      />
      <BooleanDonut metric={summary.statistics.discount_first_session} />
    </CardShell>
    <CardShell className="p-5 xl:col-span-3">
      <PanelTitle
        icon={CircleDollarSign}
        source={summary.statistics.social_value.source}
        title="Valor social"
      />
      <BooleanDonut metric={summary.statistics.social_value} />
    </CardShell>
  </div>
);

const PsychologistsHeader = ({
  range,
  setRange,
}: {
  range: PsychologistsDashboardQuery;
  setRange: (range: PsychologistsDashboardQuery) => void;
}) => (
  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
    <div>
      <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
        Painel Administrativo dos Psicólogos
      </h1>
      <p className="mt-2 text-sm font-medium text-muted">
        Gerencie perfis, aprovações, assinaturas e desempenho dos psicólogos da plataforma.
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
    </div>
  </div>
);

const CardsGrid = ({ summary }: { summary: AdminPsychologistsDashboard }) => {
  const cards = summary.cards;
  const config: Record<
    (typeof CARD_ORDER)[number],
    { icon: LucideIcon; tone: keyof typeof toneClasses }
  > = {
    churn: { icon: TrendingDown, tone: "red" },
    free_psychologists: { icon: UsersRound, tone: "green" },
    new_signups: { icon: UserPlus, tone: "orange" },
    subscription_revenue: { icon: CircleDollarSign, tone: "pink" },
    total_psychologists: { icon: UsersRound, tone: "purple" },
    verified_psychologists: { icon: UserCheck, tone: "blue" },
  };

  return (
    <section>
      <h2 className="mb-4 text-xl font-black text-foreground">Visão geral</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {CARD_ORDER.map((key) => (
          <MetricCard key={key} metric={cards[key]} {...config[key]} />
        ))}
      </div>
    </section>
  );
};

const DashboardContent = ({ summary }: { summary: AdminPsychologistsDashboard }) => (
  <div className="space-y-6">
    {!hasDashboardRecords(summary) ? <EmptyState period={summary.period} /> : null}

    <CardsGrid summary={summary} />

    <CardShell className="p-5">
      <PanelTitle icon={Activity} source={summary.timeline.source} title="Evolução no período" />
      <TimelineChart points={summary.timeline.points} />
    </CardShell>

    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.85fr]">
      <PsychologistsTable items={summary.psychologists.items} total={summary.psychologists.total} />
      <RankingList items={summary.ranking.items} />
    </div>

    <section>
      <h2 className="mb-4 text-xl font-black text-foreground">Estatísticas</h2>
      <StatsContent summary={summary} />
    </section>

    <SearchUnavailableCard summary={summary} />

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

export const AdminPsychologistsClient = () => {
  const [range, setRange] = useState<PsychologistsDashboardQuery>(() => getQuickRange(7));
  const validRange = isValidRange(range);
  const query = useAdminPsychologistsDashboard(range, { enabled: validRange });
  const queryError = query.error ? resolveApiError(query.error) : null;
  const periodCopy = useMemo(() => {
    if (!range.from || !range.to) return "Selecione um período válido";

    return `${formatDate(range.from)} — ${formatDate(range.to)}`;
  }, [range]);

  return (
    <div className="space-y-6">
      <PsychologistsHeader range={range} setRange={setRange} />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <CalendarDays aria-hidden className="h-4 w-4" />
        <span className="font-bold">Período consultado:</span>
        <span>{periodCopy}</span>
        {query.data ? <span>({query.data.period.days} dias)</span> : null}
      </div>

      {!validRange ? (
        <ErrorState
          message="A data inicial precisa ser menor ou igual à data final."
          onRetry={() => setRange(getQuickRange(7))}
        />
      ) : null}

      {validRange && query.isLoading ? <LoadingGrid /> : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? <DashboardContent summary={query.data} /> : null}
    </div>
  );
};
