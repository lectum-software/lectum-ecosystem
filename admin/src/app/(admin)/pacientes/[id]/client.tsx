"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Heart,
  Info,
  Loader2,
  LockKeyhole,
  type LucideIcon,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  RefreshCw,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useAdminPatientDetail, useAdminPatientUpdatePersonalData } from "@/api/callers/patients";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPatientDetail,
  PatientsDetailActivity,
  PatientsDetailCommunity,
  PatientsDetailMetric,
} from "@/api/req/patients";
import { SelectController, TextareaController } from "@/components/controllers";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const LOADING_PLACEHOLDERS = ["profile", "engagement", "activity", "communities"] as const;
const PATIENT_DETAIL_TABS = [
  { id: "geral", label: "Geral" },
  { id: "perfil", label: "Perfil e cadastro" },
  { id: "estatisticas", label: "Estatísticas" },
  { id: "publicacoes", label: "Publicações" },
  { id: "denuncias", label: "Denúncias" },
  { id: "atividades", label: "Atividades" },
  { id: "conta", label: "Conta" },
] as const;
type PatientDetailTab = (typeof PATIENT_DETAIL_TABS)[number]["id"];
const numberFormatter = new Intl.NumberFormat("pt-BR");
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const CARD = "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";
const metricIcons: Record<PatientsDetailMetric["id"], LucideIcon> = {
  comments_created: MessageCircle,
  downvotes_received: ThumbsDown,
  posts_created: FileText,
  responses_received: Heart,
  upvotes_received: ThumbsUp,
};
const activitySourceLabels: Record<PatientsDetailActivity["source"], string> = {
  community_member: "Comunidade",
  community_post: "Post",
  post_reply: "Comentário",
  post_reply_save: "Resposta salva",
  post_save: "Post salvo",
  post_vote: "Voto",
  professional_review: "Avaliação",
};
const seriesConfig = [
  { color: "var(--admin-primary)", key: "posts_created", label: "Posts" },
  { color: "#5d9df6", key: "comments_created", label: "Comentários" },
  { color: "var(--admin-success)", key: "upvotes_received", label: "Upvotes recebidos" },
  { color: "var(--admin-danger)", key: "downvotes_received", label: "Downvotes recebidos" },
  { color: "var(--admin-warning)", key: "responses_received", label: "Respostas recebidas" },
] as const;
const EMPTY_SELECT_OPTION = { label: "Não informado", value: "" } as const;
const PATIENT_GENDER_OPTIONS = [
  EMPTY_SELECT_OPTION,
  { label: "Feminino", value: "feminino" },
  { label: "Masculino", value: "masculino" },
  { label: "Não binário", value: "nao_binario" },
  { label: "Outro", value: "outro" },
  { label: "Prefiro não dizer", value: "prefiro_nao_dizer" },
] as const;
const patientPersonalDataSchema = z.object({
  gender: z.string().max(80, "Use no máximo 80 caracteres.").optional(),
  reason: z
    .string()
    .trim()
    .min(10, "Informe um motivo com pelo menos 10 caracteres.")
    .max(500, "Use no máximo 500 caracteres."),
});
type PatientPersonalDataFormValues = z.infer<typeof patientPersonalDataSchema>;

const formatDateTime = (value?: string | null) => {
  if (!value) return "N\u00e3o informado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N\u00e3o informado";

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
};
const formatLastAccess = (value?: string | null) => {
  if (!value) return "N\u00e3o capturado";

  return formatDateTime(value);
};
const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
};
const safeAvatarSrc = (src: string | null) => {
  if (!src) return null;
  if (src.startsWith("/public/files/") || src.startsWith("/community/icons/")) {
    return `${apiUrl}${src}`;
  }
  if (src.startsWith("/")) return src;
  try {
    const url = new URL(src);
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return src;
  } catch {
    return null;
  }
  return null;
};
const isApiMediaSrc = (src: string | null) => Boolean(src?.startsWith(apiUrl));
const initialsFromName = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "PA";
const isPatientDetailTab = (value: string | null): value is PatientDetailTab =>
  PATIENT_DETAIL_TABS.some((tab) => tab.id === value);
