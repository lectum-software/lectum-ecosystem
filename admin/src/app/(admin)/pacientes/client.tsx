"use client";

import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Eye,
  Loader2,
  type LucideIcon,
  MapPin,
  RefreshCw,
  UserCheck,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAdminPatientsDashboard } from "@/api/callers/patients";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPatientsDashboard,
  PatientsDashboardBreakdownItem,
  PatientsDashboardDailyPoint,
  PatientsDashboardMetric,
  PatientsDashboardQuery,
  PatientsDashboardRecentPatient,
} from "@/api/req/patients";
import { cn } from "@/lib/utils";

const QUICK_RANGES = [7, 30, 90] as const;
const CARD_ORDER = [
  "total_patients",
  "active_patients",
  "inactive_patients",
  "new_signups",
] as const;
const CHART_COLORS = [
  "var(--admin-primary)",
  "var(--admin-success)",
  "var(--admin-muted)",
  "var(--admin-warning)",
];

const numberFormatter = new Intl.NumberFormat("pt-BR");

const pad = (value: number) => String(value).padStart(2, "0");
const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const getQuickRange = (days: number): PatientsDashboardQuery => {
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

const isValidRange = (range: PatientsDashboardQuery) => {
  if (!range.from || !range.to) return false;

  return dateFromInput(range.from) <= dateFromInput(range.to);
};

const CardShell = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <section
    className={cn("rounded-card border border-border bg-surface shadow-admin-soft", className)}
  >
    {children}
  </section>
);

const toneClasses = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-success",
  orange: "bg-orange-50 text-orange-700",
  purple: "bg-primary-soft text-primary",
};

