"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  MessageCircle,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Share2,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  type ChangeEvent,
  type PointerEvent,
  type SVGProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  useAdminCommunityActivities,
  useAdminCommunityAvatarUpload,
  useAdminCommunityContent,
  useAdminCommunityCreateRule,
  useAdminCommunityDeleteRule,
  useAdminCommunityDetail,
  useAdminCommunityRanking,
  useAdminCommunityRemoveContent,
  useAdminCommunityReports,
  useAdminCommunityResolveReports,
  useAdminCommunityUpdate,
  useAdminCommunityUpdateRule,
} from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import type {
  AdminCommunityActivitiesQuery,
  AdminCommunityActivityItem,
  AdminCommunityContentItem,
  AdminCommunityContentQuery,
  AdminCommunityDetail,
  AdminCommunityIdentity,
  AdminCommunityPerformanceMetric,
  AdminCommunityPopularPost,
  AdminCommunityRankingItem,
  AdminCommunityRankingQuery,
  AdminCommunityReportItem,
  AdminCommunityReports,
  AdminCommunityReportsQuery,
  AdminCommunityRule,
  AdminCommunityRuleInput,
  AdminCommunityTopMentor,
  AdminCommunityUpdateInput,
} from "@/api/req/communities";
import { InputController, TextareaController } from "@/components/controllers";
import { aggregateCalendarChartPoints } from "@/lib/chart-time-series";
import { communityHeaderBackground, deriveCommunityVisualPalette } from "@/lib/community-visual";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("pt-BR");
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const publicFrontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
const publicMediaPathPrefixes = ["/public/files/", "/community/icons/"] as const;
const hexColor = /^#[0-9A-Fa-f]{6}$/;
const colorSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || hexColor.test(value), "Use uma cor no formato #RRGGBB.");

const communityFormSchema = z.object({
  description: z.string().trim().max(500, "Use até 500 caracteres.").optional(),
  name: z.string().trim().min(2, "Informe o nome.").max(120, "Use até 120 caracteres."),
  visual_primary_color: colorSchema,
});

const ruleFormSchema = z.object({
  description: z.string().trim().min(3, "Informe a descrição.").max(500, "Use até 500 caracteres."),
});

const removeContentFormSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .refine(
      (value) => value.toUpperCase() === "REMOVER CONTEUDO",
      "Digite REMOVER CONTEUDO para confirmar.",
    ),
  reason: z.string().trim().min(3, "Informe o motivo.").max(500, "Use até 500 caracteres."),
});

const communityReportResolveSchema = (expectedConfirmation: string) =>
  z.object({
    confirmation: z
      .string()
      .trim()
      .refine(
        (value) => value.toUpperCase() === expectedConfirmation,
        `Digite ${expectedConfirmation} para confirmar.`,
      ),
    reason: z.string().trim().min(3, "Informe o motivo.").max(500, "Use ate 500 caracteres."),
  });

type CommunityFormValues = z.infer<typeof communityFormSchema>;
type RuleFormValues = z.infer<typeof ruleFormSchema>;
type RemoveContentFormValues = z.infer<typeof removeContentFormSchema>;
type CommunityReportResolveFormValues = z.infer<ReturnType<typeof communityReportResolveSchema>>;

type RuleDragMetric = {
  bottom: number;
  height: number;
  id: string;
  top: number;
};

type RuleDragSession = {
  draggedSlotSize: number;
  metrics: RuleDragMetric[];
  pointerId: number;
  sourceIndex: number;
  sourceRuleId: string;
  startClientY: number;
};

type RuleDragState = {
  draggedSlotSize: number;
  offsetY: number;
  sourceIndex: number;
  sourceRuleId: string;
  targetIndex: number;
};

const communityTabs = [
  { id: "geral", label: "Geral" },
  { id: "dados", label: "Dados" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "ranking", label: "Ranking" },
  { id: "denuncias", label: "Denúncias" },
  { id: "atividades", label: "Atividades" },
] as const;

type CommunityTab = (typeof communityTabs)[number]["id"];

const contentTypeOptions = [
  { id: "all", label: "Todos os tipos" },
  { id: "verified_psychologist_post", label: "Posts de psicólogo verificado" },
  { id: "unverified_psychologist_post", label: "Posts de psicólogo não verificado" },
  { id: "verified_psychologist_reply", label: "Respostas de psicólogo verificado" },
  { id: "unverified_psychologist_reply", label: "Respostas de psicólogo não verificado" },
  { id: "patient_comment", label: "Comentários de pacientes" },
  { id: "anonymous_post", label: "Posts anônimos" },
] as const satisfies ReadonlyArray<{
  id: NonNullable<AdminCommunityContentQuery["type"]>;
  label: string;
}>;

type ContentPeriodValue = NonNullable<AdminCommunityContentQuery["period"]>;
type ContentPeriodPreset = Exclude<ContentPeriodValue, "custom">;
type ContentCustomRange = Pick<AdminCommunityContentQuery, "from" | "to">;

const contentPeriodOptions = [
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "all", label: "Todo o período" },
  { id: "custom", label: "Personalizado" },
] as const satisfies ReadonlyArray<{
  id: ContentPeriodValue;
  label: string;
}>;

const parseCommunityTab = (value: string | null): CommunityTab =>
  communityTabs.some((tab) => tab.id === value) ? (value as CommunityTab) : "geral";

const isPublicMediaPath = (pathname: string) =>
  publicMediaPathPrefixes.some((prefix) => pathname.startsWith(prefix));

const resolveAdminMediaUrl = (src?: string | null) => {
  const value = src?.trim();
  if (!value) return null;

  const apiBase = apiUrl.replace(/\/$/, "");

  try {
    const parsed = new URL(value, apiBase);
    if (isPublicMediaPath(parsed.pathname)) {
      return `${apiBase}${parsed.pathname}${parsed.search}`;
    }
    if (value.startsWith("http")) return value;
    return value.startsWith("/") ? value : `${apiBase}/${value}`;
  } catch {
    if (publicMediaPathPrefixes.some((prefix) => value.startsWith(prefix))) {
      return `${apiBase}${value}`;
    }
    return value.startsWith("/") || value.startsWith("http") ? value : null;
  }
};

const allowedRemoteImageHosts = () => {
  const hosts = new Set(["localhost", "127.0.0.1", "lh3.googleusercontent.com"]);

  for (const candidate of [
    apiUrl,
    ...(process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTS?.split(",") ?? []),
  ]) {
    const normalized = candidate.trim();
    if (!normalized) continue;

    try {
      const url = new URL(normalized.includes("://") ? normalized : `https://${normalized}`);
      if (url.hostname) hosts.add(url.hostname);
    } catch {
      // Entradas inválidas de env não devem quebrar a renderização administrativa.
    }
  }

  return hosts;
};

const canRenderImage = (src: string | null) => {
  const resolved = resolveAdminMediaUrl(src);
  if (!resolved) return false;
  if (resolved.startsWith("/")) return true;

  try {
    const url = new URL(resolved);

    return allowedRemoteImageHosts().has(url.hostname);
  } catch {
    return false;
  }
};

const renderableImageSrc = (src: string | null) => {
  const resolved = resolveAdminMediaUrl(src);

  return resolved && canRenderImage(resolved) ? resolved : null;
};

const isAdminPublicMediaUrl = (src?: string | null) => {
  const resolved = resolveAdminMediaUrl(src);
  if (!resolved) return false;

  try {
    return isPublicMediaPath(new URL(resolved).pathname);
  } catch {
    return publicMediaPathPrefixes.some(
      (prefix) => resolved.startsWith(prefix) || resolved.includes(prefix),
    );
  }
};

const toPublicHref = (path: string) => {
  if (/^https?:\/\//.test(path)) return path;

  return `${publicFrontendUrl.replace(/\/$/, "")}${path}`;
};

const cardClass = "rounded-card border border-border bg-surface shadow-admin-soft";

const formatDate = (value: string) => dateFormatter.format(new Date(value));
const formatDateTime = (value: string) => dateTimeFormatter.format(new Date(value));
const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};
const startOfCurrentWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  return date;
};
const startOfCurrentMonth = () => {
  const date = new Date();
  date.setDate(1);

  return date;
};
const startOfCurrentYear = () => new Date(new Date().getFullYear(), 0, 1);
const dateInputValueFromString = (value?: string | null) => {
  if (!value) return toDateInputValue(new Date());

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? toDateInputValue(new Date()) : toDateInputValue(date);
};
const getContentRangeForPeriod = (
  period: ContentPeriodPreset,
  createdAt?: string | null,
): Required<ContentCustomRange> => {
  const today = toDateInputValue(new Date());

  if (period === "month") return { from: toDateInputValue(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toDateInputValue(startOfCurrentYear()), to: today };
  if (period === "all") return { from: dateInputValueFromString(createdAt), to: today };

  return { from: toDateInputValue(startOfCurrentWeek()), to: today };
};
const contentDateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};
const isValidContentRange = (range: ContentCustomRange) => {
  if (!range.from || !range.to) return false;

  return contentDateFromInput(range.from) <= contentDateFromInput(range.to);
};
type ReportPeriodValue = "30d" | "90d" | "180d" | "custom";
type ReportPeriodPreset = Exclude<ReportPeriodValue, "custom">;
type ReportDateRange = {
  from: string;
  to: string;
};
const reportPeriodOptions: { id: ReportPeriodPreset; label: string }[] = [
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "180d", label: "Últimos 180 dias" },
];
const getReportRangeForPeriod = (period: ReportPeriodPreset): ReportDateRange => {
  const days = period === "30d" ? 30 : period === "180d" ? 180 : 90;
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  };
};
const isValidReportRange = (range: ReportDateRange) => {
  if (!range.from || !range.to) return false;

  return contentDateFromInput(range.from) <= contentDateFromInput(range.to);
};
const formatCountLabel = (value: number, singular: string, plural: string) =>
  `${numberFormatter.format(value)} ${value === 1 ? singular : plural}`;
const formatChange = (value: number | null) => {
  if (value === null) return "sem base";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
};
const initials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CO";
const colorValue = (value?: string | null) => value || "";
const nullableText = (value?: string | null) => {
  const normalized = value?.trim();

  return normalized ? normalized : null;
};
const nullableColor = (value?: string | null) => {
  const normalized = value?.trim();

  return normalized ? normalized.toUpperCase() : null;
};

const defaultCommunityValues = (community: AdminCommunityIdentity): CommunityFormValues => ({
  description: community.description ?? "",
  name: community.name,
  visual_primary_color: colorValue(community.visual_primary_color),
});

const toCommunityPayload = (values: CommunityFormValues): AdminCommunityUpdateInput => ({
  description: nullableText(values.description),
  name: values.name.trim(),
  visual_primary_color: nullableColor(values.visual_primary_color),
});

const deriveRuleTitle = (description: string) => {
  const normalized = description.trim().replace(/\s+/g, " ");
  const title = normalized.slice(0, 80).trim();

  return title.length >= 2 ? title : "Regra da comunidade";
};

const toRulePayload = (
  values: RuleFormValues,
  rule?: Pick<AdminCommunityRule, "active" | "position">,
): AdminCommunityRuleInput => ({
  active: rule?.active ?? true,
  description: values.description.trim(),
  position: rule?.position ?? 0,
  title: deriveRuleTitle(values.description),
});

const existingRulePayload = (
  rule: AdminCommunityRule,
  position = rule.position,
): AdminCommunityRuleInput => ({
  active: rule.active,
  description: rule.description,
  position,
  title: rule.title.trim() || deriveRuleTitle(rule.description),
});

const isRuleDragBlockedTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest("button, a, input, textarea, select, label, [contenteditable='true']"),
  );
};

const isRuleDragHandleTarget = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest("[data-rule-drag-handle='true']"));

const measureRuleCards = (container: HTMLDivElement | null): RuleDragMetric[] =>
  Array.from(container?.querySelectorAll<HTMLElement>("[data-rule-card='true']") ?? [])
    .map((element) => {
      const rect = element.getBoundingClientRect();

      return {
        bottom: rect.bottom,
        height: rect.height,
        id: element.dataset.ruleId ?? "",
        top: rect.top,
      };
    })
    .filter((metric) => metric.id);