const patientTabHref = (id: string, tab: PatientDetailTab) =>
  tab === "geral" ? `/pacientes/${id}` : `/pacientes/${id}?tab=${tab}`;
const formatNullable = (value: string | null | undefined) => {
  const normalized = String(value ?? "").trim();
  return normalized || "N\u00e3o informado";
};
const emptyToNull = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || null;
};
const capitalizeOptionLabel = (value?: string | number | null) => {
  const formatted = formatNullable(value === undefined || value === null ? null : String(value));
  if (formatted === "N\u00e3o informado") return formatted;

  return formatted.replace(/^(\s*)(\p{L})/u, (_, spaces: string, letter: string) => {
    return `${spaces}${letter.toLocaleUpperCase("pt-BR")}`;
  });
};
const mergeCurrentOption = (
  options: readonly { label: string; value: string }[],
  currentValue?: string | null,
) => {
  const normalized = String(currentValue ?? "").trim();
  if (!normalized || options.some((option) => option.value === normalized)) return [...options];
  const [firstOption, ...restOptions] = options;
  if (!firstOption) {
    return [{ label: `${capitalizeOptionLabel(normalized)} (valor atual)`, value: normalized }];
  }

  return [
    firstOption,
    { label: `${capitalizeOptionLabel(normalized)} (valor atual)`, value: normalized },
    ...restOptions,
  ];
};
const getStaticOptionLabel = (
  options: readonly { label: string; value: string }[],
  value?: string | null,
) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "N\u00e3o informado";

  return (
    options.find((option) => option.value === normalized)?.label ??
    capitalizeOptionLabel(normalized)
  );
};
const formatPatientGender = (value?: string | null) =>
  getStaticOptionLabel(PATIENT_GENDER_OPTIONS, value);

const CardShell = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <section className={cn(CARD, className)}>{children}</section>
);

const Badge = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black",
      className,
    )}
  >
    {children}
  </span>
);

const IconCircle = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-primary-soft text-primary ring-1 ring-primary/10">
    <Icon aria-hidden className="h-5 w-5" />
  </span>
);

const Avatar = ({ name, src }: { name: string; src: string | null }) => {
  const imageSrc = safeAvatarSrc(src);
  if (!imageSrc) {
    return (
      <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-primary-soft text-3xl font-black text-primary sm:h-32 sm:w-32">
        {initialsFromName(name)}
      </span>
    );
  }
  return (
    <Image
      alt={`Foto de ${name}`}
      className="h-24 w-24 shrink-0 rounded-full object-cover sm:h-32 sm:w-32"
      height={128}
      priority
      src={imageSrc}
      unoptimized={isApiMediaSrc(imageSrc)}
      width={128}
    />
  );
};

const TrendBadge = ({ metric }: { metric: PatientsDetailMetric }) => (
  <span
    className={cn(
      "text-xs font-semibold",
      metric.trend === "up" && "text-success",
      metric.trend === "down" && "text-danger",
      ["flat", "unavailable"].includes(metric.trend) && "text-muted",
    )}
  >
    {formatChange(metric.change_percent)}
  </span>
);