const TrendBadge = ({ metric }: { metric: PatientsDashboardMetric }) => (
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

const MetricCard = ({
  icon: Icon,
  metric,
  tone,
}: {
  icon: LucideIcon;
  metric: PatientsDashboardMetric;
  tone: keyof typeof toneClasses;
}) => (
  <CardShell className="min-h-40 p-5">
    <div className="flex items-start justify-between gap-3">
      <div className={cn("grid h-12 w-12 place-items-center rounded-full", toneClasses[tone])}>
        <Icon aria-hidden className="h-5 w-5" />
      </div>
      <span className="rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
        {metric.source}
      </span>
    </div>
    <div className="mt-5 space-y-2">
      <p className="text-sm font-black text-foreground">{metric.label}</p>
      <p className="text-3xl font-black tracking-tight text-foreground">
        {numberFormatter.format(metric.value)}
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
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {CARD_ORDER.map((key) => (
      <CardShell className="h-40 animate-pulse bg-surface-muted" key={`patients-${key}`} />
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
          <h2 className="text-lg font-black">Não foi possível carregar Pacientes</h2>
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

const EmptyState = ({ period }: { period: AdminPatientsDashboard["period"] }) => (
  <CardShell className="border-dashed p-5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Activity aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-black">Período sem cadastros de pacientes</h2>
        <p className="mt-1 text-sm text-muted">
          Nenhum paciente novo foi encontrado entre {formatDate(period.from)} e{" "}
          {formatDate(period.to)}. Os cards de total continuam usando o snapshot real atual.
        </p>
      </div>
    </div>
  </CardShell>
);

const PatientsHeader = ({
  range,
  setRange,
}: {
  range: PatientsDashboardQuery;
  setRange: (range: PatientsDashboardQuery) => void;
}) => (
  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
    <div>
      <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">Pacientes</h1>
      <p className="mt-2 text-sm font-medium text-muted">
        Gerencie crescimento, status de conta e acompanhamento básico dos pacientes da plataforma.
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

const CardsGrid = ({ summary }: { summary: AdminPatientsDashboard }) => {
  const config: Record<
    (typeof CARD_ORDER)[number],
    { icon: LucideIcon; tone: keyof typeof toneClasses }
  > = {
    active_patients: { icon: UserCheck, tone: "green" },
    inactive_patients: { icon: UserRound, tone: "blue" },
    new_signups: { icon: UserPlus, tone: "orange" },
    total_patients: { icon: UsersRound, tone: "purple" },
  };

  return (
    <section>
      <h2 className="mb-4 text-xl font-black text-foreground">Estatísticas</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARD_ORDER.map((key) => (
          <MetricCard key={key} metric={summary.cards[key]} {...config[key]} />
        ))}
      </div>
    </section>
  );
};

const TimelineChart = ({ points }: { points: PatientsDashboardDailyPoint[] }) => {
  const width = 760;
  const height = 320;
  const padding = { bottom: 48, left: 54, right: 24, top: 24 };
  const series = [
    { color: CHART_COLORS[0], key: "total_patients", label: "Total de pacientes" },
    { color: CHART_COLORS[1], key: "active_patients", label: "Pacientes ativos" },
    { color: CHART_COLORS[2], key: "inactive_patients", label: "Pacientes inativos" },
    { color: CHART_COLORS[3], key: "new_signups", label: "Novos cadastros" },
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
      <div className="mb-4 flex flex-wrap gap-3">
        {series.map((item) => (
          <span
            className="inline-flex items-center gap-2 text-xs font-black text-muted"
            key={item.key}
          >
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg
          aria-label="Gráfico temporal de pacientes"
          className="min-w-[680px]"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {gridValues.map((value) => {
            const y = getY(value);
            return (
              <g key={`patients-grid-${value}-${y}`}>
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
                  strokeWidth="3.5"
                />
                {points.map((point, index) => (
                  <circle
                    cx={getX(index)}
                    cy={getY(point[item.key])}
                    fill="var(--admin-surface)"
                    key={`${item.key}-${point.date}`}
                    r="4.5"
                    stroke={item.color}
                    strokeWidth="2.5"
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
              y={height - 14}
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

const safeAvatarSrc = (src: string | null) => {
  if (!src) return null;
  if (src.startsWith("/")) return src;

  try {
    const url = new URL(src);
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return src;
  } catch {
    return null;
  }

  return null;
};

const Avatar = ({ name, src }: { name: string; src: string | null }) => {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const imageSrc = safeAvatarSrc(src);

  if (!imageSrc) {
    return (
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
        {initials || "PA"}
      </span>
    );
  }

  return (
    <Image
      alt={`Foto de ${name}`}
      className="h-11 w-11 shrink-0 rounded-full object-cover"
      height={44}
      src={imageSrc}
      width={44}
    />
  );
};

const StatusBadge = ({ item }: { item: PatientsDashboardRecentPatient }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2 py-1 text-xs font-black",
      item.status === "active" ? "bg-emerald-50 text-success" : "bg-surface-muted text-muted",
    )}
  >
    {item.status_label}
  </span>
);

const RecentPatients = ({ summary }: { summary: AdminPatientsDashboard }) => (
  <CardShell className="overflow-hidden">
    <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-black text-foreground">Lista de pacientes</h2>
        <p className="mt-1 text-sm text-muted">
          Mostrando {numberFormatter.format(summary.recent_patients.items.length)} de{" "}
          {numberFormatter.format(summary.recent_patients.total)} pacientes.
        </p>
      </div>
      <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
        {summary.recent_patients.source}
      </span>
    </div>

    <div className="grid gap-3 p-4 lg:hidden">
      {summary.recent_patients.items.map((item) => (
        <article className="rounded-2xl border border-border p-4" key={item.id}>
          <div className="flex items-start gap-3">
            <Avatar name={item.name} src={item.avatar} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-black text-foreground">{item.name}</h3>
                <StatusBadge item={item} />
              </div>
              <p className="truncate text-xs font-bold text-muted">{item.email}</p>
              <p className="mt-2 text-sm font-bold text-foreground">
                {item.recent_activity?.label || "Sem atividade recente além do cadastro"}
              </p>
              <p className="text-xs text-muted">
                {item.recent_activity
                  ? formatDateTime(item.recent_activity.occurred_at)
                  : formatDateTime(item.created_at)}
              </p>
            </div>
          </div>
          <Link
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-control border border-border px-3 text-sm font-black text-primary"
            href={item.detail_url}
          >
            <Eye aria-hidden className="h-4 w-4" />
            Abrir detalhe
          </Link>
        </article>
      ))}
    </div>

    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[880px] text-left text-sm">
        <caption className="sr-only">Lista resumida de pacientes administrativos</caption>
        <thead className="text-xs text-muted">
          <tr>
            <th className="px-5 py-3 font-black">Paciente</th>
            <th className="px-5 py-3 font-black">Status</th>
            <th className="px-5 py-3 font-black">Localização agregada</th>
            <th className="px-5 py-3 font-black">Cadastro em</th>
            <th className="px-5 py-3 font-black">Atividade recente</th>
            <th className="px-5 py-3 font-black">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {summary.recent_patients.items.map((item) => (
            <tr key={item.id}>
              <td className="px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={item.name} src={item.avatar} />
                  <div className="min-w-0">
                    <p className="truncate font-black text-foreground">{item.name}</p>
                    <p className="truncate text-xs text-muted">{item.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <StatusBadge item={item} />
              </td>
              <td className="px-5 py-4 text-muted">
                {[item.city, item.state, item.country].filter(Boolean).join(", ") ||
                  "Não capturada"}
              </td>
              <td className="px-5 py-4 text-muted">{formatDateTime(item.created_at)}</td>
              <td className="px-5 py-4">
                <p className="font-bold text-foreground">
                  {item.recent_activity?.label || "Cadastro realizado"}
                </p>
                <p className="text-xs text-muted">
                  {item.recent_activity
                    ? formatDateTime(item.recent_activity.occurred_at)
                    : formatDateTime(item.created_at)}
                </p>
              </td>
              <td className="px-5 py-4">
                <Link
                  aria-label={`Abrir detalhe de ${item.name}`}
                  className="inline-grid h-10 w-10 place-items-center rounded-2xl border border-border text-primary transition hover:border-primary"
                  href={item.detail_url}
                >
                  <Eye aria-hidden className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {summary.recent_patients.items.length === 0 ? (
      <p className="p-5 text-sm text-muted">Nenhum paciente real encontrado.</p>
    ) : null}
  </CardShell>
);

const DonutChart = ({
  items,
  total,
}: {
  items: PatientsDashboardBreakdownItem[];
  total: number;
}) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const segments = items.reduce<{
    cumulative: number;
    items: Array<{
      dash: number;
      item: PatientsDashboardBreakdownItem;
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
        <circle
          cx="60"
          cy="60"
          fill="none"
          r={radius}
          stroke="var(--admin-border)"
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

const ProgressList = ({
  items,
  total,
}: {
  items: PatientsDashboardBreakdownItem[];
  total: number;
}) => (
  <div className="mt-5 space-y-4">
    {items.length === 0 ? (
      <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhuma localização agregada real foi capturada para pacientes.
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

const Statistics = ({ summary }: { summary: AdminPatientsDashboard }) => (
  <section>
    <h2 className="mb-4 text-xl font-black text-foreground">Estatísticas simples</h2>
    <div className="grid gap-4 xl:grid-cols-3">
      <CardShell className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-foreground">Gênero</h3>
          <span className="rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
            {summary.demographics.gender.source}
          </span>
        </div>
        <DonutChart
          items={summary.demographics.gender.items}
          total={summary.demographics.gender.total}
        />
      </CardShell>
      <CardShell className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin aria-hidden className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-black text-foreground">Localização</h3>
          </div>
          <span className="rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
            {summary.locations.source}
          </span>
        </div>
        <ProgressList items={summary.locations.states} total={summary.locations.total} />
      </CardShell>
      <CardShell className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-foreground">Forma de cadastro</h3>
          <span className="rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
            {summary.demographics.signup_sources.source}
          </span>
        </div>
        <DonutChart
          items={summary.demographics.signup_sources.items}
          total={summary.demographics.signup_sources.total}
        />
      </CardShell>
    </div>
  </section>
);

const CoverageNotes = ({ summary }: { summary: AdminPatientsDashboard }) => (
  <CardShell className="bg-primary-soft/70 p-5">
    <div className="flex gap-3">
      <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <h2 className="font-black text-foreground">Cobertura dos dados</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          {summary.coverage_notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
          <li>{summary.export.reason}</li>
          {summary.unavailable.map((item) => (
            <li key={item.id}>
              <strong className="text-foreground">{item.label}:</strong> {item.description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </CardShell>
);

const DashboardContent = ({ summary }: { summary: AdminPatientsDashboard }) => (
  <div className="space-y-6">
    {summary.cards.new_signups.value === 0 ? <EmptyState period={summary.period} /> : null}

    <CardsGrid summary={summary} />

    <CardShell className="p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Evolução no período</h2>
          <p className="mt-1 text-sm text-muted">
            Linha temporal baseada em cadastro de usuários e status atual da conta.
          </p>
        </div>
        <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
          {summary.series.source}
        </span>
      </div>
      <TimelineChart points={summary.series.points} />
    </CardShell>

    <RecentPatients summary={summary} />
    <Statistics summary={summary} />
    <CoverageNotes summary={summary} />
  </div>
);

export const AdminPatientsClient = () => {
  const [range, setRange] = useState<PatientsDashboardQuery>(() => getQuickRange(7));
  const validRange = isValidRange(range);
  const query = useAdminPatientsDashboard(range, { enabled: validRange });
  const queryError = query.error ? resolveApiError(query.error) : null;
  const periodCopy = useMemo(() => {
    if (!range.from || !range.to) return "Selecione um período válido";

    return `${formatDate(range.from)} — ${formatDate(range.to)}`;
  }, [range]);

  return (
    <div className="space-y-6">
      <PatientsHeader range={range} setRange={setRange} />

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

      {validRange && query.isFetching && !query.isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm font-bold text-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Atualizando dados reais...
        </p>
      ) : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? <DashboardContent summary={query.data} /> : null}
    </div>
  );
};
