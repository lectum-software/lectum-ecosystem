"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Heart,
  Loader2,
  type LucideIcon,
  Mail,
  MapPin,
  MessageCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useAdminPatientDetail } from "@/api/callers/patients";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPatientDetail,
  PatientsDetailActivity,
  PatientsDetailMetric,
} from "@/api/req/patients";
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
const metricIcons: Record<PatientsDetailMetric["id"], LucideIcon> = {
  comments_created: MessageCircle,
  downvotes_received: ThumbsDown,
  posts_created: UserRound,
  responses_received: Heart,
  upvotes_received: ThumbsUp,
};
const activityIcons: Record<PatientsDetailActivity["type"], LucideIcon> = {
  community_joined: UsersRound,
  post_created: UserRound,
  post_reply_created: MessageCircle,
  post_reply_saved: Save,
  post_saved: Save,
  post_vote: ThumbsUp,
  professional_review_created: Heart,
};
const seriesConfig = [
  { color: "var(--admin-primary)", key: "posts_created", label: "Posts" },
  { color: "#5d9df6", key: "comments_created", label: "Comentários" },
  { color: "var(--admin-success)", key: "upvotes_received", label: "Upvotes recebidos" },
  { color: "var(--admin-danger)", key: "downvotes_received", label: "Downvotes recebidos" },
  { color: "var(--admin-warning)", key: "responses_received", label: "Respostas recebidas" },
] as const;

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
  if (src.startsWith("/")) return src;
  try {
    const url = new URL(src);
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return src;
  } catch {
    return null;
  }
  return null;
};
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

const CardShell = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <section
    className={cn(
      "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur",
      className,
    )}
  >
    {children}
  </section>
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
    <CardShell className="min-h-[8.75rem] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon aria-hidden className="h-4 w-4" />
        </div>
        <span className="rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
          fonte real
        </span>
      </div>
      <div className="mt-4 space-y-1.5">
        <p className="text-sm font-semibold text-foreground">{metric.label}</p>
        <p className="text-3xl font-bold tracking-tight text-foreground">
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
            <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted xl:gap-x-10">
              <span className="inline-flex items-center gap-2">
                <Mail aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 break-words">{detail.header.email}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span>{detail.header.status === "active" ? "Conta ativa" : "Conta inativa"}</span>
              </span>
              <span className="inline-flex items-center gap-2">
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
                  <span className="absolute bottom-1 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-primary" />
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
  emptyMessage = "Nenhum evento real foi encontrado para este paciente no per\u00edodo selecionado.",
  items = detail.activities.items,
  title = "Atividade recente",
}: {
  detail: AdminPatientDetail;
  description?: string;
  emptyMessage?: string;
  items?: PatientsDetailActivity[];
  title?: string;
}) => (
  <CardShell className="p-5">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-black text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
        {detail.activities.source}
      </span>
    </div>
    <div className="mt-5 divide-y divide-border">
      {items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">{emptyMessage}</p>
      ) : (
        items.map((activity) => {
          const Icon = activityIcons[activity.type];
          return (
            <article className="flex gap-3 py-4" key={activity.id}>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Icon aria-hidden className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-foreground">{activity.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{activity.description}</p>
                <p className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-muted">
                  <Clock3 aria-hidden className="h-3.5 w-3.5" />
                  {formatDateTime(activity.occurred_at)} - {activity.source}
                </p>
              </div>
            </article>
          );
        })
      )}
    </div>
  </CardShell>
);

const Communities = ({ detail }: { detail: AdminPatientDetail }) => (
  <CardShell className="p-5">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-black text-foreground">Comunidades mais ativas</h2>
        <p className="mt-1 text-sm text-muted">
          Ranking calculado por participação real e interações do paciente nas comunidades.
        </p>
      </div>
      <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
        {detail.communities.source}
      </span>
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
            <div className="flex items-center gap-3">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-black text-white"
                style={{ backgroundColor: community.color || "var(--admin-primary)" }}
              >
                {index + 1}
              </span>
              <div>
                <h3 className="font-black text-foreground">{community.name}</h3>
                <p className="text-sm text-muted">
                  {community.is_member ? "Membro real" : "Interação sem vínculo ativo"}
                  {community.member_since ? ` desde ${formatDateTime(community.member_since)}` : ""}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-black text-primary">
              {numberFormatter.format(community.interactions)} interações
            </span>
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Horários de maior atividade</h2>
          <p className="mt-1 text-sm text-muted">
            Agregação de eventos reais no fuso Brasília ({detail.heatmap.timezone}).
          </p>
        </div>
        <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
          {numberFormatter.format(detail.heatmap.total_events)} eventos
        </span>
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

const FieldRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="border-b border-border py-3 last:border-0">
    <dt className="text-sm font-black text-muted">{label}</dt>
    <dd className="mt-1 text-sm font-bold text-foreground">{value}</dd>
  </div>
);