const MetricCard = ({ metric }: { metric: PatientsDetailMetric }) => {
  const Icon = metricIcons[metric.id];
  return (
    <CardShell className="min-h-[9.25rem] p-4">
      <IconCircle icon={Icon} />
      <p className="mt-4 text-sm font-extrabold text-muted">{metric.label}</p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
        {numberFormatter.format(metric.value)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TrendBadge metric={metric} />
        <span className="text-xs font-bold text-muted">vs. período anterior</span>
      </div>
    </CardShell>
  );
};

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black">Não foi possível carregar o paciente</h2>
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

const Header = ({
  detail,
  id,
  tab,
}: {
  detail: AdminPatientDetail;
  id: string;
  tab: PatientDetailTab;
}) => {
  const location = detail.header.location
    ? [detail.header.location.city, detail.header.location.state, detail.header.location.country]
        .filter(Boolean)
        .join(", ")
    : "Localiza\u00e7\u00e3o n\u00e3o capturada";
  return (
    <CardShell className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 md:flex-row md:items-start md:justify-between md:p-7">
        <div className="flex flex-col gap-5 sm:flex-1 sm:flex-row sm:items-center">
          <Avatar name={detail.header.name} src={detail.header.avatar} />
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {detail.header.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
              <span>Paciente</span>
            </div>
            <div className="mt-4 flex min-w-0 flex-nowrap items-center gap-x-5 overflow-x-auto text-sm text-muted sm:gap-x-6 md:overflow-visible xl:gap-x-8">
              <span
                className="inline-flex min-w-0 max-w-80 shrink items-center gap-2 whitespace-nowrap"
                title={detail.header.email}
              >
                <Mail aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 truncate">{detail.header.email}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
                <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span>{detail.header.status === "active" ? "Conta ativa" : "Conta inativa"}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
                <MapPin aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span>{location}</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-muted">
              {"\u00daltimo acesso"}: {formatLastAccess(detail.header.last_access_at)}
            </p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto border-t border-border bg-surface-muted/40 px-3">
        <nav aria-label="Abas do detalhe do paciente" className="flex min-w-max gap-1 py-1">
          {PATIENT_DETAIL_TABS.map((item) => {
            const active = item.id === tab;

            return (
              <Link
                className={cn(
                  "relative inline-flex min-h-12 items-center justify-center rounded-full px-3.5 text-sm font-black transition",
                  active ? "text-primary" : "text-foreground hover:text-primary",
                )}
                href={patientTabHref(id, item.id)}
                key={item.id}
              >
                <span>{item.label}</span>
                {active ? (
                  <span className="absolute inset-x-4 bottom-1 h-1 rounded-full bg-primary" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </CardShell>
  );
};
const EngagementChart = ({ detail }: { detail: AdminPatientDetail }) => {
  const width = 980;
  const height = 280;
  const padding = { bottom: 28, left: 48, right: 28, top: 28 };
  const points = detail.series.points;
  const chartPoints = aggregateCalendarChartPoints(points, [
    "comments_created",
    "downvotes_received",
    "posts_created",
    "responses_received",
    "upvotes_received",
  ] as const);

  if (chartPoints.length === 0) {
    return (
      <CardShell className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground">Estatísticas de engajamento</h2>
            <p className="mt-1 text-sm text-muted">
              Nenhum ponto real de engajamento foi encontrado para o período selecionado.
            </p>
          </div>
          <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
            {detail.period.timezone}
          </span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {detail.metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </CardShell>
    );
  }

  const maxValue = Math.max(
    1,
    ...chartPoints.flatMap((point) => seriesConfig.map((item) => point[item.key])),
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
    <CardShell className="p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Estatísticas de engajamento</h2>
          <p className="mt-1 text-sm text-muted">
            Dados reais de posts, comentários, votos recebidos e respostas recebidas no período.
          </p>
        </div>
        <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
          {detail.period.timezone}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {detail.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
      <figure className="mt-6 overflow-hidden">
        <div className="mb-4 flex flex-wrap gap-3">
          {seriesConfig.map((item) => (
            <span
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted"
              key={item.key}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
        <div className="w-full overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
          <div className="mx-auto w-full min-w-[720px] max-w-[980px]">
            <svg
              aria-label="Gráfico de engajamento do paciente"
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
                  <g key={`grid-${value}-${y}`}>
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
              {seriesConfig.map((item) => {
                const linePoints = chartPoints.map((point, index) => ({
                  x: getX(index),
                  y: getY(point[item.key]),
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
        </div>
      </figure>
    </CardShell>
  );
};

const ActivityList = ({
  detail,
  description = detail.activities.coverage_note,
  emptyMessage = "Nenhum evento real foi encontrado para este paciente no período selecionado.",
  items = detail.activities.items,
  title = "Atividades recentes",
}: {
  detail: AdminPatientDetail;
  description?: string;
  emptyMessage?: string;
  items?: PatientsDetailActivity[];
  title?: string;
}) => (
  <CardShell className="p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <IconCircle icon={Clock3} />
        <div>
          <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      <Badge className="bg-surface-muted text-muted">{detail.activities.source}</Badge>
    </div>

    {items.length === 0 ? (
      <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">{emptyMessage}</p>
    ) : (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border text-xs text-muted">
            <tr>
              <th className="py-3 pr-3 font-black">Data</th>
              <th className="px-3 py-3 font-black">Ação</th>
              <th className="px-3 py-3 font-black">Descrição</th>
              <th className="px-3 py-3 font-black">Fonte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((activity) => (
              <tr key={activity.id}>
                <td className="py-3 pr-3 font-bold text-muted">
                  {formatDateTime(activity.occurred_at)}
                </td>
                <td className="px-3 py-3 font-black text-foreground">{activity.title}</td>
                <td className="px-3 py-3 text-muted">{activity.description}</td>
                <td className="px-3 py-3 font-bold text-foreground">
                  {activitySourceLabels[activity.source]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </CardShell>
);

const CommunityAvatar = ({
  community,
  index,
}: {
  community: PatientsDetailCommunity;
  index: number;
}) => {
  const imageSrc = safeAvatarSrc(community.avatar_url);

  if (imageSrc) {
    return (
      <Image
        alt={`Avatar da comunidade ${community.name}`}
        className="h-11 w-11 shrink-0 rounded-[18px] object-cover"
        height={44}
        src={imageSrc}
        unoptimized={isApiMediaSrc(imageSrc)}
        width={44}
      />
    );
  }

  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] text-sm font-black text-white"
      style={{ backgroundColor: community.color || "var(--admin-primary)" }}
    >
      {index + 1}
    </span>
  );
};

const Communities = ({ detail }: { detail: AdminPatientDetail }) => (
  <CardShell className="p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <IconCircle icon={UsersRound} />
        <div>
          <h2 className="text-lg font-extrabold text-foreground">Comunidades mais ativas</h2>
          <p className="mt-1 text-sm text-muted">
            Ranking calculado por participação real e interações do paciente nas comunidades.
          </p>
        </div>
      </div>
      <Badge className="bg-surface-muted text-muted">{detail.communities.source}</Badge>
    </div>
    <div className="mt-5 space-y-3">
      {detail.communities.items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma comunidade com interação real foi encontrada no período.
        </p>
      ) : (
        detail.communities.items.map((community, index) => (
          <div
            className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            key={community.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <CommunityAvatar community={community} index={index} />
              <div className="min-w-0">
                <h3 className="truncate font-black text-foreground">{community.name}</h3>
                <p className="text-sm text-muted">
                  {community.is_member ? "Membro real" : "Interação sem vínculo ativo"}
                  {community.member_since ? ` desde ${formatDateTime(community.member_since)}` : ""}
                </p>
              </div>
            </div>
            <Badge className="w-fit bg-primary-soft text-primary">
              {numberFormatter.format(community.interactions)} interações
            </Badge>
          </div>
        ))
      )}
    </div>
  </CardShell>
);

const Heatmap = ({ detail }: { detail: AdminPatientDetail }) => {
  const rows = useMemo(
    () =>
      Array.from(new Set(detail.heatmap.cells.map((cell) => cell.day_index)))
        .sort((left, right) => left - right)
        .map((dayIndex) => detail.heatmap.cells.filter((cell) => cell.day_index === dayIndex)),
    [detail.heatmap.cells],
  );
  const opacityFor = (count: number) => {
    if (count === 0 || detail.heatmap.max_count === 0) return 0.12;
    return 0.25 + (count / detail.heatmap.max_count) * 0.75;
  };

  return (
    <CardShell className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <IconCircle icon={CalendarDays} />
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Horários de maior atividade</h2>
            <p className="mt-1 text-sm text-muted">
              Agregação de eventos reais no fuso Brasília ({detail.heatmap.timezone}).
            </p>
          </div>
        </div>
        <Badge className="w-fit bg-surface-muted text-muted">
          {numberFormatter.format(detail.heatmap.total_events)} eventos
        </Badge>
      </div>
      {!detail.heatmap.available ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          {detail.heatmap.unavailable_reason || "Sem eventos suficientes para montar o heatmap."}
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[520px] space-y-2">
            {rows.map((cells) => (
              <div
                className="grid grid-cols-[52px_repeat(6,minmax(44px,1fr))] items-center gap-2"
                key={cells[0]?.day_index}
              >
                <span className="text-xs font-black text-muted">{cells[0]?.day}</span>
                {cells.map((cell) => (
                  <div
                    className="grid h-11 place-items-center rounded-xl text-xs font-black text-foreground"
                    key={`${cell.day_index}-${cell.hour}`}
                    style={{
                      backgroundColor: "var(--admin-primary)",
                      opacity: opacityFor(cell.count),
                    }}
                    title={`${cell.day} ${cell.hour_label}: ${cell.count} eventos`}
                  >
                    {cell.count}
                  </div>
                ))}
              </div>
            ))}
            <div className="grid grid-cols-[52px_repeat(6,minmax(44px,1fr))] gap-2">
              <span />
              {detail.heatmap.cells.slice(0, 6).map((cell) => (
                <span className="text-center text-xs font-bold text-muted" key={cell.hour_label}>
                  {cell.hour_label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </CardShell>
  );
};

const PrivacyNotes = ({ detail }: { detail: AdminPatientDetail }) => (
  <CardShell className="bg-primary-soft/70 p-5">
    <div className="flex gap-3">
      <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <h2 className="font-black text-foreground">Privacidade e cobertura dos dados</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          {detail.coverage_notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
          {detail.unavailable.map((item) => (
            <li key={item.id}>
              <strong className="text-foreground">{item.label}:</strong> {item.description}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Campos omitidos na V1: {detail.privacy.omitted_fields.join(", ")}.
        </p>
      </div>
    </div>
  </CardShell>
);

const FieldRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="grid gap-1 border-b border-border/80 py-3 last:border-0 sm:grid-cols-[190px_1fr]">
    <dt className="text-sm font-extrabold text-muted">{label}</dt>
    <dd className="text-sm font-bold text-foreground">{value}</dd>
  </div>
);

const InfoCard = ({
  action,
  children,
  contentAsDescriptionList = true,
  description,
  icon: Icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  contentAsDescriptionList?: boolean;
  description?: string;
  icon: LucideIcon;
  title: string;
}) => (
  <CardShell className="p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <IconCircle icon={Icon} />
        <div>
          <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="w-full sm:w-auto">{action}</div> : null}
    </div>
    {contentAsDescriptionList ? (
      <dl className="mt-4">{children}</dl>
    ) : (
      <div className="mt-4">{children}</div>
    )}
  </CardShell>
);

const EmptyTabState = ({
  description,
  icon = CheckCircle2,
  title,
}: {
  description: string;
  icon?: LucideIcon;
  title: string;
}) => (
  <CardShell className="p-6">
    <div className="flex gap-3">
      <IconCircle icon={icon} />
      <div>
        <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      </div>
    </div>
  </CardShell>
);

const formatPatientLocation = (detail: AdminPatientDetail) => {
  const location = detail.header.location;
  if (!location) return "Não capturada";

  return (
    [location.city, location.state, location.country].filter(Boolean).join(", ") || "Não capturada"
  );
};

const getOnboardingLabel = (detail: AdminPatientDetail) =>
  detail.header.onboarding_completed_at
    ? formatDateTime(detail.header.onboarding_completed_at)
    : "Sem conclusão registrada";

const SummaryCard = ({
  actionHref,
  actionLabel,
  badge,
  children,
  description,
  icon: Icon,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  badge?: ReactNode;
  children: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
}) => (
  <CardShell className="flex h-full flex-col p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-black text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <IconCircle icon={Icon} />
    </div>
    {badge ? (
      <div className="mt-5 rounded-[28px] border border-primary/15 bg-primary-soft/55 p-4">
        {badge}
      </div>
    ) : null}
    <dl className="mt-4 flex-1 divide-y divide-border text-sm">{children}</dl>
    {actionHref && actionLabel ? (
      <Link
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-control border border-primary/45 bg-surface px-4 text-sm font-black text-primary shadow-control transition hover:bg-primary-soft sm:w-auto"
        href={actionHref}
      >
        {actionLabel}
      </Link>
    ) : null}
  </CardShell>
);

const AccountSituationCard = ({ detail, id }: { detail: AdminPatientDetail; id: string }) => {
  const active = detail.header.status === "active";

  return (
    <SummaryCard
      actionHref={patientTabHref(id, "conta")}
      actionLabel="Abrir dados da conta"
      description="Resumo somente leitura de acesso do paciente."
      icon={ShieldCheck}
      title="Situação da conta"
      badge={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
              Situação atual
            </p>
            <p className="mt-1 text-xl font-black text-foreground">
              {active ? "Conta ativa" : "Conta inativa"}
            </p>
            <p className="mt-3 text-sm font-bold leading-6 text-muted">
              {active
                ? "Login liberado para uso normal da plataforma."
                : "Conta sem acesso ativo no momento; sem ações destrutivas na V1."}
            </p>
          </div>
          <Badge className={active ? "bg-emerald-50 text-success" : "bg-red-50 text-danger"}>
            {detail.header.status_label}
          </Badge>
        </div>
      }
    >
      <FieldRow label="E-mail" value={detail.header.email} />
      <FieldRow label="Último acesso" value={formatLastAccess(detail.header.last_access_at)} />
      <FieldRow label="Cadastro via" value={detail.header.provider_label} />
      <FieldRow label="Criado em" value={formatDateTime(detail.header.created_at)} />
    </SummaryCard>
  );
};

const PatientRegistrationSummaryCard = ({
  detail,
  id,
}: {
  detail: AdminPatientDetail;
  id: string;
}) => (
  <SummaryCard
    actionHref={patientTabHref(id, "perfil")}
    actionLabel="Abrir perfil e cadastro"
    description="Dados cadastrais mínimos aprovados para o Admin V1."
    icon={UserRound}
    title="Cadastro do paciente"
    badge={
      <div>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">Onboarding</p>
        <p className="mt-1 text-xl font-black text-foreground">
          {detail.header.onboarding_completed_at ? "Concluído" : "Sem conclusão registrada"}
        </p>
        <p className="mt-3 text-sm font-bold leading-6 text-muted">
          {detail.header.onboarding_completed_at
            ? "Fluxo inicial concluído com data real registrada."
            : "Nenhuma conclusão de onboarding foi encontrada para este paciente."}
        </p>
      </div>
    }
  >
    <FieldRow label="ID do paciente" value={detail.header.id} />
    <FieldRow label="Gênero" value={formatPatientGender(detail.header.gender)} />
    <FieldRow label="Localização agregada" value={formatPatientLocation(detail)} />
    <FieldRow label="Onboarding" value={getOnboardingLabel(detail)} />
  </SummaryCard>
);

const PatientEngagementSummaryCard = ({
  detail,
  id,
}: {
  detail: AdminPatientDetail;
  id: string;
}) => {
  const totalSignals = detail.metrics.reduce((total, metric) => total + metric.value, 0);
  const topCommunity = detail.communities.items[0]?.name ?? "Não informado";

  return (
    <SummaryCard
      actionHref={patientTabHref(id, "estatisticas")}
      actionLabel="Abrir estatísticas"
      description="Leitura reduzida do engajamento real no período padrão."
      icon={BarChart3}
      title="Engajamento"
      badge={
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
            Sinais no período
          </p>
          <p className="mt-1 text-3xl font-black text-foreground">
            {numberFormatter.format(totalSignals)}
          </p>
          <p className="mt-3 text-sm font-bold leading-6 text-muted">
            Soma de posts, comentários, votos e respostas recebidas, sem estimativas.
          </p>
        </div>
      }
    >
      <FieldRow label="Período" value={detail.period.label} />
      <FieldRow label="Comunidade destaque" value={topCommunity} />
      <FieldRow
        label="Eventos no heatmap"
        value={numberFormatter.format(detail.heatmap.total_events)}
      />
      <FieldRow label="Fuso" value={detail.period.timezone} />
    </SummaryCard>
  );
};

const ProfileEditButton = ({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) => (
  <button
    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-control border border-primary px-4 text-sm font-black text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:border-border disabled:text-muted sm:w-auto"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    <Pencil aria-hidden className="h-4 w-4" />
    Editar
  </button>
);

const ProfileFormActions = ({
  disabled,
  onCancel,
}: {
  disabled?: boolean;
  onCancel: () => void;
}) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
    <button
      className="inline-flex h-11 items-center justify-center rounded-control border border-border px-4 text-sm font-black text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-muted"
      disabled={disabled}
      onClick={onCancel}
      type="button"
    >
      Cancelar
    </button>
    <button
      className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
      disabled={disabled}
      type="submit"
    >
      {disabled ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
      Salvar alterações
    </button>
  </div>
);

const PatientPersonalDataRows = ({ detail }: { detail: AdminPatientDetail }) => (
  <>
    <FieldRow label="E-mail" value={detail.header.email} />
    <FieldRow label="Gênero" value={formatPatientGender(detail.header.gender)} />
    <FieldRow label="Localização" value={formatPatientLocation(detail)} />
  </>
);

const PatientPersonalDataEditForm = ({
  detail,
  onCancel,
}: {
  detail: AdminPatientDetail;
  onCancel: () => void;
}) => {
  const mutation = useAdminPatientUpdatePersonalData(detail.header.id);
  const form = useForm<PatientPersonalDataFormValues>({
    defaultValues: {
      gender: detail.header.gender || "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(patientPersonalDataSchema),
  });
  const disabled = mutation.isPending;
  const onSubmit: SubmitHandler<PatientPersonalDataFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        gender: emptyToNull(values.gender),
        reason: values.reason.trim(),
      });
      toast.success("Dados pessoais do paciente atualizados.");
      onCancel();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="rounded-2xl border border-border/80 bg-surface-muted p-4">
          <FieldRow
            label="E-mail"
            value={
              <span className="inline-flex items-center gap-2">
                {detail.header.email}
                <LockKeyhole
                  aria-label="E-mail editável somente por fluxo de conta"
                  className="h-4 w-4 text-muted"
                />
              </span>
            }
          />
          <FieldRow label="Localização" value={formatPatientLocation(detail)} />
        </div>
        <SelectController<PatientPersonalDataFormValues>
          disabled={disabled}
          label="Gênero"
          name="gender"
          options={mergeCurrentOption(PATIENT_GENDER_OPTIONS, detail.header.gender)}
        />
        <TextareaController<PatientPersonalDataFormValues>
          disabled={disabled}
          label="Motivo da alteração"
          name="reason"
          placeholder="Descreva o motivo operacional da alteração."
          required
          rows={3}
        />
        <p className="rounded-2xl bg-surface-muted p-3 text-xs font-bold leading-5 text-muted">
          E-mail e localização permanecem somente leitura nesta edição: o e-mail pertence ao fluxo
          de conta e a localização vem de dados coarse de visitor_location.
        </p>
        <ProfileFormActions disabled={disabled} onCancel={onCancel} />
      </form>
    </FormProvider>
  );
};

const ProfileRegistrationTab = ({ detail }: { detail: AdminPatientDetail }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="grid gap-5">
      <InfoCard
        action={isEditing ? null : <ProfileEditButton onClick={() => setIsEditing(true)} />}
        contentAsDescriptionList={!isEditing}
        icon={UserRound}
        title="Dados pessoais"
      >
        {isEditing ? (
          <PatientPersonalDataEditForm detail={detail} onCancel={() => setIsEditing(false)} />
        ) : (
          <PatientPersonalDataRows detail={detail} />
        )}
      </InfoCard>
    </div>
  );
};

const GeneralTab = ({ detail, id }: { detail: AdminPatientDetail; id: string }) => (
  <div className="space-y-5">
    <section>
      <h2 className="sr-only">Métricas principais do paciente</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {detail.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>

    <div className="grid items-stretch gap-5 xl:grid-cols-3">
      <AccountSituationCard detail={detail} id={id} />
      <PatientRegistrationSummaryCard detail={detail} id={id} />
      <PatientEngagementSummaryCard detail={detail} id={id} />
    </div>

    <ActivityList detail={detail} />
    <PrivacyNotes detail={detail} />
  </div>
);

const StatisticsTab = ({ detail }: { detail: AdminPatientDetail }) => (
  <div className="space-y-6">
    <EngagementChart detail={detail} />
    <div className="grid gap-6 xl:grid-cols-2">
      <Communities detail={detail} />
      <Heatmap detail={detail} />
    </div>
  </div>
);

const PublicationsTab = ({ detail }: { detail: AdminPatientDetail }) => {
  const publicationActivities = detail.activities.items.filter(
    (activity) => activity.type === "post_created",
  );

  return (
    <ActivityList
      description="Publicações derivadas dos eventos reais de posts criados pelo paciente retornados no contrato atual."
      detail={detail}
      emptyMessage="Nenhuma publicação real foi encontrada para este paciente no período consultado."
      items={publicationActivities}
      title="Publicações"
    />
  );
};

const ReportsTab = () => (
  <EmptyTabState
    description="A V1 do detalhe de pacientes não possui contrato dedicado de denúncias nem ações de moderação para paciente. Nenhum dado foi simulado nesta aba."
    icon={AlertTriangle}
    title="Denúncias"
  />
);

const AccountTab = ({ detail }: { detail: AdminPatientDetail }) => (
  <div className="grid gap-5 xl:grid-cols-2">
    <InfoCard
      description="Dados de acesso disponíveis para suporte administrativo somente leitura."
      icon={ShieldCheck}
      title="Resumo da conta"
    >
      <FieldRow label="Status" value={detail.header.status_label} />
      <FieldRow label="E-mail" value={detail.header.email} />
      <FieldRow label="Último acesso" value={formatLastAccess(detail.header.last_access_at)} />
      <FieldRow label="Origem de cadastro" value={detail.header.provider_label} />
      <FieldRow label="Criado em" value={formatDateTime(detail.header.created_at)} />
    </InfoCard>
    <EmptyTabState
      description="Não há ações administrativas destrutivas, bloqueio, silenciamento, banimento ou exclusão de paciente na V1."
      icon={Info}
      title="Ações de conta"
    />
  </div>
);

const DetailContent = ({
  detail,
  id,
  tab,
}: {
  detail: AdminPatientDetail;
  id: string;
  tab: PatientDetailTab;
}) => (
  <div className="space-y-6">
    <Header detail={detail} id={id} tab={tab} />
    {tab === "perfil" ? (
      <ProfileRegistrationTab detail={detail} />
    ) : tab === "estatisticas" ? (
      <StatisticsTab detail={detail} />
    ) : tab === "publicacoes" ? (
      <PublicationsTab detail={detail} />
    ) : tab === "denuncias" ? (
      <ReportsTab />
    ) : tab === "atividades" ? (
      <ActivityList detail={detail} />
    ) : tab === "conta" ? (
      <AccountTab detail={detail} />
    ) : (
      <GeneralTab detail={detail} id={id} />
    )}
  </div>
);
export const AdminPatientDetailClient = ({ id }: { id: string }) => {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: PatientDetailTab = isPatientDetailTab(requestedTab) ? requestedTab : "geral";
  const query = useAdminPatientDetail(id, { period: "month" });
  const queryError = query.error ? resolveApiError(query.error) : null;

  return (
    <div className="space-y-6">
      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {LOADING_PLACEHOLDERS.map((placeholder) => (
            <CardShell className="h-[8.75rem] animate-pulse bg-surface-muted" key={placeholder} />
          ))}
        </div>
      ) : null}
      {query.isFetching && !query.isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm font-bold text-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Atualizando dados reais...
        </p>
      ) : null}
      {query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}
      {query.data ? <DetailContent detail={query.data} id={id} tab={tab} /> : null}
    </div>
  );
};
