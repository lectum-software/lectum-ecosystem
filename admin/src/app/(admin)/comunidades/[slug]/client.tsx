"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bookmark,
  CalendarDays,
  Edit3,
  Eye,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  type ChangeEvent,
  type PointerEvent,
  type SVGProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

type CommunityFormValues = z.infer<typeof communityFormSchema>;
type RuleFormValues = z.infer<typeof ruleFormSchema>;
type RemoveContentFormValues = z.infer<typeof removeContentFormSchema>;

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
  tone: "green" | "muted";
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black",
      tone === "green" ? "bg-emerald-50 text-success" : "bg-surface-muted text-muted",
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
}) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-xs font-bold text-muted">
      Página {numberFormatter.format(page)} de {numberFormatter.format(pages)}
    </p>
    <div className="flex gap-2">
      <button
        className="h-10 rounded-control border border-border bg-surface px-4 text-xs font-black text-foreground disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
        type="button"
      >
        Anterior
      </button>
      <button
        className="h-10 rounded-control border border-border bg-surface px-4 text-xs font-black text-foreground disabled:opacity-40"
        disabled={page >= pages}
        onClick={() => setPage(page + 1)}
        type="button"
      >
        Próxima
      </button>
    </div>
  </div>
);

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
      return;
    }

    video.pause();
  };

  return (
    <div className="relative h-full w-full">
      <video
        aria-label={label}
        className="h-full w-full object-cover"
        controls
        muted
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
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
    </div>
  );
};

const ContentOriginPreview = ({ item }: { item: AdminCommunityContentItem }) => {
  if (!item.origin_preview) return null;

  const origin = item.origin_preview;

  return (
    <blockquote className="mt-3 overflow-hidden rounded-2xl border border-primary/10 bg-primary-soft/40 px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.08em] text-primary">
        {origin.label}
      </p>
      {origin.title ? (
        <p className="mt-1 line-clamp-1 text-xs font-black text-foreground">{origin.title}</p>
      ) : null}
      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-muted">
        {origin.excerpt || "Sem texto."}
      </p>
    </blockquote>
  );
};

const ContentMetrics = ({ item }: { item: AdminCommunityContentItem }) => (
  <div className="mt-4 border-t border-border pt-3">
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-muted">
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
        <AlertTriangle aria-hidden className="h-4 w-4" />
        {numberFormatter.format(item.metrics.reports_count)} denúncias
      </span>
    </div>
  </div>
);

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
        <ContentOriginPreview item={item} />
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