const InfoCard = ({ children, title }: { children: React.ReactNode; title: string }) => (
  <CardShell className="p-5">
    <h2 className="text-lg font-black text-foreground">{title}</h2>
    <dl className="mt-4">{children}</dl>
  </CardShell>
);

const EmptyTabState = ({ description, title }: { description: string; title: string }) => (
  <CardShell className="p-6">
    <div className="flex gap-3">
      <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <h2 className="text-lg font-black text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      </div>
    </div>
  </CardShell>
);

const ProfileRegistrationTab = ({ detail }: { detail: AdminPatientDetail }) => {
  const location = detail.header.location;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <InfoCard title="Perfil do paciente">
        <FieldRow label="Nome" value={detail.header.name} />
        <FieldRow label="E-mail" value={detail.header.email} />
        <FieldRow label="G\u00eanero" value={formatNullable(detail.header.gender)} />
        <FieldRow
          label="Localiza\u00e7\u00e3o agregada"
          value={
            location
              ? [location.city, location.state, location.country].filter(Boolean).join(", ") ||
                "N\u00e3o capturada"
              : "N\u00e3o capturada"
          }
        />
      </InfoCard>
      <InfoCard title="Cadastro">
        <FieldRow label="ID do paciente" value={detail.header.id} />
        <FieldRow label="Status" value={detail.header.status_label} />
        <FieldRow label="Cadastro via" value={detail.header.provider_label} />
        <FieldRow label="Criado em" value={formatDateTime(detail.header.created_at)} />
        <FieldRow
          label="Onboarding"
          value={
            detail.header.onboarding_completed_at
              ? formatDateTime(detail.header.onboarding_completed_at)
              : "Sem conclus\u00e3o registrada"
          }
        />
      </InfoCard>
    </div>
  );
};

const GeneralTab = ({ detail }: { detail: AdminPatientDetail }) => (
  <div className="space-y-6">
    <EngagementChart detail={detail} />
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <ActivityList detail={detail} />
      <div className="space-y-6">
        <Communities detail={detail} />
        <Heatmap detail={detail} />
      </div>
    </div>
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
      description="Publica\u00e7\u00f5es derivadas dos eventos reais de posts criados pelo paciente retornados no contrato atual."
      detail={detail}
      emptyMessage="Nenhuma publica\u00e7\u00e3o real foi encontrada para este paciente no per\u00edodo consultado."
      items={publicationActivities}
      title="Publica\u00e7\u00f5es"
    />
  );
};

const ReportsTab = () => (
  <EmptyTabState
    description="A V1 do detalhe de pacientes n\u00e3o possui contrato dedicado de den\u00fancias nem a\u00e7\u00f5es de modera\u00e7\u00e3o para paciente. Nenhum dado foi simulado nesta aba."
    title="Den\u00fancias"
  />
);

const AccountTab = ({ detail }: { detail: AdminPatientDetail }) => (
  <div className="grid gap-6 xl:grid-cols-2">
    <InfoCard title="Conta">
      <FieldRow label="Status" value={detail.header.status_label} />
      <FieldRow label="E-mail" value={detail.header.email} />
      <FieldRow label="Origem de cadastro" value={detail.header.provider_label} />
      <FieldRow label="Criado em" value={formatDateTime(detail.header.created_at)} />
    </InfoCard>
    <EmptyTabState
      description="N\u00e3o h\u00e1 a\u00e7\u00f5es administrativas destrutivas, bloqueio, silenciamento, banimento ou exclus\u00e3o de paciente na V1."
      title="A\u00e7\u00f5es de conta"
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
      <GeneralTab detail={detail} />
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
