"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
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
import { useMemo, useState } from "react";
import { useAdminPatientDetail } from "@/api/callers/patients";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPatientDetail,
  PatientsDetailActivity,
  PatientsDetailMetric,
  PatientsDetailQuery,
} from "@/api/req/patients";
import { cn } from "@/lib/utils";

const QUICK_RANGES = [7, 30, 90] as const;
const LOADING_PLACEHOLDERS = ["profile", "engagement", "activity", "communities"] as const;
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
  { color: "var(--admin-info)", key: "comments_created", label: "Comentários" },
  { color: "var(--admin-success)", key: "upvotes_received", label: "Upvotes recebidos" },
  { color: "var(--admin-danger)", key: "downvotes_received", label: "Downvotes recebidos" },
  { color: "var(--admin-warning)", key: "responses_received", label: "Respostas recebidas" },
] as const;

const pad = (value: number) => String(value).padStart(2, "0");
const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};
const getQuickRange = (days: number): PatientsDetailQuery => {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - (days - 1));
  return { from: toInputDate(from), to: toInputDate(today) };
};
const isValidRange = (range: PatientsDetailQuery) =>
  Boolean(range.from && range.to && dateFromInput(range.from) <= dateFromInput(range.to));
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(dateFromInput(value));
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
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

const CardShell = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <section
    className={cn("rounded-card border border-border bg-surface shadow-admin-soft", className)}
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
      "text-xs font-black",
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
    <CardShell className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon aria-hidden className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
          fonte real
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

const PeriodFilters = ({
  range,
  setRange,
}: {
  range: PatientsDetailQuery;
  setRange: (range: PatientsDetailQuery) => void;
}) => (
  <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-admin-soft sm:flex-row sm:items-end sm:justify-between">
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
    <div className="flex flex-wrap gap-2">
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
);

const Header = ({ detail }: { detail: AdminPatientDetail }) => {
  const location = detail.header.location
    ? [detail.header.location.city, detail.header.location.state, detail.header.location.country]
        .filter(Boolean)
        .join(", ")
    : "Localização agregada não capturada";
  return (
    <CardShell className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={detail.header.name} src={detail.header.avatar} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
                {detail.header.name}
              </h1>
              <span
                className={cn(
                  "inline-flex rounded-full px-3 py-1 text-xs font-black",
                  detail.header.status === "active"
                    ? "bg-emerald-50 text-success"
                    : "bg-surface-muted text-muted",
                )}
              >
                {detail.header.status_label}
              </span>
            </div>
            <p className="mt-2 text-sm font-black text-foreground">
              ID do paciente: {detail.header.id}
            </p>
            <div className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-2 xl:grid-cols-4">
              <span className="inline-flex items-center gap-2">
                <Mail aria-hidden className="h-4 w-4 text-primary" />
                {detail.header.email}
              </span>
              <span className="inline-flex items-center gap-2">
                <UserRound aria-hidden className="h-4 w-4 text-primary" />
                {detail.header.gender || "Gênero não informado"}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin aria-hidden className="h-4 w-4 text-primary" />
                {location}
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck aria-hidden className="h-4 w-4 text-primary" />
                Cadastro via {detail.header.provider_label}
              </span>
            </div>
            <p className="mt-3 text-sm text-muted">
              Cadastro em {formatDateTime(detail.header.created_at)}
              {detail.header.onboarding_completed_at
                ? ` · onboarding concluído em ${formatDateTime(detail.header.onboarding_completed_at)}`
                : " · onboarding sem conclusão registrada"}
            </p>
          </div>
        </div>
      </div>
    </CardShell>
  );
};
const EngagementChart = ({ detail }: { detail: AdminPatientDetail }) => {
  const width = 820;
  const height = 320;
  const padding = { bottom: 46, left: 46, right: 24, top: 24 };
  const points = detail.series.points;
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => seriesConfig.map((item) => point[item.key])),
  );
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = (index: number) =>
    points.length <= 1 ? width / 2 : padding.left + (index * chartWidth) / (points.length - 1);
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;

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
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {detail.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
      <figure className="mt-6 overflow-hidden">
        <div className="mb-4 flex flex-wrap gap-3">
          {seriesConfig.map((item) => (
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
            aria-label="Gráfico de engajamento do paciente"
            className="min-w-[720px]"
            role="img"
            viewBox={`0 0 ${width} ${height}`}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const value = Math.round(maxValue * ratio);
              const y = getY(value);
              return (
                <g key={`grid-${ratio}`}>
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
            {seriesConfig.map((item) => {
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
                    strokeWidth="3"
                  />
                  {points.map((point, index) => (
                    <circle
                      cx={getX(index)}
                      cy={getY(point[item.key])}
                      fill="var(--admin-surface)"
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
                y={height - 14}
              >
                {formatDate(point.date)}
              </text>
            ))}
          </svg>
        </div>
      </figure>
    </CardShell>
  );
};

const ActivityList = ({ detail }: { detail: AdminPatientDetail }) => (
  <CardShell className="p-5">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-black text-foreground">Atividade recente</h2>
        <p className="mt-1 text-sm text-muted">{detail.activities.coverage_note}</p>
      </div>
      <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
        {detail.activities.source}
      </span>
    </div>
    <div className="mt-5 divide-y divide-border">
      {detail.activities.items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhum evento real foi encontrado para este paciente no período selecionado.
        </p>
      ) : (
        detail.activities.items.map((activity) => {
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
                  {formatDateTime(activity.occurred_at)} · {activity.source}
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

const DetailContent = ({ detail }: { detail: AdminPatientDetail }) => (
  <div className="space-y-6">
    <Header detail={detail} />
    <EngagementChart detail={detail} />
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <ActivityList detail={detail} />
      <div className="space-y-6">
        <Communities detail={detail} />
        <Heatmap detail={detail} />
      </div>
    </div>
    <PrivacyNotes detail={detail} />
    <p className="text-xs text-muted">
      Referência visual: _product/proto/admin/Pacientes/Pacientes - Detalhes.png. Builder/Quick Copy
      não está disponível neste ambiente; a implementação foi feita a partir da imagem local.
    </p>
  </div>
);
export const AdminPatientDetailClient = ({ id }: { id: string }) => {
  const [range, setRange] = useState<PatientsDetailQuery>(() => getQuickRange(30));
  const validRange = isValidRange(range);
  const query = useAdminPatientDetail(id, range, { enabled: validRange });
  const queryError = query.error ? resolveApiError(query.error) : null;
  const periodCopy = useMemo(() => {
    if (!range.from || !range.to) return "Selecione um período válido";
    return `${formatDate(range.from)} — ${formatDate(range.to)}`;
  }, [range]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="inline-flex h-11 items-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-primary shadow-control transition hover:border-primary"
            href="/pacientes"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Voltar para pacientes
          </Link>
          <div className="mt-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">TASK-61</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground md:text-4xl">
              Detalhe administrativo do paciente
            </h1>
            <p className="mt-2 text-sm font-medium text-muted">
              Visão somente leitura com engajamento, comunidades e horários a partir de dados reais.
            </p>
          </div>
        </div>
        <PeriodFilters range={range} setRange={setRange} />
      </div>
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
      {validRange && query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {LOADING_PLACEHOLDERS.map((placeholder) => (
            <CardShell className="h-40 animate-pulse bg-surface-muted" key={placeholder} />
          ))}
        </div>
      ) : null}
      {validRange && query.isFetching && !query.isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm font-bold text-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Atualizando dados reais...
        </p>
      ) : null}
      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}
      {validRange && query.data ? <DetailContent detail={query.data} /> : null}
    </div>
  );
};