const resolveRuleSlotSize = (metrics: RuleDragMetric[], sourceIndex: number) => {
  const sourceMetric = metrics[sourceIndex];
  if (!sourceMetric) return 0;

  const nextMetric = metrics[sourceIndex + 1];
  const previousMetric = metrics[sourceIndex - 1];
  const nextGap = nextMetric ? nextMetric.top - sourceMetric.bottom : null;
  const previousGap = previousMetric ? sourceMetric.top - previousMetric.bottom : null;
  const gap = [nextGap, previousGap].find((value) => typeof value === "number" && value > 0) ?? 12;

  return sourceMetric.height + gap;
};

const resolveRuleTargetIndex = (clientY: number, session: RuleDragSession) => {
  const metricsWithoutDragged = session.metrics.filter(
    (metric) => metric.id !== session.sourceRuleId,
  );
  const beforeMetricIndex = metricsWithoutDragged.findIndex(
    (metric) => clientY < metric.top + metric.height / 2,
  );

  return beforeMetricIndex >= 0 ? beforeMetricIndex : metricsWithoutDragged.length;
};

const StatusBadge = ({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "danger" | "green" | "muted";
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black",
      tone === "green" && "bg-success/10 text-success",
      tone === "danger" && "bg-danger/10 text-danger",
      tone === "muted" && "bg-surface-muted text-muted",
    )}
  >
    {children}
  </span>
);

const MetricCard = ({
  label,
  metric,
}: {
  label: string;
  metric: AdminCommunityPerformanceMetric;
}) => (
  <div className="rounded-2xl border border-border bg-surface p-4">
    <p className="text-xs font-black text-muted">{label}</p>
    <p className="mt-3 text-2xl font-black text-foreground">
      {numberFormatter.format(metric.value)}
    </p>
    <p
      className={cn(
        "mt-2 text-xs font-black",
        metric.trend === "up" && "text-success",
        metric.trend === "down" && "text-danger",
        metric.trend === "flat" && "text-muted",
        metric.trend === "unavailable" && "text-warning",
      )}
    >
      {formatChange(metric.change_percent)} vs. período anterior
    </p>
  </div>
);

const SummaryCards = ({ detail }: { detail: AdminCommunityDetail }) => (
  <section className={cn(cardClass, "p-5")}>
    <h2 className="text-lg font-black text-foreground">Resumo da comunidade</h2>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        {
          icon: Users,
          label: "Membros",
          value: detail.summary.members_count,
        },
        {
          icon: MessageCircle,
          label: "Posts",
          value: detail.summary.posts_count,
        },
        {
          icon: MessageCircle,
          label: "Comentários",
          value: detail.summary.comments_count,
        },
        {
          icon: Star,
          label: "Posts populares",
          value: detail.summary.popular_posts_count,
        },
      ].map((item) => (
        <div className="rounded-2xl border border-border bg-surface-muted p-4" key={item.label}>
          <div className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary">
            <item.icon aria-hidden className="h-5 w-5" />
          </div>
          <p className="mt-4 text-3xl font-black text-foreground">
            {numberFormatter.format(item.value)}
          </p>
          <p className="mt-1 text-sm font-bold text-muted">{item.label}</p>
        </div>
      ))}
    </div>
  </section>
);

const PerformanceSection = ({ detail }: { detail: AdminCommunityDetail }) => {
  const points = detail.performance.points;
  const chartPoints = aggregateCalendarChartPoints(points, [
    "comments",
    "members",
    "posts",
    "reports",
  ] as const);
  const width = 760;
  const height = 260;
  const padding = { bottom: 38, left: 48, right: 20, top: 20 };
  const maxValue = Math.max(
    1,
    ...chartPoints.flatMap((point) => [point.posts, point.comments, point.members, point.reports]),
  );
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = (index: number) =>
    chartPoints.length <= 1
      ? width / 2
      : padding.left + (index * chartWidth) / (chartPoints.length - 1);
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const series = [
    {
      color: "#3300ff",
      key: "posts",
      label: "Posts",
    },
    {
      color: "#2f8cff",
      key: "comments",
      label: "Comentários",
    },
    {
      color: "#13a85b",
      key: "members",
      label: "Novos membros",
    },
    {
      color: "#e5484d",
      key: "reports",
      label: "Denúncias",
    },
  ] as const;
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));

  return (
    <section className={cn(cardClass, "p-5")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">Desempenho</h2>
          <p className="text-xs font-bold text-muted">Últimos {detail.performance.days} dias</p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-black text-muted">
          <CalendarDays aria-hidden className="h-4 w-4" />
          período real
        </span>
      </div>
      <div className="mt-5 overflow-x-auto">
        <svg
          aria-label="Gráfico de desempenho da comunidade nos últimos 30 dias"
          className="min-w-[680px]"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const value = Math.round(maxValue * ratio);
            const y = getY(value);
            return (
              <g key={`grid-${value}`}>
                <line
                  stroke="#e8edf7"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text fill="#55618a" fontSize="11" x="8" y={y + 4}>
                  {numberFormatter.format(value)}
                </text>
              </g>
            );
          })}
          {series.map((item) => {
            const path = chartPoints
              .map(
                (point, index) =>
                  `${index === 0 ? "M" : "L"}${getX(index)},${getY(point[item.key])}`,
              )
              .join(" ");

            return (
              <path
                d={path}
                fill="none"
                key={item.label}
                stroke={item.color}
                strokeLinecap="round"
                strokeWidth="3"
              />
            );
          })}
          {chartPoints
            .filter((_, index) => index % labelStep === 0 || index === chartPoints.length - 1)
            .map((point) => (
              <text
                fill="#06104a"
                fontSize="11"
                key={point.date}
                textAnchor="middle"
                x={getX(chartPoints.findIndex((item) => item.date === point.date))}
                y={height - 10}
              >
                {point.chartLabel}
              </text>
            ))}
        </svg>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {series.map((item) => (
          <span
            className="inline-flex items-center gap-2 text-xs font-bold text-muted"
            key={item.label}
          >
            <span
              aria-hidden
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Novos membros" metric={detail.performance.metrics.new_members} />
        <MetricCard label="Novos posts" metric={detail.performance.metrics.new_posts} />
        <MetricCard label="Comentários" metric={detail.performance.metrics.comments} />
        <MetricCard label="Denúncias" metric={detail.performance.metrics.reports} />
      </div>
    </section>
  );
};

const CommunityHeader = ({
  community,
  postsCount,
}: {
  community: AdminCommunityIdentity;
  postsCount: number;
}) => (
  <div className="overflow-hidden">
    <div className="flex flex-col gap-5 p-5 md:flex-row md:items-start md:justify-between md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[1.6rem] text-2xl font-black text-white"
          style={{
            background: deriveCommunityVisualPalette(community.visual_primary_color).primaryColor,
          }}
        >
          {community.avatar_url ? (
            <Image
              alt={`Avatar da comunidade ${community.name}`}
              className="object-cover"
              fill
              sizes="96px"
              src={community.avatar_url}
              unoptimized
            />
          ) : (
            initials(community.name)
          )}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
              {community.name}
            </h1>
            <StatusBadge tone="green">Ativa</StatusBadge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            {community.description || "Comunidade sem descrição cadastrada."}
          </p>
          <p className="mt-3 text-xs font-bold text-muted">
            <span className="font-black">Criada em</span>{" "}
            <span>
              {formatDate(community.created_at)} •{" "}
              {formatCountLabel(community.members_count, "seguidor", "seguidores")}
            </span>{" "}
            <span aria-hidden>•</span> <span>{formatCountLabel(postsCount, "post", "posts")}</span>
          </p>
        </div>
      </div>
      <Link
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-primary/45 bg-surface px-5 text-sm font-black text-primary shadow-control transition hover:bg-primary-soft"
        href={`/community/${community.slug}`}
        rel="noreferrer"
        target="_blank"
      >
        <Eye aria-hidden className="h-4 w-4" />
        Ver comunidade
      </Link>
    </div>
  </div>
);

const CommunityEditForm = ({
  community,
  id,
  onDone,
}: {
  community: AdminCommunityIdentity;
  id: string;
  onDone: () => void;
}) => {
  const updateMutation = useAdminCommunityUpdate(id);
  const avatarMutation = useAdminCommunityAvatarUpload(id);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const form = useForm<CommunityFormValues>({
    defaultValues: defaultCommunityValues(community),
    mode: "onSubmit",
    resolver: zodResolver(communityFormSchema),
  });

  useEffect(() => {
    form.reset(defaultCommunityValues(community));
  }, [community, form]);

  const selectedPrimaryColor = useWatch({
    control: form.control,
    name: "visual_primary_color",
  });
  const selectedPalette = useMemo(
    () => deriveCommunityVisualPalette(selectedPrimaryColor || community.visual_primary_color),
    [community.visual_primary_color, selectedPrimaryColor],
  );
  const onSubmit = async (values: CommunityFormValues) => {
    try {
      await updateMutation.mutateAsync(toCommunityPayload(values));
      toast.success("Comunidade atualizada.");
      onDone();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };
  const onAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await avatarMutation.mutateAsync(file);
      toast.success("Avatar atualizado com upload real.");
    } catch (error) {
      toast.error(resolveApiError(error));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <section className={cn(cardClass, "p-5")}>
      <h2 className="text-lg font-black text-foreground">Editar identidade da comunidade</h2>

      <FormProvider {...form}>
        <form className="mt-5 grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex justify-start">
            <input
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={onAvatarChange}
              ref={fileRef}
              type="file"
            />
            <button
              aria-label="Editar avatar da comunidade"
              className="relative h-32 w-32 rounded-[1.85rem] outline-none transition focus-visible:ring-4 focus-visible:ring-primary-soft disabled:cursor-not-allowed disabled:opacity-70"
              disabled={avatarMutation.isPending}
              onClick={() => fileRef.current?.click()}
              type="button"
            >
              <span
                className="relative grid h-32 w-32 place-items-center overflow-hidden rounded-[1.85rem] text-3xl font-black text-white ring-4 ring-primary-soft"
                style={{
                  background: selectedPalette.primaryColor,
                }}
              >
                {community.avatar_url ? (
                  <Image
                    alt={`Avatar da comunidade ${community.name}`}
                    className="object-cover"
                    fill
                    sizes="128px"
                    src={community.avatar_url}
                    unoptimized
                  />
                ) : (
                  initials(community.name)
                )}
              </span>
              <span className="absolute right-1 bottom-1 z-10 grid h-9 w-9 place-items-center rounded-full bg-primary text-white ring-4 ring-surface shadow-admin-soft transition">
                {avatarMutation.isPending ? (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                ) : (
                  <Edit3 aria-hidden className="h-4 w-4" />
                )}
              </span>
            </button>
          </div>
          <InputController<CommunityFormValues>
            label="Nome da comunidade"
            name="name"
            placeholder="Nome"
            required
          />
          <TextareaController<CommunityFormValues>
            label="Descrição"
            name="description"
            placeholder="Descreva o objetivo da comunidade"
            rows={4}
          />
          <div className="rounded-[1.5rem] border border-border bg-surface-muted/45 p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)]">
              <div>
                <InputController<CommunityFormValues>
                  label="Cor da comunidade"
                  name="visual_primary_color"
                  placeholder="#FF8A2A"
                />
                <p className="-mt-4 text-xs font-medium leading-5 text-muted">
                  Configure apenas a cor principal. Header, tons suaves, texto e chips sao gerados
                  automaticamente a partir dela para manter contraste e consistencia.
                </p>
              </div>
              <div
                className="overflow-hidden rounded-[1.35rem] border border-border shadow-control"
                style={{
                  background: communityHeaderBackground(selectedPrimaryColor),
                }}
              >
                <div className="flex min-h-24 items-end gap-3 p-4">
                  <span
                    className="grid h-14 w-14 place-items-center rounded-[1.1rem] text-xs font-black text-white ring-4 ring-white/80"
                    style={{
                      background: selectedPalette.primaryColor,
                    }}
                  >
                    {initials(community.name)}
                  </span>
                  <div>
                    <p
                      className="text-sm font-black"
                      style={{
                        color: selectedPalette.textColor,
                      }}
                    >
                      Previa do header
                    </p>
                    <p className="text-xs font-bold text-muted">tom suave derivado da cor</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              className="inline-flex h-11 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground"
              onClick={onDone}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-black text-white transition hover:bg-primary-hover disabled:opacity-70"
              disabled={updateMutation.isPending}
              type="submit"
            >
              {updateMutation.isPending ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Save aria-hidden className="h-4 w-4" />
              )}
              Salvar alterações
            </button>
          </div>
        </form>
      </FormProvider>
    </section>
  );
};