const ContentTab = ({ slug }: { slug: string }) => {
  const [query, setQuery] = useState<AdminCommunityContentQuery>({
    limit: 10,
    page: 1,
    q: "",
    status: "all",
    type: "all",
  });
  const [selected, setSelected] = useState<AdminCommunityContentItem | null>(null);
  const result = useAdminCommunityContent(slug, query);

  const updateQuery = (patch: Partial<AdminCommunityContentQuery>) => {
    setSelected(null);
    setQuery((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };

  return (
    <section className={cn(cardClass, "p-5")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">Conteúdo da comunidade</h2>
          <p className="mt-1 text-sm text-muted">
            Posts e comentários reais, com remoção administrativa auditada e sem mock.
          </p>
        </div>
        <StatusBadge tone="muted">
          {numberFormatter.format(result.data?.count ?? 0)} itens
        </StatusBadge>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="h-11 w-full rounded-control border border-border bg-surface pl-10 pr-3 text-sm font-bold outline-none transition focus:border-primary"
            onChange={(event) => updateQuery({ q: event.target.value })}
            placeholder="Buscar por texto, título ou autor"
            value={query.q ?? ""}
          />
        </label>
        <select
          className="h-11 rounded-control border border-border bg-surface px-3 text-sm font-bold"
          onChange={(event) =>
            updateQuery({ type: event.target.value as AdminCommunityContentQuery["type"] })
          }
          value={query.type}
        >
          <option value="all">Todos os tipos</option>
          <option value="posts">Posts</option>
          <option value="comments">Comentários</option>
        </select>
        <select
          className="h-11 rounded-control border border-border bg-surface px-3 text-sm font-bold"
          onChange={(event) =>
            updateQuery({ status: event.target.value as AdminCommunityContentQuery["status"] })
          }
          value={query.status}
        >
          <option value="all">Todos os status</option>
          <option value="published">Publicados</option>
          <option value="removed">Removidos</option>
        </select>
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
  if (item.trend === "new") return <span className="text-primary">novo no ranking</span>;

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
        {result.data?.data.map((item) => (
          <article
            className="grid gap-4 rounded-2xl border border-border bg-surface p-4 xl:grid-cols-[1fr_auto]"
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-xs font-black text-primary">
                      <ShieldCheck className="h-3 w-3" />
                      verificado
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted">{item.mentor.crp || "CRP não informado"}</p>
                <p className="mt-2 text-xs font-black">
                  <RankingTrend item={item} />
                  {item.previous_position ? ` · antes #${item.previous_position}` : ""}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4 xl:min-w-[460px]">
              <span>
                <strong className="block text-lg text-foreground">
                  {numberFormatter.format(item.score)}
                </strong>
                Score
              </span>
              <span>
                <strong className="block text-lg text-foreground">
                  {numberFormatter.format(item.metrics.posts_published)}
                </strong>
                Posts
              </span>
              <span>
                <strong className="block text-lg text-foreground">
                  {numberFormatter.format(item.metrics.replies_published)}
                </strong>
                Respostas
              </span>
              <span>
                <strong className="block text-lg text-foreground">
                  {numberFormatter.format(item.metrics.upvotes_received)}
                </strong>
                Upvotes
              </span>
            </div>
          </article>
        ))}
      </div>
      {result.data ? (
        <div className="mt-5 space-y-3">
          <PaginationControls
            page={result.data.page}
            pages={result.data.pages}
            setPage={(page) => updateQuery({ page })}
          />
          <p className="text-xs leading-5 text-muted">
            Fórmula:{" "}
            {String(result.data.formula.description ?? "pontuação de mentoria da comunidade")}
          </p>
        </div>
      ) : null}
    </section>
  );
};

const ReportsTab = ({ slug }: { slug: string }) => {
  const [query, setQuery] = useState<AdminCommunityReportsQuery>({
    limit: 10,
    page: 1,
    q: "",
    status: "all",
    type: "all",
  });
  const result = useAdminCommunityReports(slug, query);
  const updateQuery = (patch: Partial<AdminCommunityReportsQuery>) =>
    setQuery((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));

  return (
    <section className={cn(cardClass, "p-5")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">Denúncias da comunidade</h2>
          <p className="mt-1 text-sm text-muted">
            Denúncias reais vinculadas a posts e comentários desta comunidade.
          </p>
        </div>
        <StatusBadge tone="muted">
          {numberFormatter.format(result.data?.count ?? 0)} denúncias
        </StatusBadge>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <input
          className="h-11 rounded-control border border-border bg-surface px-3 text-sm font-bold"
          onChange={(event) => updateQuery({ q: event.target.value })}
          placeholder="Buscar denúncia"
          value={query.q ?? ""}
        />
        <select
          className="h-11 rounded-control border border-border bg-surface px-3 text-sm font-bold"
          onChange={(event) =>
            updateQuery({ status: event.target.value as AdminCommunityReportsQuery["status"] })
          }
          value={query.status}
        >
          <option value="all">Todos os status</option>
          <option value="pendente">Pendentes</option>
          <option value="em_analise">Em análise</option>
          <option value="resolvida">Resolvidas</option>
          <option value="rejeitada">Rejeitadas</option>
        </select>
      </div>
      <div className="mt-5 space-y-3">
        <QueryStatus
          error={result.error}
          loading={result.isLoading}
          onRetry={() => void result.refetch()}
        />
        {result.data?.data.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
            Nenhuma denúncia encontrada para esta comunidade.
          </p>
        ) : null}
        {result.data?.data.map((report: AdminCommunityReportItem) => (
          <article className="rounded-2xl border border-border p-4" key={report.id}>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={report.status === "pendente" ? "green" : "muted"}>
                {report.status}
              </StatusBadge>
              <span className="text-xs font-bold text-muted">
                {formatDateTime(report.created_at)}
              </span>
              <span className="text-xs font-bold text-muted">Reporter: {report.reporter_role}</span>
            </div>
            <h3 className="mt-3 font-black text-foreground">{report.reason}</h3>
            <p className="mt-2 text-sm text-muted">
              {report.description || report.content.excerpt || "Sem descrição."}
            </p>
            <p className="mt-2 text-xs font-bold text-muted">
              Conteúdo: {report.content.type === "post" ? "post" : "comentário"} ·{" "}
              {report.content.available ? "disponível" : "removido/indisponível"}
            </p>
          </article>
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
  );
};

const ActivitiesTab = ({ slug }: { slug: string }) => {
  const [query, setQuery] = useState<AdminCommunityActivitiesQuery>({
    limit: 10,
    page: 1,
    q: "",
    type: "all",
  });
  const result = useAdminCommunityActivities(slug, query);
  const updateQuery = (patch: Partial<AdminCommunityActivitiesQuery>) =>
    setQuery((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));

  return (
    <section className={cn(cardClass, "p-5")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">Atividades administrativas</h2>
          <p className="mt-1 text-sm text-muted">
            Eventos auditados no painel administrativo para esta comunidade.
          </p>
        </div>
        <StatusBadge tone="muted">
          {numberFormatter.format(result.data?.count ?? 0)} eventos
        </StatusBadge>
      </div>
      <input
        className="mt-5 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold"
        onChange={(event) => updateQuery({ q: event.target.value })}
        placeholder="Buscar atividade"
        value={query.q ?? ""}
      />
      <div className="mt-5 space-y-3">
        <QueryStatus
          error={result.error}
          loading={result.isLoading}
          onRetry={() => void result.refetch()}
        />
        {result.data?.data.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
            Nenhuma atividade administrativa registrada para esta comunidade.
          </p>
        ) : null}
        {result.data?.data.map((activity: AdminCommunityActivityItem) => (
          <article className="rounded-2xl border border-border p-4" key={activity.id}>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
              <span>{formatDateTime(activity.created_at)}</span>
              <span>Área: {activity.area}</span>
              <span>Origem: Painel administrativo</span>
            </div>
            <h3 className="mt-2 font-black text-foreground">{activity.summary}</h3>
            <p className="mt-1 text-sm text-muted">Ator: {activity.actor}</p>
            {activity.reason ? (
              <p className="mt-2 rounded-2xl bg-surface-muted p-3 text-sm text-muted">
                Motivo: {activity.reason}
              </p>
            ) : null}
          </article>
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

    {activeTab === "conteudo" ? <ContentTab slug={slug} /> : null}
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
