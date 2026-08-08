"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  Flag,
  type LucideIcon,
  ShieldAlert,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import type { AdminModerationReportChartType } from "@/api/req/moderation";
import { parseCalendarChartDate } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";
import { colorWithAlpha } from "@/lib/visual-tokens";

export const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const overviewDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

export const categoryLabels: Record<string, string> = {
  abuse_violence: "Abuso/violência",
  explicit_sexual: "Sexual explícito",
  external_link: "Link externo",
  minor_sexual_risk: "Menor/risco sexual",
  other: "Outro",
  self_harm_suicide: "Autolesão/suicídio",
  sexual_health: "Saúde sexual",
  spam_scam: "Spam/golpe",
};

export type ModerationChartPoint = {
  date: string;
  [key: string]: unknown;
};

export type ModerationChartMetric = {
  color: string;
  icon: LucideIcon;
  key: string;
  label: string;
};

export type OverviewPeriodPreset =
  | "7d"
  | "30d"
  | "90d"
  | "all"
  | "month"
  | "today"
  | "week"
  | "year";

export type OverviewPeriodValue = OverviewPeriodPreset | "custom";

export type OverviewRange = {
  from: string;
  to: string;
};

export const REPORT_TOTAL_KEY = "total_reports";

export const reportTypeOptions = [
  ["all", "Todos"],
  ["psychologist_posts", "Posts de psicólogos"],
  ["patient_posts", "Posts de pacientes"],
  ["psychologist_replies", "Respostas de psicólogos"],
  ["patient_comments", "Comentários de pacientes"],
] as const satisfies readonly (readonly [AdminModerationReportChartType, string])[];

export const overviewPeriodOptions = [
  ["today", "Hoje"],
  ["week", "Esta semana"],
  ["month", "Este mês"],
  ["year", "Este ano"],
  ["7d", "Últimos 7 dias"],
  ["30d", "Últimos 30 dias"],
  ["90d", "Últimos 90 dias"],
  ["all", "Todo o período"],
] as const satisfies readonly (readonly [OverviewPeriodPreset, string])[];

export const reportChartMetrics = [
  {
    color: "var(--admin-foreground)",
    icon: AlertTriangle,
    key: REPORT_TOTAL_KEY,
    label: "Total de denúncias",
  },
  { color: "var(--admin-primary)", icon: Flag, key: "pending", label: "Pendentes" },
  { color: "var(--admin-success)", icon: X, key: "dismissed", label: "Improcedentes" },
  { color: "var(--admin-danger)", icon: CheckCircle2, key: "upheld", label: "Procedentes" },
] satisfies ModerationChartMetric[];

export const complianceChartMetrics = [
  {
    color: "var(--admin-warning)",
    icon: ShieldAlert,
    key: "professional_crp_pending",
    label: "CRP profissional pendente",
  },
  {
    color: "var(--admin-danger)",
    icon: AlertTriangle,
    key: "invalid_whatsapp",
    label: "WhatsApp inválido",
  },
] satisfies ModerationChartMetric[];

export const operationalChartMetrics = [
  {
    color: "var(--admin-primary)",
    icon: Clock3,
    key: "patient_posts_without_coverage_48h",
    label: "Falta de cobertura há 48h",
  },
  {
    color: "var(--admin-danger)",
    icon: AlertTriangle,
    key: "registration_errors",
    label: "Erros no cadastro",
  },
  {
    color: "var(--admin-chart-accent)",
    icon: ShieldAlert,
    key: "unpublished_required_settings",
    label: "Perfis profissionais sem configuração obrigatória",
  },
  {
    color: "var(--admin-warning)",
    icon: Eye,
    key: "psychologist_no_conversion_after_adaptation",
    label: "Psicólogos assinantes sem tráfego",
  },
] satisfies ModerationChartMetric[];

export const sensitiveContentChartMetrics = [
  { color: "var(--admin-warning)", icon: Eye, key: "allow_sensitive", label: "Sensível publicado" },
  { color: "var(--admin-danger)", icon: X, key: "block", label: "Bloqueado" },
  {
    color: "var(--admin-danger)",
    icon: ShieldAlert,
    key: "safety_hold",
    label: "Segurança urgente",
  },
] satisfies ModerationChartMetric[];

export const Card = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <section className={cn(cardClass, className)}>{children}</section>
);

export const pad = (value: number) => String(value).padStart(2, "0");

export const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const hexToRgba = colorWithAlpha;

export const rawChartPointValue = (point: ModerationChartPoint, key: string) =>
  Number(point[key] ?? 0) || 0;

export const reportTotalValue = (point: ModerationChartPoint) =>
  rawChartPointValue(point, "pending") +
  rawChartPointValue(point, "dismissed") +
  rawChartPointValue(point, "upheld");

export const withDerivedMetricValues = (
  points: ModerationChartPoint[],
  metrics: ModerationChartMetric[],
) => {
  if (!metrics.some((metric) => metric.key === REPORT_TOTAL_KEY)) return points;

  return points.map((point) => ({
    ...point,
    [REPORT_TOTAL_KEY]: reportTotalValue(point),
  }));
};

export const chartPointValue = (point: ModerationChartPoint, key: string) =>
  key === REPORT_TOTAL_KEY ? reportTotalValue(point) : rawChartPointValue(point, key);

export const chartMetricValue = (points: ModerationChartPoint[], key: string) =>
  points.reduce((total, point) => total + chartPointValue(point, key), 0);

export const overviewToday = () => toInputDate(new Date());

export const getOverviewSourceRange = (points: ModerationChartPoint[]): OverviewRange => {
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

export const addOverviewDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);

  return next;
};

export const startOfOverviewWeek = (date: Date) => {
  const day = date.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;

  return addOverviewDays(date, -offset);
};

export const startOfOverviewMonth = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

export const startOfOverviewYear = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), 0, 1));

export const dateToOverviewInput = (date: Date) => date.toISOString().slice(0, 10);

export const getOverviewRangeForPeriod = (
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

export const overviewPeriodLabel = (period: OverviewPeriodValue) => {
  if (period === "custom") return "Personalizado";

  return overviewPeriodOptions.find(([value]) => value === period)?.[1] ?? "Período";
};

export const rangeIsValid = (range: OverviewRange) =>
  Boolean(range.from && range.to && range.from.localeCompare(range.to) <= 0);

export const formatOverviewDate = (value: string) => {
  const parsed = parseCalendarChartDate(value);

  return parsed ? overviewDateFormatter.format(parsed) : value;
};

export const formatOverviewPeriod = (
  period: OverviewPeriodValue,
  range: OverviewRange,
  hasPoints: boolean,
) => {
  if (!hasPoints) return "Sem pontos para exibir.";

  return `${overviewPeriodLabel(period)} · ${formatOverviewDate(
    range.from,
  )} a ${formatOverviewDate(range.to)}.`;
};

export const filterChartPointsByRange = (points: ModerationChartPoint[], range: OverviewRange) => {
  if (!rangeIsValid(range)) return [];

  return points.filter((point) => point.date >= range.from && point.date <= range.to);
};