const TopMentorsCard = ({ mentors }: { mentors: AdminCommunityTopMentor[] }) => (
  <section className={cn(cardClass, "p-5")}>
    <h2 className="text-lg font-black text-foreground">Top mentores da comunidade</h2>
    {mentors.length === 0 ? (
      <p className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhuma resposta de psicólogo elegível foi encontrada nos últimos 30 dias.
      </p>
    ) : (
      <div className="mt-4 space-y-3">
        {mentors.map((mentor) => (
          <div
            className="grid gap-3 rounded-2xl border border-border p-3 sm:grid-cols-[1fr_auto]"
            key={mentor.id}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-black text-primary">
                #{mentor.position}
              </span>
              <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-muted text-xs font-black text-primary">
                {mentor.avatar ? (
                  <Image
                    alt={`Avatar de ${mentor.name}`}
                    className="object-cover"
                    fill
                    sizes="40px"
                    src={mentor.avatar}
                    unoptimized
                  />
                ) : (
                  initials(mentor.name)
                )}
              </div>
              <div>
                <p className="font-black text-foreground">{mentor.name}</p>
                <p className="text-xs text-muted">{mentor.crp || "CRP não informado"}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-right text-xs">
              <span>
                <strong className="block text-base text-foreground">
                  {numberFormatter.format(mentor.replies_count)}
                </strong>
                Respostas
              </span>
              <span>
                <strong className="block text-base text-foreground">
                  {numberFormatter.format(mentor.upvotes_count)}
                </strong>
                Upvotes
              </span>
              <span>
                <strong className="block text-base text-foreground">
                  {mentor.rating_avg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                </strong>
                Avaliação
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
);

const PopularPostsCard = ({ posts }: { posts: AdminCommunityPopularPost[] }) => (
  <section className={cn(cardClass, "p-5")}>
    <h2 className="text-lg font-black text-foreground">Posts mais populares</h2>
    {posts.length === 0 ? (
      <p className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhum post publicado real foi encontrado nesta comunidade.
      </p>
    ) : (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="border-b border-border py-3 pr-4 font-black">Post</th>
              <th className="border-b border-border px-4 py-3 font-black">Autor</th>
              <th className="border-b border-border px-4 py-3 font-black">Upvotes</th>
              <th className="border-b border-border px-4 py-3 font-black">Comentários</th>
              <th className="border-b border-border px-4 py-3 font-black">Data</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td className="border-b border-border py-4 pr-4 font-black text-foreground">
                  {post.title}
                </td>
                <td className="border-b border-border px-4 py-4">
                  <p className="font-bold text-foreground">{post.author_name}</p>
                  <p className="text-xs capitalize text-muted">{post.author_role}</p>
                </td>
                <td className="border-b border-border px-4 py-4 font-black">
                  {numberFormatter.format(post.upvotes_count)}
                </td>
                <td className="border-b border-border px-4 py-4 font-black">
                  {numberFormatter.format(post.comments_count)}
                </td>
                <td className="border-b border-border px-4 py-4">
                  {formatDateTime(post.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const RuleEditForm = ({
  disabled,
  onCancel,
  onSubmit,
  rule,
}: {
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (values: RuleFormValues) => Promise<void>;
  rule: AdminCommunityRule;
}) => {
  const form = useForm<RuleFormValues>({
    defaultValues: {
      description: rule.description,
    },
    resolver: zodResolver(ruleFormSchema),
  });

  return (
    <FormProvider {...form}>
      <form
        className="grid gap-3 rounded-2xl border border-border bg-surface-muted p-3"
        noValidate
        onSubmit={form.handleSubmit((values) => void onSubmit(values))}
      >
        <TextareaController<RuleFormValues>
          label="Texto da regra"
          name="description"
          required
          rows={3}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            className="h-10 rounded-control border border-border bg-surface px-4 text-sm font-black"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="h-10 rounded-control bg-primary px-4 text-sm font-black text-white disabled:opacity-70"
            disabled={disabled}
            type="submit"
          >
            Salvar regra
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

const RuleCreateModal = ({
  disabled,
  nextPosition,
  onClose,
  onSubmit,
  open,
}: {
  disabled: boolean;
  nextPosition: number;
  onClose: () => void;
  onSubmit: (input: AdminCommunityRuleInput) => Promise<boolean>;
  open: boolean;
}) => {
  const form = useForm<RuleFormValues>({
    defaultValues: {
      description: "",
    },
    resolver: zodResolver(ruleFormSchema),
  });

  useEffect(() => {
    if (!open) {
      form.reset({ description: "" });
    }
  }, [form, open]);

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <FormProvider {...form}>
        <form
          className="w-full max-w-xl rounded-card border border-border bg-surface p-5 shadow-admin-soft"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            const created = await onSubmit({ ...toRulePayload(values), position: nextPosition });
            if (created) {
              form.reset({ description: "" });
              onClose();
            }
          })}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-foreground">Criar nova regra</h3>
              <p className="mt-1 text-sm text-muted">Informe o texto exibido na comunidade.</p>
            </div>
          </div>
          <div className="mt-4">
            <TextareaController<RuleFormValues>
              label="Texto da regra"
              name="description"
              placeholder="Digite a regra da comunidade"
              required
              rows={4}
            />
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              className="h-10 rounded-control border border-border bg-surface px-4 text-sm font-black"
              disabled={disabled}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="h-10 rounded-control bg-primary px-4 text-sm font-black text-white disabled:opacity-70"
              disabled={disabled}
              type="submit"
            >
              Criar regra
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

const RulesManager = ({ id, rules }: { id: string; rules: AdminCommunityRule[] }) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [dragState, setDragState] = useState<RuleDragState | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [optimisticRuleOrderIds, setOptimisticRuleOrderIds] = useState<string[] | null>(null);
  const optimisticRuleOrderIdsRef = useRef<string[] | null>(null);
  const dragSessionRef = useRef<RuleDragSession | null>(null);
  const dragStateRef = useRef<RuleDragState | null>(null);
  const ruleOrderPersistenceRef = useRef<Promise<void>>(Promise.resolve());
  const rulesListRef = useRef<HTMLDivElement | null>(null);
  const createMutation = useAdminCommunityCreateRule(id);
  const updateMutation = useAdminCommunityUpdateRule(id);
  const deleteMutation = useAdminCommunityDeleteRule(id);
  const sortedRules = useMemo(
    () =>
      [...rules].sort(
        (left, right) =>
          left.position - right.position ||
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime() ||
          left.id.localeCompare(right.id),
      ),
    [rules],
  );
  const orderedRules = useMemo(() => {
    if (!optimisticRuleOrderIds) return sortedRules;

    const rulesById = new Map(sortedRules.map((rule) => [rule.id, rule]));
    const ordered = optimisticRuleOrderIds
      .map((ruleId) => rulesById.get(ruleId))
      .filter((rule): rule is AdminCommunityRule => Boolean(rule));
    const orderedIds = new Set(ordered.map((rule) => rule.id));
    const missingRules = sortedRules.filter((rule) => !orderedIds.has(rule.id));

    return [...ordered, ...missingRules];
  }, [optimisticRuleOrderIds, sortedRules]);
  const nextPosition =
    sortedRules.length > 0 ? Math.max(...sortedRules.map((rule) => rule.position)) + 1 : 0;

  const updateRuleDragState = (nextState: RuleDragState | null) => {
    dragStateRef.current = nextState;
    setDragState(nextState);
  };
  const updateOptimisticRuleOrder = (ruleOrderIds: string[] | null) => {
    optimisticRuleOrderIdsRef.current = ruleOrderIds;
    setOptimisticRuleOrderIds(ruleOrderIds);
  };
  const resolveCurrentRuleOrder = () => {
    const ruleOrderIds = optimisticRuleOrderIdsRef.current;
    if (!ruleOrderIds) return [...sortedRules];

    const rulesById = new Map(sortedRules.map((rule) => [rule.id, rule]));
    const currentOrder = ruleOrderIds
      .map((ruleId) => rulesById.get(ruleId))
      .filter((rule): rule is AdminCommunityRule => Boolean(rule));
    const currentOrderIds = new Set(currentOrder.map((rule) => rule.id));
    const missingRules = sortedRules.filter((rule) => !currentOrderIds.has(rule.id));

    return [...currentOrder, ...missingRules];
  };

  const updateRule = async (rule: AdminCommunityRule, input: AdminCommunityRuleInput) => {
    try {
      await updateMutation.mutateAsync({ input, ruleId: rule.id });
      toast.success("Regra atualizada.");
      setEditingRuleId(null);
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };
  const createRule = async (input: AdminCommunityRuleInput) => {
    try {
      await createMutation.mutateAsync(input);
      toast.success("Regra adicionada.");

      return true;
    } catch (error) {
      toast.error(resolveApiError(error));

      return false;
    }
  };
  const deleteRule = async (rule: AdminCommunityRule) => {
    if (!window.confirm("Remover esta regra?")) return;

    try {
      await deleteMutation.mutateAsync(rule.id);
      toast.success("Regra removida.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };
  const reorderRules = async (sourceRuleId: string, targetIndex: number) => {
    const currentOrder = resolveCurrentRuleOrder();
    const sourceIndex = currentOrder.findIndex((rule) => rule.id === sourceRuleId);
    if (sourceIndex < 0) return;

    const [draggedRule] = currentOrder.splice(sourceIndex, 1);
    if (!draggedRule) return;

    const boundedTargetIndex = Math.max(0, Math.min(targetIndex, currentOrder.length));
    currentOrder.splice(boundedTargetIndex, 0, draggedRule);

    if (currentOrder.every((rule, index) => rule.id === orderedRules[index]?.id)) return;

    const orderedPositions = sortedRules.map((_, index) => index);
    const updates = currentOrder
      .map((rule, index) => ({ position: orderedPositions[index] ?? index, rule }))
      .filter(({ position, rule }) => rule.position !== position);

    if (updates.length === 0) return;

    updateOptimisticRuleOrder(currentOrder.map((rule) => rule.id));

    const persistOrder = async () => {
      await Promise.all(
        updates.map(({ position, rule }) =>
          updateMutation.mutateAsync({
            input: existingRulePayload(rule, position),
            ruleId: rule.id,
          }),
        ),
      );
    };

    const persistence = ruleOrderPersistenceRef.current.then(persistOrder, persistOrder);
    ruleOrderPersistenceRef.current = persistence.catch(() => undefined);

    try {
      await persistence;
      toast.success("Ordem das regras atualizada.");
    } catch (error) {
      updateOptimisticRuleOrder(null);
      toast.error(resolveApiError(error));
    }
  };
  const handlePointerDown = (
    event: PointerEvent<HTMLElement>,
    ruleId: string,
    sourceIndex: number,
  ) => {
    if (editingRuleId) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (isRuleDragBlockedTarget(event.target)) return;
    if (event.pointerType !== "mouse" && !isRuleDragHandleTarget(event.target)) return;

    const metrics = measureRuleCards(rulesListRef.current);
    const metricSourceIndex = metrics.findIndex((metric) => metric.id === ruleId);
    const resolvedSourceIndex = metricSourceIndex >= 0 ? metricSourceIndex : sourceIndex;
    const draggedSlotSize = resolveRuleSlotSize(metrics, resolvedSourceIndex);

    if (metrics.length < 2 || draggedSlotSize <= 0) return;

    const nextState = {
      draggedSlotSize,
      offsetY: 0,
      sourceIndex: resolvedSourceIndex,
      sourceRuleId: ruleId,
      targetIndex: resolvedSourceIndex,
    };

    dragSessionRef.current = {
      draggedSlotSize,
      metrics,
      pointerId: event.pointerId,
      sourceIndex: resolvedSourceIndex,
      sourceRuleId: ruleId,
      startClientY: event.clientY,
    };
    updateRuleDragState(nextState);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const handlePointerMove = (event: PointerEvent<HTMLElement>, ruleId: string) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId || session.sourceRuleId !== ruleId)
      return;

    const nextState = {
      draggedSlotSize: session.draggedSlotSize,
      offsetY: event.clientY - session.startClientY,
      sourceIndex: session.sourceIndex,
      sourceRuleId: session.sourceRuleId,
      targetIndex: resolveRuleTargetIndex(event.clientY, session),
    };

    updateRuleDragState(nextState);
    event.preventDefault();
  };
  const handlePointerEnd = (event: PointerEvent<HTMLElement>, ruleId: string) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId || session.sourceRuleId !== ruleId)
      return;

    const targetIndex = dragStateRef.current?.targetIndex ?? session.sourceIndex;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragSessionRef.current = null;
    updateRuleDragState(null);
    event.preventDefault();

    if (targetIndex !== session.sourceIndex) {
      void reorderRules(session.sourceRuleId, targetIndex);
    }
  };
  const cancelPointerDrag = (event: PointerEvent<HTMLElement>, ruleId: string) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId || session.sourceRuleId !== ruleId)
      return;

    dragSessionRef.current = null;
    updateRuleDragState(null);
  };
  const resolveRuleTransform = (ruleId: string, index: number) => {
    if (!dragState) return undefined;
    if (ruleId === dragState.sourceRuleId) {
      return `translate3d(0, ${dragState.offsetY}px, 0)`;
    }

    if (
      dragState.targetIndex > dragState.sourceIndex &&
      index > dragState.sourceIndex &&
      index <= dragState.targetIndex
    ) {
      return `translate3d(0, -${dragState.draggedSlotSize}px, 0)`;
    }

    if (
      dragState.targetIndex < dragState.sourceIndex &&
      index >= dragState.targetIndex &&
      index < dragState.sourceIndex
    ) {
      return `translate3d(0, ${dragState.draggedSlotSize}px, 0)`;
    }

    return undefined;
  };

  return (
    <>
      <section className={cn(cardClass, "p-5")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-black text-foreground">Regras da comunidade</h2>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white shadow-sm transition hover:bg-primary/90 sm:ml-auto"
            onClick={() => setCreateModalOpen(true)}
            type="button"
          >
            <Plus aria-hidden className="h-4 w-4" />
            Criar nova regra
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">
          {formatCountLabel(sortedRules.length, "regra exibida", "regras exibidas")} na comunidade.
        </p>

        <div className="mt-5 space-y-3" ref={rulesListRef}>
          {orderedRules.length === 0 ? (
            <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
              Nenhuma regra cadastrada para esta comunidade.
            </p>
          ) : (
            orderedRules.map((rule, index) => {
              const isEditing = editingRuleId === rule.id;
              const isDragging = dragState?.sourceRuleId === rule.id;
              const transform = resolveRuleTransform(rule.id, index);

              return (
                <article
                  aria-grabbed={isDragging}
                  className={cn(
                    "rounded-2xl border border-border bg-surface p-4 will-change-transform",
                    isDragging
                      ? "relative z-20 cursor-grabbing select-none border-primary bg-primary-soft/50 shadow-admin-soft ring-2 ring-primary/20"
                      : "transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out",
                    !isEditing && !dragState && "cursor-grab",
                    !isEditing && dragState && !isDragging && "pointer-events-none",
                  )}
                  data-rule-card="true"
                  data-rule-id={rule.id}
                  key={rule.id}
                  onLostPointerCapture={(event) => cancelPointerDrag(event, rule.id)}
                  onPointerCancel={(event) => cancelPointerDrag(event, rule.id)}
                  onPointerDown={(event) => handlePointerDown(event, rule.id, index)}
                  onPointerMove={(event) => handlePointerMove(event, rule.id)}
                  onPointerUp={(event) => handlePointerEnd(event, rule.id)}
                  style={transform ? { transform } : undefined}
                >
                  {isEditing ? (
                    <RuleEditForm
                      disabled={updateMutation.isPending}
                      onCancel={() => setEditingRuleId(null)}
                      onSubmit={(values) => updateRule(rule, toRulePayload(values, rule))}
                      rule={rule}
                    />
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-black text-primary">
                          {index + 1}
                        </span>
                        <GripVertical
                          aria-hidden
                          className="mt-1.5 h-5 w-5 shrink-0 touch-none text-muted"
                          data-rule-drag-handle="true"
                        />
                        <p className="min-w-0 text-sm leading-6 text-muted">{rule.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <button
                          aria-label="Editar regra"
                          className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted transition hover:border-primary hover:text-primary"
                          onClick={() => setEditingRuleId(rule.id)}
                          title="Editar regra"
                          type="button"
                        >
                          <Edit3 aria-hidden className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Remover regra"
                          className="grid h-10 w-10 place-items-center rounded-xl border border-red-100 text-danger transition hover:bg-red-50"
                          disabled={deleteMutation.isPending}
                          onClick={() => void deleteRule(rule)}
                          title="Remover regra"
                          type="button"
                        >
                          <Trash2 aria-hidden className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>

      <RuleCreateModal
        disabled={createMutation.isPending}
        nextPosition={nextPosition}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={createRule}
        open={createModalOpen}
      />
    </>
  );
};

const CommunityTabs = ({ activeTab, pathname }: { activeTab: CommunityTab; pathname: string }) => (
  <nav
    aria-label="Abas da comunidade"
    className="overflow-x-auto border-t border-border bg-surface-muted/40 px-3"
  >
    <div className="flex min-w-max gap-1 py-1">
      {communityTabs.map((tab) => {
        const active = tab.id === activeTab;

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-black transition",
              active ? "text-primary" : "text-foreground hover:text-primary",
            )}
            href={tab.id === "geral" ? pathname : `${pathname}?tab=${tab.id}`}
            key={tab.id}
          >
            <span>{tab.label}</span>
            {active ? (
              <span className="absolute inset-x-4 bottom-1 h-1 rounded-full bg-primary" />
            ) : null}
          </Link>
        );
      })}
    </div>
  </nav>
);

const PaginationControls = ({
  page,
  pages,
  setPage,
}: {
  page: number;
  pages: number;
  setPage: (page: number) => void;
}) => {
  const safePages = Math.max(1, pages);
  const currentPage = Math.min(Math.max(1, page), safePages);
  const start = Math.min(Math.max(currentPage - 2, 1), Math.max(safePages - 4, 1));

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        aria-label="Página anterior"
        className="grid h-10 w-10 place-items-center rounded-control border border-border bg-surface text-foreground disabled:opacity-40"
        disabled={currentPage <= 1}
        onClick={() => setPage(Math.max(1, currentPage - 1))}
        title="Página anterior"
        type="button"
      >
        <ChevronLeft aria-hidden className="h-4 w-4" />
      </button>
      {Array.from({ length: Math.min(5, safePages) }, (_, index) => {
        const itemPage = start + index;
        if (itemPage > safePages) return null;

        return (
          <button
            aria-current={itemPage === currentPage ? "page" : undefined}
            className={cn(
              "h-10 min-w-10 rounded-control border px-3 text-sm font-black",
              itemPage === currentPage
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-foreground",
            )}
            key={itemPage}
            onClick={() => setPage(itemPage)}
            type="button"
          >
            {numberFormatter.format(itemPage)}
          </button>
        );
      })}
      <button
        aria-label="Próxima página"
        className="grid h-10 w-10 place-items-center rounded-control border border-border bg-surface text-foreground disabled:opacity-40"
        disabled={currentPage >= safePages}
        onClick={() => setPage(Math.min(safePages, currentPage + 1))}
        title="Próxima página"
        type="button"
      >
        <ChevronRight aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
};

const QueryStatus = ({
  error,
  loading,
  onRetry,
}: {
  error: unknown;
  loading: boolean;
  onRetry: () => void;
}) => {
  if (loading) {
    return (
      <div className="rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
        Carregando dados reais...
      </div>
    );
  }

  if (!error) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between">
      <span>{resolveApiError(error)}</span>
      <button className="font-black" onClick={onRetry} type="button">
        Tentar novamente
      </button>
    </div>
  );
};

const RemoveContentForm = ({
  item,
  onCancel,
  slug,
}: {
  item: AdminCommunityContentItem;
  onCancel: () => void;
  slug: string;
}) => {
  const mutation = useAdminCommunityRemoveContent(slug);
  const form = useForm<RemoveContentFormValues>({
    defaultValues: {
      confirmation: "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(removeContentFormSchema),
  });

  const onSubmit = async (values: RemoveContentFormValues) => {
    try {
      await mutation.mutateAsync({
        input: {
          confirmation: values.confirmation,
          reason: values.reason.trim(),
        },
        targetId: item.content_id,
        targetType: item.type,
      });
      toast.success("Conteúdo removido com auditoria administrativa.");
      form.reset();
      onCancel();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form
        className="mt-3 grid gap-3 rounded-2xl border border-red-100 bg-red-50 p-3"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div>
          <p className="text-sm font-black text-danger">Remoção administrativa de conteúdo</p>
          <p className="mt-1 text-xs leading-5 text-danger">
            A ação remove o {item.type === "post" ? "post" : "comentário"} e registra auditoria
            real. Quando for post, os comentários vinculados também são encerrados.
          </p>
        </div>
        <TextareaController<RemoveContentFormValues>
          label="Motivo interno obrigatório"
          name="reason"
          required
          rows={3}
        />
        <InputController<RemoveContentFormValues>
          label="Confirmação forte"
          name="confirmation"
          placeholder="REMOVER CONTEUDO"
          required
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            className="h-10 rounded-control border border-border bg-surface px-4 text-xs font-black text-foreground"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-danger px-4 text-xs font-black text-white disabled:opacity-70"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Remover conteúdo
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

const ContentMediaThumbnail = ({ item }: { item: AdminCommunityContentItem }) => {
  if (!item.media) return null;

  const mediaType = item.media.media_type.toLowerCase();
  const isVideo = mediaType === "video";
  const imageSrc = mediaType === "image" ? renderableImageSrc(item.media.media_url) : null;
  const videoSrc = isVideo ? resolveAdminMediaUrl(item.media.media_url) : null;
  const mediaLabel = isVideo ? "Miniplayer de vídeo publicado" : "Miniatura de imagem publicada";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border bg-surface-muted",
        isVideo ? "aspect-[9/16] max-w-40 sm:w-28 sm:max-w-none" : "h-24 sm:h-28 sm:w-28",
      )}
    >
      {imageSrc ? (
        <Image
          alt={mediaLabel}
          className="object-cover"
          fill
          sizes="112px"
          src={imageSrc}
          unoptimized={isAdminPublicMediaUrl(item.media.media_url)}
        />
      ) : null}
      {!imageSrc && videoSrc ? <ContentVideoMiniplayer label={mediaLabel} src={videoSrc} /> : null}
      {!imageSrc && !videoSrc ? (
        <div className="grid h-full place-items-center gap-1 p-3 text-center text-xs font-black text-muted">
          <ImageIcon className="mx-auto h-5 w-5" />
          <span>Mídia publicada</span>
        </div>
      ) : null}
    </div>
  );
};

const ContentVideoMiniplayer = ({ label, src }: { label: string; src: string }) => {
  const expandedVideoRef = useRef<HTMLVideoElement | null>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);
  const videoTimeRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const syncInlineVideoTime = useCallback((time: number) => {
    videoTimeRef.current = time;
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return;
    video.currentTime = time;
  }, []);

  const playVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
      return;
    }

    video.pause();
  };

  const openExpandedVideo = () => {
    const video = videoRef.current;
    if (video) {
      videoTimeRef.current = video.currentTime;
      video.pause();
    }

    flushSync(() => {
      setIsExpanded(true);
    });

    const container = fullscreenContainerRef.current;
    if (container?.requestFullscreen) {
      void container.requestFullscreen().catch(() => undefined);
    }
  };

  const closeExpandedVideo = useCallback(() => {
    const expandedVideo = expandedVideoRef.current;
    if (expandedVideo) {
      syncInlineVideoTime(expandedVideo.currentTime);
      expandedVideo.pause();
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }

    setIsExpanded(false);
  }, [syncInlineVideoTime]);

  useEffect(() => {
    if (!isExpanded) return;

    const expandedVideo = expandedVideoRef.current;

    const syncExpandedVideo = () => {
      const currentTime = videoTimeRef.current;
      if (expandedVideo && Number.isFinite(currentTime)) {
        expandedVideo.currentTime = currentTime;
        void expandedVideo.play().catch(() => undefined);
      }
    };

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) return;

      const currentTime = expandedVideoRef.current?.currentTime ?? videoTimeRef.current;
      syncInlineVideoTime(currentTime);
      setIsExpanded(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) {
        closeExpandedVideo();
      }
    };

    if (expandedVideo?.readyState) {
      syncExpandedVideo();
    } else {
      expandedVideo?.addEventListener("loadedmetadata", syncExpandedVideo, { once: true });
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      expandedVideo?.removeEventListener("loadedmetadata", syncExpandedVideo);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeExpandedVideo, isExpanded, syncInlineVideoTime]);

  return (
    <div className="relative h-full w-full bg-black">
      <video
        aria-label={label}
        className="admin-community-video-player h-full w-full object-cover"
        controls
        controlsList="nofullscreen noremoteplayback"
        disablePictureInPicture
        muted
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => {
          videoTimeRef.current = event.currentTarget.currentTime;
        }}
        playsInline
        preload="metadata"
        ref={videoRef}
        src={src}
      />
      {!isPlaying ? (
        <button
          aria-label="Reproduzir vídeo publicado"
          className="absolute left-1/2 top-1/2 inline-flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-foreground/70 text-background shadow-sm transition hover:bg-foreground"
          onClick={playVideo}
          type="button"
        >
          <Play aria-hidden className="h-5 w-5 fill-current" />
        </button>
      ) : null}
      <button
        aria-label="Ampliar vídeo publicado em 9:16"
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/70 text-background shadow-sm transition hover:bg-foreground"
        onClick={openExpandedVideo}
        title="Ampliar vídeo"
        type="button"
      >
        <Maximize2 aria-hidden className="h-4 w-4" />
      </button>
      {isExpanded ? (
        <div
          aria-label="Vídeo ampliado em 9:16"
          aria-modal="true"
          className="fixed inset-0 z-[9999] grid place-items-center bg-black p-4"
          ref={fullscreenContainerRef}
          role="dialog"
        >
          <button
            aria-label="Fechar vídeo ampliado"
            className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white shadow-sm transition hover:bg-white/25"
            onClick={closeExpandedVideo}
            title="Fechar"
            type="button"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
          <video
            aria-label={`${label} ampliado`}
            className="admin-community-video-expanded object-cover"
            controls
            controlsList="nofullscreen noremoteplayback"
            disablePictureInPicture
            muted
            onEnded={() => closeExpandedVideo()}
            onTimeUpdate={(event) => {
              videoTimeRef.current = event.currentTarget.currentTime;
            }}
            playsInline
            preload="metadata"
            ref={expandedVideoRef}
            src={src}
          />
        </div>
      ) : null}
    </div>
  );
};

const WhatsAppIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("h-4 w-4 shrink-0", className)}
    fill="none"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>WhatsApp</title>
    <path
      d="M14.56 11.985C14.3125 11.8608 13.095 11.2625 12.8683 11.1791C12.6408 11.0966 12.4758 11.0558 12.31 11.3041C12.1458 11.5516 11.6708 12.1091 11.5267 12.2741C11.3825 12.44 11.2375 12.46 10.99 12.3366C10.7425 12.2116 9.94417 11.9508 8.99833 11.1075C8.2625 10.4508 7.765 9.63997 7.62083 9.39164C7.47667 9.14414 7.60583 9.00997 7.72917 8.88664C7.84083 8.77581 7.9775 8.59747 8.10083 8.45331C8.225 8.30831 8.26583 8.20497 8.34917 8.03914C8.43167 7.87414 8.39083 7.72997 8.32833 7.60581C8.26583 7.48247 7.77083 6.26247 7.565 5.76664C7.36333 5.28414 7.15917 5.34997 7.0075 5.34164C6.86333 5.33497 6.69833 5.33331 6.5325 5.33331C6.3675 5.33331 6.09917 5.39497 5.8725 5.64331C5.64583 5.89081 5.00583 6.48997 5.00583 7.70914C5.00583 8.92747 5.89333 10.105 6.01667 10.2708C6.14083 10.4358 7.76333 12.9375 10.2475 14.01C10.8383 14.265 11.2992 14.4175 11.6592 14.5308C12.2525 14.72 12.7925 14.6933 13.2183 14.6291C13.6942 14.5583 14.6833 14.03 14.89 13.4516C15.0967 12.8733 15.0967 12.3775 15.0342 12.2741C14.9725 12.1708 14.8075 12.1091 14.5592 11.985H14.56ZM10.0417 18.1541H10.0383C8.56314 18.1543 7.11507 17.7576 5.84583 17.0058L5.545 16.8275L2.4275 17.6458L3.25917 14.6058L3.06333 14.2941C2.2387 12.981 1.80245 11.4614 1.805 9.91081C1.80583 5.36914 5.50167 1.67414 10.045 1.67414C12.245 1.67414 14.3133 2.53247 15.8683 4.08914C17.418 5.63201 18.2861 7.7307 18.2792 9.91747C18.2767 14.4591 14.5817 18.1541 10.0417 18.1541ZM17.0525 2.90664C15.1979 1.03979 12.6731 -0.00695713 10.0417 -2.68403e-05C4.50917 -2.68403e-05 0.00833333 4.49414 0.005 10.0208C0.005 11.7875 0.455 13.5141 1.31417 15.0275L0 20L5.0975 18.6625C6.5981 19.5304 8.30145 19.9864 10.035 19.9841H10.0392C15.57 19.9841 20.0708 15.4916 20.0742 9.96581C20.0929 7.30066 19.0317 4.7415 17.1325 2.87164L17.0525 2.90664Z"
      fill="currentColor"
    />
  </svg>
);

const ContentMetrics = ({ item }: { item: AdminCommunityContentItem }) => {
  const hasWhatsappMetric = item.author.role === "psicologo";

  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Eye aria-hidden className="h-4 w-4" />
          {numberFormatter.format(item.metrics.views_count)} visualizações
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ArrowUp aria-hidden className="h-4 w-4" />
          {numberFormatter.format(item.metrics.upvotes_count)} upvotes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ArrowDown aria-hidden className="h-4 w-4" />
          {numberFormatter.format(item.metrics.downvotes_count)} downvotes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle aria-hidden className="h-4 w-4" />
          {numberFormatter.format(item.metrics.comments_count)} comentários
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Bookmark aria-hidden className="h-4 w-4" />
          {numberFormatter.format(item.metrics.saves_count)} salvos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Share2 aria-hidden className="h-4 w-4" />
          {numberFormatter.format(item.metrics.shares_count)} compartilhamentos
        </span>
        {hasWhatsappMetric ? (
          <span className="inline-flex items-center gap-1.5">
            <WhatsAppIcon aria-hidden />
            {numberFormatter.format(item.metrics.whatsapp_clicks_count)} cliques WhatsApp
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <AlertTriangle aria-hidden className="h-4 w-4" />
          {numberFormatter.format(item.metrics.reports_count)} denúncias
        </span>
      </div>
    </div>
  );
};

const ContentItemHeader = ({ item }: { item: AdminCommunityContentItem }) => (
  <div className="flex flex-wrap items-center gap-2">
    {item.status === "removed" ? <StatusBadge tone="muted">Removido</StatusBadge> : null}
    <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-black text-muted">
      {item.content_kind_label}
    </span>
    <span className="text-xs font-bold text-muted">{formatDateTime(item.created_at)}</span>
  </div>
);

const ContentItemBody = ({ item }: { item: AdminCommunityContentItem }) => {
  const hasText = item.excerpt.trim().length > 0;

  if (item.type === "post") {
    return (
      <div className="min-w-0">
        <h3 className="text-base font-black text-foreground">{item.title || "Post sem título"}</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{hasText ? item.excerpt : "Sem texto."}</p>
      </div>
    );
  }

  if (!hasText) return null;

  return <p className="text-sm leading-6 text-muted">{item.excerpt}</p>;
};

const VerifiedBadgeIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("h-4 w-4 shrink-0 text-primary", className)}
    fill="none"
    viewBox="0 0 30 28"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>Perfil verificado</title>
    <path
      d="M10.3636 28L7.77273 23.7333L2.86364 22.6667L3.34091 17.7333L0 14L3.34091 10.2667L2.86364 5.33333L7.77273 4.26667L10.3636 0L15 1.93333L19.6364 0L22.2273 4.26667L27.1364 5.33333L26.6591 10.2667L30 14L26.6591 17.7333L27.1364 22.6667L22.2273 23.7333L19.6364 28L15 26.0667L10.3636 28ZM13.5682 18.7333L21.2727 11.2L19.3636 9.26667L13.5682 14.9333L10.6364 12.1333L8.72727 14L13.5682 18.7333Z"
      fill="currentColor"
    />
  </svg>
);

const crpRegionByUf: Record<string, string> = {
  AC: "20",
  AL: "15",
  AM: "20",
  AP: "10",
  BA: "03",
  CE: "11",
  DF: "01",
  ES: "16",
  GO: "09",
  MA: "22",
  MG: "04",
  MS: "14",
  MT: "18",
  PA: "10",
  PB: "13",
  PE: "02",
  PI: "21",
  PR: "08",
  RJ: "05",
  RN: "17",
  RO: "20",
  RR: "20",
  RS: "07",
  SC: "12",
  SE: "19",
  SP: "06",
  TO: "23",
};

const formatRankingCrp = (crp: string | null) => {
  const value = crp?.trim();

  if (!value) return null;

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const slashIndex = normalized.lastIndexOf("/");
  const regionSource = slashIndex >= 0 ? normalized.slice(0, slashIndex) : normalized;
  const registrationSource = slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized;
  const regionDigits = regionSource.match(/\d{1,2}/)?.[0];
  const regionUf = regionSource.match(/\b[A-Z]{2}\b/)?.[0];
  const fallbackRegionDigits = normalized.match(/\d{1,2}/)?.[0];
  const region = (
    regionDigits ??
    (regionUf ? crpRegionByUf[regionUf] : null) ??
    fallbackRegionDigits
  )
    ?.padStart(2, "0")
    .slice(-2);
  const registrationDigits = registrationSource.replace(/\D/g, "");
  const registration = (registrationDigits.replace(/^0+/, "") || "0").padStart(4, "0").slice(-4);

  if (!region || !registrationDigits) return null;

  return `${region}/${registration}`;
};

const psychologistRoleLabel = (gender?: string | null) =>
  gender?.trim().toLowerCase() === "feminino" ? "Psicóloga" : "Psicólogo";

const ContentAuthorIdentity = ({
  className,
  item,
}: {
  className?: string;
  item: AdminCommunityContentItem;
}) => {
  const avatarSrc = renderableImageSrc(item.author.avatar);
  const roleLabel =
    item.author.role === "psicologo" ? psychologistRoleLabel(item.author.gender) : "Paciente";

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-primary-soft text-xs font-black text-primary">
        {avatarSrc ? (
          <Image
            alt={`Foto de perfil de ${item.author.name}`}
            className="object-cover"
            fill
            sizes="40px"
            src={avatarSrc}
            unoptimized={isAdminPublicMediaUrl(item.author.avatar)}
          />
        ) : (
          initials(item.author.name)
        )}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-black text-foreground">{item.author.name}</span>
          {item.author.verified ? <VerifiedBadgeIcon aria-label="Perfil verificado" /> : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-muted">
          <span>{roleLabel}</span>
          {item.author.anonymous ? (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 font-black text-primary">
              Post feito anonimamente
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const ContentItemMain = ({ item }: { item: AdminCommunityContentItem }) => {
  const mediaTextGridClass = cn(
    "mt-3 grid min-w-0 gap-3",
    item.media && "sm:grid-cols-[112px_1fr]",
  );

  if (item.type === "comment") {
    return (
      <div className="min-w-0">
        <ContentItemHeader item={item} />
        <ContentAuthorIdentity className="mt-3" item={item} />
        <div className={mediaTextGridClass}>
          <ContentMediaThumbnail item={item} />
          <div className="min-w-0">
            <ContentItemBody item={item} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <ContentItemHeader item={item} />
      <ContentAuthorIdentity className="mt-3" item={item} />
      <div className={mediaTextGridClass}>
        <ContentMediaThumbnail item={item} />
        <ContentItemBody item={item} />
      </div>
    </div>
  );
};

const ContentItemCard = ({
  item,
  selected,
  setSelected,
  slug,
}: {
  item: AdminCommunityContentItem;
  selected: boolean;
  setSelected: (item: AdminCommunityContentItem | null) => void;
  slug: string;
}) => (
  <article className="rounded-2xl border border-border bg-surface p-4">
    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
      <ContentItemMain item={item} />
      <div className="flex justify-end gap-2 lg:flex-col">
        <Link
          aria-label="Ver conteúdo no site"
          className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-border text-foreground transition hover:border-primary hover:text-primary"
          href={toPublicHref(item.public_url)}
          rel="noreferrer"
          target="_blank"
          title="Ver no site"
        >
          <Eye aria-hidden className="h-4 w-4" />
          <span className="sr-only">Ver no site</span>
        </Link>
        {item.status === "published" ? (
          <button
            aria-label={selected ? "Fechar exclusão" : "Excluir conteúdo"}
            aria-pressed={selected}
            className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-danger/20 text-danger transition hover:bg-danger/10"
            onClick={() => setSelected(selected ? null : item)}
            title={selected ? "Fechar exclusão" : "Excluir"}
            type="button"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
            <span className="sr-only">{selected ? "Fechar exclusão" : "Excluir"}</span>
          </button>
        ) : null}
      </div>
    </div>
    <ContentMetrics item={item} />
    {selected ? (
      <RemoveContentForm item={item} onCancel={() => setSelected(null)} slug={slug} />
    ) : null}
  </article>
);

type ContentBaseQuery = Pick<AdminCommunityContentQuery, "limit" | "page" | "q" | "type">;

const ContentTab = ({ createdAt, slug }: { createdAt: string; slug: string }) => {
  const [query, setQuery] = useState<ContentBaseQuery>({
    limit: 10,
    page: 1,
    q: "",
    type: "all",
  });
  const [selectedPeriod, setSelectedPeriod] = useState<ContentPeriodValue>("all");
  const [appliedPeriod, setAppliedPeriod] = useState<ContentPeriodValue>("all");
  const [draftRange, setDraftRange] = useState<ContentCustomRange>(() =>
    getContentRangeForPeriod("all", createdAt),
  );
  const [appliedRange, setAppliedRange] = useState<ContentCustomRange>(() =>
    getContentRangeForPeriod("all", createdAt),
  );
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminCommunityContentItem | null>(null);
  const contentQueryInput = useMemo<AdminCommunityContentQuery>(
    () => ({
      ...query,
      from: appliedPeriod === "custom" ? appliedRange.from : undefined,
      period: appliedPeriod,
      to: appliedPeriod === "custom" ? appliedRange.to : undefined,
    }),
    [appliedPeriod, appliedRange.from, appliedRange.to, query],
  );
  const result = useAdminCommunityContent(slug, contentQueryInput);

  const updateQuery = (patch: Partial<ContentBaseQuery>) => {
    setSelected(null);
    setQuery((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };
  const handlePeriodChange = (period: ContentPeriodValue) => {
    setSelectedPeriod(period);
    setRangeError(null);
    updateQuery({});

    if (period === "custom") {
      if (!isValidContentRange(draftRange)) {
        setRangeError(
          "Informe um período personalizado completo, com data inicial menor ou igual à final.",
        );
        return;
      }

      setAppliedPeriod("custom");
      setAppliedRange(draftRange);
      return;
    }

    const nextRange = getContentRangeForPeriod(period, createdAt);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
    setAppliedPeriod(period);
  };
  const handleCustomDateChange = (field: keyof ContentCustomRange, value: string) => {
    const nextRange = { ...draftRange, [field]: value };

    setSelectedPeriod("custom");
    setDraftRange(nextRange);
    updateQuery({});

    if (!isValidContentRange(nextRange)) {
      setRangeError(
        "Informe um período personalizado completo, com data inicial menor ou igual à final.",
      );
      return;
    }

    setRangeError(null);
    setAppliedPeriod("custom");
    setAppliedRange(nextRange);
  };

  return (
    <div className="space-y-5">
      <section className={cn(cardClass, "p-5")}>
        <div className="grid gap-3 lg:grid-cols-[1.35fr_0.95fr_0.85fr_0.65fr_0.65fr]">
          <label className="block text-sm font-black text-muted">
            Buscar
            <span className="mt-2 flex h-11 items-center gap-2 rounded-control border border-border bg-surface px-3">
              <Search aria-hidden className="h-4 w-4 text-muted" />
              <input
                className="w-full bg-transparent text-sm font-bold text-foreground outline-none placeholder:text-subtle"
                onChange={(event) => updateQuery({ q: event.target.value })}
                placeholder="Texto, título ou autor"
                type="search"
                value={query.q ?? ""}
              />
            </span>
          </label>
          <label className="block text-sm font-black text-muted" htmlFor="community-content-type">
            Tipo
            <span className="relative mt-2 block">
              <select
                className="h-11 w-full appearance-none rounded-control border border-border bg-surface px-3 pr-12 text-sm font-bold text-foreground"
                id="community-content-type"
                onChange={(event) =>
                  updateQuery({ type: event.target.value as AdminCommunityContentQuery["type"] })
                }
                value={query.type ?? "all"}
              >
                {contentTypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              />
            </span>
          </label>
          <label className="block text-sm font-black text-muted" htmlFor="community-content-period">
            Período
            <span className="relative mt-2 block">
              <select
                className="h-11 w-full appearance-none rounded-control border border-border bg-surface px-3 pr-12 text-sm font-bold text-foreground"
                id="community-content-period"
                onChange={(event) => handlePeriodChange(event.target.value as ContentPeriodValue)}
                value={selectedPeriod}
              >
                {contentPeriodOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              />
            </span>
          </label>
          <label className="block text-sm font-black text-muted" htmlFor="community-content-from">
            De
            <input
              className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
              id="community-content-from"
              max={draftRange.to}
              onChange={(event) => handleCustomDateChange("from", event.target.value)}
              type="date"
              value={draftRange.from ?? ""}
            />
          </label>
          <label className="block text-sm font-black text-muted" htmlFor="community-content-to">
            Até
            <input
              className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
              id="community-content-to"
              min={draftRange.from}
              onChange={(event) => handleCustomDateChange("to", event.target.value)}
              type="date"
              value={draftRange.to ?? ""}
            />
          </label>
        </div>
        {rangeError ? <p className="mt-3 text-xs font-bold text-danger">{rangeError}</p> : null}
      </section>

      <section className={cn(cardClass, "p-5")}>
        <div>
          <h2 className="text-lg font-black text-foreground">Conteúdo da comunidade</h2>
          <p className="mt-1 text-sm text-muted">
            Mostrando {numberFormatter.format(result.data?.data.length ?? 0)} de{" "}
            {numberFormatter.format(result.data?.count ?? 0)} registros.
          </p>
        </div>
        <div className="mt-5 space-y-3">
          <QueryStatus
            error={result.error}
            loading={result.isLoading}
            onRetry={() => void result.refetch()}
          />
          {result.data?.data.length === 0 ? (
            <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
              Nenhum conteúdo encontrado com os filtros atuais.
            </p>
          ) : null}
          {result.data?.data.map((item) => (
            <ContentItemCard
              item={item}
              key={`${item.type}-${item.content_id}`}
              selected={selected?.content_id === item.content_id}
              setSelected={setSelected}
              slug={slug}
            />
          ))}
        </div>
        {result.data ? (
          <div className="mt-5">
            <PaginationControls
              page={result.data.page}
              pages={result.data.pages}
              setPage={(page) => updateQuery({ page })}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
};

const RankingTrend = ({ item }: { item: AdminCommunityRankingItem }) => {
  if (item.trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <ArrowUp className="h-4 w-4" /> subiu {item.position_delta}
      </span>
    );
  }
  if (item.trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-danger">
        <ArrowDown className="h-4 w-4" /> caiu {Math.abs(item.position_delta ?? 0)}
      </span>
    );
  }
  if (item.trend === "new") return <span className="text-primary">Novo no ranking</span>;

  return <span className="text-muted">estável</span>;
};

const RankingTab = ({ slug }: { slug: string }) => {
  const [query, setQuery] = useState<AdminCommunityRankingQuery>({
    limit: 10,
    page: 1,
    period: "30d",
    q: "",
  });
  const result = useAdminCommunityRanking(slug, query);
  const updateQuery = (patch: Partial<AdminCommunityRankingQuery>) =>
    setQuery((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));

  return (
    <section className={cn(cardClass, "p-5")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">Ranking da comunidade</h2>
          <p className="mt-1 text-sm text-muted">
            Todos os psicólogos participantes recebem uma posição, inclusive com score zero.
          </p>
        </div>
        <StatusBadge tone="muted">
          {numberFormatter.format(result.data?.count ?? 0)} psicólogos
        </StatusBadge>
      </div>
      <label className="relative mt-5 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          className="h-11 w-full rounded-control border border-border bg-surface pl-10 pr-3 text-sm font-bold outline-none transition focus:border-primary"
          onChange={(event) => updateQuery({ q: event.target.value })}
          placeholder="Buscar psicólogo participante"
          value={query.q ?? ""}
        />
      </label>
      <div className="mt-5 space-y-3">
        <QueryStatus
          error={result.error}
          loading={result.isLoading}
          onRetry={() => void result.refetch()}
        />
        {result.data?.data.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
            Nenhum psicólogo participante encontrado.
          </p>
        ) : null}
        {result.data?.data.map((item) => {
          const formattedCrp = formatRankingCrp(item.mentor.crp);

          return (
            <article
              className="grid gap-4 rounded-2xl border border-border bg-surface p-4 xl:grid-cols-[1fr_auto] xl:items-center"
              key={item.mentor.id}
            >
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
                  #{item.position}
                </span>
                <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-muted text-xs font-black text-primary">
                  {item.mentor.avatar ? (
                    <Image
                      alt={`Avatar de ${item.mentor.name}`}
                      className="object-cover"
                      fill
                      sizes="48px"
                      src={item.mentor.avatar}
                      unoptimized
                    />
                  ) : (
                    initials(item.mentor.name)
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-foreground">{item.mentor.name}</h3>
                    {item.mentor.verified ? (
                      <VerifiedBadgeIcon aria-label="Perfil verificado" className="h-4 w-4" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formattedCrp ? `CRP ${formattedCrp}` : "CRP não informado"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs xl:min-w-[220px] xl:justify-end">
                <span className="min-w-[72px]">
                  <strong className="block text-2xl text-foreground">
                    {numberFormatter.format(item.score)}
                  </strong>
                  <span className="font-bold text-muted">Score</span>
                </span>
                <span className="font-black">
                  <RankingTrend item={item} />
                  {item.previous_position ? (
                    <span className="ml-1 text-muted">· antes #{item.previous_position}</span>
                  ) : null}
                </span>
              </div>
            </article>
          );
        })}
      </div>
      {result.data ? (
        <div className="mt-5">
          <PaginationControls
            page={result.data.page}
            pages={result.data.pages}
            setPage={(page) => updateQuery({ page })}
          />
        </div>
      ) : null}
    </section>
  );
};

type CommunityReportCard = AdminCommunityReports["cards"][number];
type CommunityReportFilterType = NonNullable<AdminCommunityReportsQuery["type"]>;

const emptyCommunityReportCards: CommunityReportCard[] = [
  { id: "total", label: "Total de denúncias", source: "post_report", value: 0 },
  { id: "pending", label: "Pendentes", source: "post_report", value: 0 },
  { id: "upheld", label: "Procedentes", source: "post_report", value: 0 },
  { id: "dismissed", label: "Improcedentes", source: "post_report", value: 0 },
];

const communityReportTypeFallback: AdminCommunityReports["filters"]["types"] = [
  { count: 0, id: "all", label: "Todos" },
  { count: 0, id: "verified_psychologist_post", label: "Post de psicólogo verificado" },
  { count: 0, id: "unverified_psychologist_post", label: "Post de psicólogo não verificado" },
  { count: 0, id: "verified_psychologist_reply", label: "Resposta de psicólogo verificado" },
  { count: 0, id: "unverified_psychologist_reply", label: "Resposta de psicólogo não verificado" },
  { count: 0, id: "patient_post", label: "Post de paciente" },
  { count: 0, id: "patient_comment", label: "Comentário de paciente" },
];

const communityReportStatusFallback: AdminCommunityReports["filters"]["statuses"] = [
  { count: 0, id: "all", label: "Todos os status" },
  { count: 0, id: "pending", label: "Pendentes" },
  { count: 0, id: "upheld", label: "Procedentes" },
  { count: 0, id: "dismissed", label: "Improcedentes" },
];

const CommunityReportMetricCard = ({ card }: { card: CommunityReportCard }) => {
  const Icon =
    card.id === "dismissed" ? CheckCircle2 : card.id === "upheld" ? ShieldCheck : AlertTriangle;

  return (
    <section className={cn(cardClass, "p-5")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-foreground">{card.label}</p>
          <p className="mt-5 text-4xl font-black text-foreground">
            {numberFormatter.format(card.value)}
          </p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-primary-soft text-primary ring-1 ring-primary/10">
          <Icon aria-hidden className="h-5 w-5" />
        </span>
      </div>
    </section>
  );
};

const CommunityReportFilterSelect = ({
  children,
  className,
  label,
  onChange,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <label className={cn("block text-sm font-black text-muted", className)}>
    {label}
    <span className="relative mt-2 block">
      <select
        className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-14 text-sm font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
      />
    </span>
  </label>
);

const CommunityReportStatusBadge = ({
  group,
  label,
}: {
  group: AdminCommunityReportItem["status_group"];
  label: string;
}) => {
  const className =
    group === "upheld"
      ? "bg-red-50 text-danger"
      : group === "dismissed"
        ? "bg-emerald-50 text-success"
        : "bg-yellow-50 text-yellow-700";

  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", className)}>{label}</span>
  );
};

const COMMUNITY_REPORT_DISMISS_CONFIRMATION = "DENUNCIA IMPROCEDENTE";
const COMMUNITY_REPORT_UPHOLD_CONFIRMATION = "DENUNCIA PROCEDENTE";

type CommunityReportResolveState = {
  report: AdminCommunityReportItem;
  resolution: "dismissed" | "upheld";
} | null;

const CommunityReportMedia = ({ report }: { report: AdminCommunityReportItem }) => {
  if (!report.content.media) return null;

  const mediaType = report.content.media.media_type.toLowerCase();
  const imageSrc =
    mediaType === "image" ? renderableImageSrc(report.content.media.media_url) : null;
  const videoSrc =
    mediaType === "video" ? resolveAdminMediaUrl(report.content.media.media_url) : null;
  const label = mediaType === "video" ? "Midia de video denunciada" : "Midia de imagem denunciada";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border bg-surface-muted",
        mediaType === "video" ? "aspect-[9/16] max-w-48" : "min-h-44",
      )}
    >
      {imageSrc ? (
        <Image
          alt={label}
          className="object-cover"
          fill
          sizes="(min-width: 1024px) 220px, 100vw"
          src={imageSrc}
          unoptimized={isAdminPublicMediaUrl(report.content.media.media_url)}
        />
      ) : null}
      {!imageSrc && videoSrc ? <ContentVideoMiniplayer label={label} src={videoSrc} /> : null}
      {!imageSrc && !videoSrc ? (
        <div className="grid h-32 place-items-center gap-1 p-4 text-center text-xs font-black text-muted">
          <ImageIcon aria-hidden className="mx-auto h-5 w-5" />
          <span>Midia do conteudo denunciado</span>
        </div>
      ) : null}
    </div>
  );
};

const CommunityReportResolveDialog = ({
  onClose,
  slug,
  state,
}: {
  onClose: () => void;
  slug: string;
  state: NonNullable<CommunityReportResolveState>;
}) => {
  const expectedConfirmation =
    state.resolution === "dismissed"
      ? COMMUNITY_REPORT_DISMISS_CONFIRMATION
      : COMMUNITY_REPORT_UPHOLD_CONFIRMATION;
  const mutation = useAdminCommunityResolveReports(slug);
  const form = useForm<CommunityReportResolveFormValues>({
    defaultValues: {
      confirmation: "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(communityReportResolveSchema(expectedConfirmation)),
  });

  const onSubmit = async (values: CommunityReportResolveFormValues) => {
    try {
      await mutation.mutateAsync({
        input: {
          confirmation: values.confirmation,
          reason: values.reason.trim(),
          resolution: state.resolution,
        },
        targetId: state.report.content.id,
        targetType: state.report.content.type,
      });
      toast.success(
        state.resolution === "dismissed"
          ? "Denuncia marcada como improcedente."
          : "Denuncia marcada como procedente.",
      );
      form.reset();
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4"
      role="presentation"
    >
      <FormProvider {...form}>
        <form
          aria-modal="true"
          className="w-full max-w-xl rounded-[28px] border border-border bg-surface p-5 shadow-xl"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          role="dialog"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-primary">
                Resolucao de denuncias
              </p>
              <h3 className="mt-1 text-xl font-black text-foreground">
                Marcar como {state.resolution === "dismissed" ? "improcedente" : "procedente"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                A decisao atualiza todas as denuncias pendentes deste mesmo conteudo e registra
                auditoria. O conteudo nao sera removido por esta acao.
              </p>
            </div>
            <button
              aria-label="Fechar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-surface-muted p-3 text-sm font-bold text-muted">
            {state.report.content.title ? (
              <p className="text-foreground">{state.report.content.title}</p>
            ) : null}
            <p className="mt-1 line-clamp-3">
              {state.report.content.excerpt || "Conteudo sem texto."}
            </p>
            <p className="mt-2 text-xs">
              {numberFormatter.format(state.report.report_count)} denuncia(s) recebida(s)
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            <TextareaController<CommunityReportResolveFormValues>
              label="Motivo interno obrigatorio"
              name="reason"
              required
              rows={3}
            />
            <InputController<CommunityReportResolveFormValues>
              label="Confirmacao forte"
              name="confirmation"
              placeholder={expectedConfirmation}
              required
            />
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              className="h-10 rounded-control border border-border bg-surface px-4 text-xs font-black text-foreground"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-control px-4 text-xs font-black text-white disabled:opacity-70",
                state.resolution === "dismissed" ? "bg-success" : "bg-danger",
              )}
              disabled={mutation.isPending}
              type="submit"
            >
              {mutation.isPending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
              Confirmar decisao
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

const ReportsTab = ({ slug }: { slug: string }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriodValue>("90d");
  const [appliedRange, setAppliedRange] = useState<ReportDateRange>(() =>
    getReportRangeForPeriod("90d"),
  );
  const [draftRange, setDraftRange] = useState<ReportDateRange>(() =>
    getReportRangeForPeriod("90d"),
  );
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [type, setType] = useState<CommunityReportFilterType>("all");
  const [status, setStatus] = useState<AdminCommunityReportsQuery["status"]>("all");
  const [page, setPage] = useState(1);
  const [resolveState, setResolveState] = useState<CommunityReportResolveState>(null);
  const queryInput = useMemo<AdminCommunityReportsQuery>(
    () => ({
      ...appliedRange,
      limit: 10,
      page,
      status,
      type,
    }),
    [appliedRange, page, status, type],
  );
  const result = useAdminCommunityReports(slug, queryInput);
  const reportCards = result.data?.cards ?? emptyCommunityReportCards;
  const reportItems = result.data?.data ?? [];
  const typeOptions = result.data?.filters.types ?? communityReportTypeFallback;
  const statusOptions = result.data?.filters.statuses ?? communityReportStatusFallback;

  const handlePeriodChange = (value: ReportPeriodPreset) => {
    const nextRange = getReportRangeForPeriod(value);

    setRangeError(null);
    setSelectedPeriod(value);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
    setPage(1);
  };
  const handleDateChange = (field: keyof ReportDateRange, value: string) => {
    setRangeError(null);
    setSelectedPeriod("custom");
    setDraftRange((current) => ({ ...current, [field]: value }));
  };
  const commitRange = () => {
    if (!isValidReportRange(draftRange)) {
      setRangeError(
        "Informe um período personalizado completo, com data inicial menor ou igual à final.",
      );
      return;
    }

    setRangeError(null);
    setAppliedRange(draftRange);
    setPage(1);
  };
  const handleDateControlsBlur = (event: {
    currentTarget: HTMLDivElement;
    relatedTarget: EventTarget | null;
  }) => {
    const currentTarget = event.currentTarget;
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (nextFocusedElement && currentTarget.contains(nextFocusedElement)) return;

    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (activeElement && currentTarget.contains(activeElement)) return;

      commitRange();
    }, 0);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reportCards.map((card) => (
          <CommunityReportMetricCard card={card} key={card.id} />
        ))}
      </div>

      <section className={cn(cardClass, "p-4")}>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_2fr] lg:items-end">
          <CommunityReportFilterSelect
            label="Tipo"
            onChange={(value) => {
              setType(value as CommunityReportFilterType);
              setPage(1);
            }}
            value={type}
          >
            {typeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({numberFormatter.format(option.count)})
              </option>
            ))}
          </CommunityReportFilterSelect>
          <CommunityReportFilterSelect
            label="Status"
            onChange={(value) => {
              setStatus(value as AdminCommunityReportsQuery["status"]);
              setPage(1);
            }}
            value={status ?? "all"}
          >
            {statusOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({numberFormatter.format(option.count)})
              </option>
            ))}
          </CommunityReportFilterSelect>
          <CommunityReportFilterSelect
            label="Período"
            onChange={(value) => handlePeriodChange(value as ReportPeriodPreset)}
            value={selectedPeriod}
          >
            {selectedPeriod === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            {reportPeriodOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </CommunityReportFilterSelect>
          <div className="grid gap-3 sm:grid-cols-2" onBlur={handleDateControlsBlur}>
            <label className="block text-sm font-black text-muted">
              De
              <input
                className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
                max={draftRange.to}
                onChange={(event) => handleDateChange("from", event.target.value)}
                type="date"
                value={draftRange.from}
              />
            </label>
            <label className="block text-sm font-black text-muted">
              Até
              <input
                className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
                min={draftRange.from}
                onChange={(event) => handleDateChange("to", event.target.value)}
                type="date"
                value={draftRange.to}
              />
            </label>
          </div>
        </div>
        {rangeError ? <p className="mt-3 text-xs font-bold text-danger">{rangeError}</p> : null}
      </section>

      <section className={cn(cardClass, "overflow-hidden")}>
        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground">Denuncias da comunidade</h2>
            <p className="mt-1 text-sm text-muted">
              Mostrando {numberFormatter.format(reportItems.length)} de{" "}
              {numberFormatter.format(result.data?.count ?? 0)} conteudos denunciados filtrados.
            </p>
          </div>
          <StatusBadge tone="muted">Moderacao auditada</StatusBadge>
        </div>

        <div className="p-4">
          <QueryStatus
            error={result.error}
            loading={result.isLoading}
            onRetry={() => void result.refetch()}
          />
        </div>

        {reportItems.length === 0 && !result.isLoading ? (
          <p className="px-4 pb-5 text-sm font-bold text-muted">
            Nenhuma denuncia real encontrada para os filtros atuais.
          </p>
        ) : null}

        {reportItems.length > 0 ? (
          <div className="divide-y divide-border">
            {reportItems.map((report: AdminCommunityReportItem) => (
              <article className="grid gap-5 p-4 xl:grid-cols-[1fr_280px]" key={report.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone="muted">{report.content.content_kind_label}</StatusBadge>
                    <CommunityReportStatusBadge
                      group={report.status_group}
                      label={report.status_label}
                    />
                    <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-black text-primary">
                      {numberFormatter.format(report.report_count)} denuncia(s)
                    </span>
                    <span className="text-xs font-bold text-muted">
                      Ultima denuncia em {formatDateTime(report.last_reported_at)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wide text-muted">
                        Conteudo denunciado
                      </p>
                      <h3 className="mt-1 text-lg font-black text-foreground">
                        {report.content.title ||
                          (report.content.type === "post" ? "Post sem titulo" : "Comentario")}
                      </h3>
                      <div className="mt-3 whitespace-pre-wrap rounded-2xl border border-border bg-surface-muted p-4 text-sm font-bold leading-6 text-foreground">
                        {report.content.body ||
                          report.content.excerpt ||
                          "Conteudo sem texto disponivel."}
                      </div>
                      {!report.content.available ? (
                        <p className="mt-2 text-xs font-bold text-danger">
                          {report.content.unavailable_reason ||
                            "Conteudo removido ou indisponivel."}
                        </p>
                      ) : null}
                      {report.content.public_url ? (
                        <Link
                          className="mt-3 inline-flex items-center gap-2 text-xs font-black text-primary hover:underline"
                          href={toPublicHref(report.content.public_url)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <Eye aria-hidden className="h-4 w-4" />
                          Ver conteudo publico
                        </Link>
                      ) : null}
                    </div>
                    <CommunityReportMedia report={report} />
                  </div>

                  <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-foreground">Denunciantes</p>
                        <p className="text-xs font-bold text-muted">
                          Relacao de todas as denuncias recebidas para este conteudo.
                        </p>
                      </div>
                      <span className="text-xs font-black text-primary">
                        {numberFormatter.format(report.reporters.length)} registro(s)
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3">
                      {report.reporters.map((reporter) => (
                        <div
                          className="rounded-2xl border border-border bg-surface-muted p-3"
                          key={reporter.id}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-foreground">
                              {reporter.reporter.name}
                            </span>
                            <StatusBadge tone="muted">{reporter.reporter.label}</StatusBadge>
                            <CommunityReportStatusBadge
                              group={reporter.status_group}
                              label={reporter.status_label}
                            />
                            <span className="text-xs font-bold text-muted">
                              {formatDateTime(reporter.created_at)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-black text-foreground">
                            {reporter.reason_label}
                          </p>
                          {reporter.description ? (
                            <p className="mt-1 text-sm leading-6 text-muted">
                              {reporter.description}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <aside className="rounded-2xl bg-surface-muted p-4 text-sm xl:sticky xl:top-4 xl:self-start">
                  <dl className="grid gap-4">
                    <div>
                      <dt className="font-black text-muted">Quantidade</dt>
                      <dd className="mt-1 text-2xl font-black text-foreground">
                        {numberFormatter.format(report.report_count)}
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                      <div>
                        <dt className="text-xs font-black text-muted">Pend.</dt>
                        <dd className="font-black text-foreground">
                          {numberFormatter.format(report.status_counts.pending)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-black text-muted">Proc.</dt>
                        <dd className="font-black text-foreground">
                          {numberFormatter.format(report.status_counts.upheld)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-black text-muted">Improc.</dt>
                        <dd className="font-black text-foreground">
                          {numberFormatter.format(report.status_counts.dismissed)}
                        </dd>
                      </div>
                    </div>
                    <div className="border-t border-border pt-4">
                      <dt className="font-black text-muted">Tipo</dt>
                      <dd className="mt-1 font-black text-foreground">
                        {report.content.content_kind_label}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-black text-muted">Status do grupo</dt>
                      <dd className="mt-1 font-black text-foreground">{report.status_label}</dd>
                    </div>
                  </dl>

                  {report.capabilities.can_resolve_dismissed ||
                  report.capabilities.can_resolve_upheld ? (
                    <div className="mt-4 grid gap-2 border-t border-border pt-4">
                      <button
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-success/30 bg-success/10 px-3 text-xs font-black text-success transition hover:bg-success/15"
                        onClick={() => setResolveState({ report, resolution: "dismissed" })}
                        type="button"
                      >
                        <CheckCircle2 aria-hidden className="h-4 w-4" />
                        Marcar improcedente
                      </button>
                      <button
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-danger/30 bg-danger/10 px-3 text-xs font-black text-danger transition hover:bg-danger/15"
                        onClick={() => setResolveState({ report, resolution: "upheld" })}
                        type="button"
                      >
                        <ShieldCheck aria-hidden className="h-4 w-4" />
                        Marcar procedente
                      </button>
                    </div>
                  ) : (
                    <p className="mt-4 border-t border-border pt-4 text-xs font-bold text-muted">
                      Este conteudo nao possui denuncias pendentes para resolucao.
                    </p>
                  )}
                </aside>
              </article>
            ))}
          </div>
        ) : null}

        {result.data ? (
          <div className="border-t border-border p-4">
            <PaginationControls
              page={result.data.page}
              pages={result.data.pages}
              setPage={setPage}
            />
          </div>
        ) : null}
      </section>

      {resolveState ? (
        <CommunityReportResolveDialog
          onClose={() => setResolveState(null)}
          slug={slug}
          state={resolveState}
        />
      ) : null}
    </div>
  );
};

const ActivitiesTab = ({ slug }: { slug: string }) => {
  const [query, setQuery] = useState<AdminCommunityActivitiesQuery>({
    limit: 8,
    page: 1,
    q: "",
  });
  const result = useAdminCommunityActivities(slug, query);
  const updateQuery = (patch: Partial<AdminCommunityActivitiesQuery>) =>
    setQuery((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  const activities = result.data;
  const activityItems = activities?.data ?? [];

  return (
    <div className="space-y-5" data-community-detail-tab="atividades">
      <section className={cn(cardClass, "p-4")}>
        <label className="block text-sm font-black text-muted">
          Buscar
          <span className="mt-2 flex h-11 items-center rounded-control border border-border bg-surface px-3">
            <Search aria-hidden className="h-4 w-4 shrink-0 text-muted" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm font-bold text-foreground outline-none placeholder:text-muted"
              onChange={(event) => updateQuery({ q: event.target.value })}
              placeholder="Buscar por descrição..."
              value={query.q ?? ""}
            />
          </span>
        </label>
      </section>

      <section className={cn(cardClass, "overflow-hidden")}>
        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground">Atividades administrativas</h2>
            <p className="mt-1 text-sm text-muted">
              Mostrando {numberFormatter.format(activityItems.length)} de{" "}
              {numberFormatter.format(activities?.count ?? 0)} eventos principais filtrados.
            </p>
          </div>
        </div>

        {result.isLoading || result.error ? (
          <div className="p-4">
            <QueryStatus
              error={result.error}
              loading={result.isLoading}
              onRetry={() => void result.refetch()}
            />
          </div>
        ) : null}

        {activities && activityItems.length === 0 ? (
          <p className="p-5 text-sm font-bold text-muted">
            Nenhuma atividade administrativa registrada para os filtros atuais.
          </p>
        ) : null}

        {activityItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border text-xs text-muted">
                <tr>
                  <th className="py-3 pr-3 pl-4 font-black">Data</th>
                  <th className="px-3 py-3 font-black">Ação</th>
                  <th className="px-3 py-3 font-black">Descrição</th>
                  <th className="py-3 pr-4 pl-3 font-black">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activityItems.map((activity: AdminCommunityActivityItem) => (
                  <tr key={activity.id}>
                    <td className="py-3 pr-3 pl-4 font-bold text-muted">
                      {formatDateTime(activity.created_at)}
                    </td>
                    <td className="px-3 py-3 font-black text-foreground">{activity.summary}</td>
                    <td className="px-3 py-3 text-muted">
                      {activity.reason ? (
                        <span className="block">Motivo: {activity.reason}</span>
                      ) : null}
                      <span
                        className={cn("block", activity.reason ? "mt-1 text-xs font-bold" : "")}
                      >
                        Área: {activity.area} · Origem: Painel administrativo
                      </span>
                    </td>
                    <td className="py-3 pr-4 pl-3">
                      <span className="block font-black text-foreground">
                        {activity.actor || "Não informado"}
                      </span>
                      <span className="mt-1 block text-xs font-bold text-muted">Admin</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activities ? (
          <div className="border-t border-border p-4">
            <PaginationControls
              page={activities.page}
              pages={activities.pages}
              setPage={(page) => updateQuery({ page })}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
};

const LoadingState = () => (
  <div className="space-y-5">
    <div className={cn(cardClass, "h-48 animate-pulse bg-surface-muted")} />
    <div className="grid gap-5 xl:grid-cols-2">
      <div className={cn(cardClass, "h-72 animate-pulse bg-surface-muted")} />
      <div className={cn(cardClass, "h-72 animate-pulse bg-surface-muted")} />
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <section className={cn(cardClass, "p-6")}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">
            Não foi possível carregar a comunidade
          </h1>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-primary"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </section>
);

const DetailContent = ({
  activeTab,
  detail,
  pathname,
  slug,
}: {
  activeTab: CommunityTab;
  detail: AdminCommunityDetail;
  pathname: string;
  slug: string;
}) => (
  <div className="space-y-5">
    <section className={cn(cardClass, "overflow-hidden")}>
      <CommunityHeader community={detail.community} postsCount={detail.summary.posts_count} />
      <CommunityTabs activeTab={activeTab} pathname={pathname} />
    </section>

    {activeTab === "geral" ? (
      <>
        <div className="grid gap-5 2xl:grid-cols-[1.15fr_1fr]">
          <SummaryCards detail={detail} />
          <PerformanceSection detail={detail} />
        </div>
        <div className="grid gap-5 2xl:grid-cols-[1.1fr_0.9fr]">
          <PopularPostsCard posts={detail.popular_posts} />
          <TopMentorsCard mentors={detail.top_mentors} />
        </div>
      </>
    ) : null}

    {activeTab === "dados" ? (
      <div className="space-y-5">
        <CommunityEditForm community={detail.community} id={slug} onDone={() => undefined} />
        <RulesManager id={slug} rules={detail.rules} />
      </div>
    ) : null}

    {activeTab === "conteudo" ? (
      <ContentTab createdAt={detail.community.created_at} slug={slug} />
    ) : null}
    {activeTab === "ranking" ? <RankingTab slug={slug} /> : null}
    {activeTab === "denuncias" ? <ReportsTab slug={slug} /> : null}
    {activeTab === "atividades" ? <ActivitiesTab slug={slug} /> : null}
  </div>
);

export const AdminCommunityDetailClient = ({ slug }: { slug: string }) => {
  const query = useAdminCommunityDetail(slug);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parseCommunityTab(searchParams.get("tab"));
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  return (
    <main className="space-y-5">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError && errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />
      ) : null}
      {query.data ? (
        <DetailContent activeTab={activeTab} detail={query.data} pathname={pathname} slug={slug} />
      ) : null}
    </main>
  );
};
