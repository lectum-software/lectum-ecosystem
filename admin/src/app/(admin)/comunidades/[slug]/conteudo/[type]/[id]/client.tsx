"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bookmark,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Eye,
  FileText,
  Flag,
  Loader2,
  MessageCircle,
  Play,
  RefreshCw,
  Share2,
  ShieldCheck,
  Trash2,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type SVGProps, useMemo, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  useAdminCommunityContentDetail,
  useAdminCommunityRemoveContent,
} from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import type {
  AdminCommunityContentAnalyticsDetail,
  AdminCommunityContentAuthor,
  AdminCommunityContentDetailQuery,
} from "@/api/req/communities";
import { InputController, TextareaController } from "@/components/controllers";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("pt-BR");
const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const publicFrontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
const publicMediaPathPrefixes = ["/public/files/", "/community/icons/"] as const;
const cardClass = "rounded-card border border-border bg-surface/95 shadow-admin-soft";

type ContentDetailPeriodValue = NonNullable<AdminCommunityContentDetailQuery["period"]>;
type ContentDetailTargetType = "comment" | "post" | "reply";
type ContentDetailRange = Pick<AdminCommunityContentDetailQuery, "from" | "to">;
type SeriesPoint = AdminCommunityContentAnalyticsDetail["series"][number];

const contentDetailPeriodOptions = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "all", label: "Todo o período" },
  { id: "custom", label: "Personalizado" },
] as const satisfies ReadonlyArray<{ id: ContentDetailPeriodValue; label: string }>;

const removalFormSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .refine(
      (value) => value.toUpperCase() === "REMOVER CONTEUDO",
      "Digite REMOVER CONTEUDO para confirmar.",
    ),
  reason: z.string().trim().min(3, "Informe o motivo.").max(500, "Use até 500 caracteres."),
});

type RemovalFormValues = z.infer<typeof removalFormSchema>;

const formatCount = (value: number) => numberFormatter.format(value);
const formatPercent = (value: number | null) =>
  value === null ? "—" : `${percentageFormatter.format(value)}%`;

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return dateTimeFormatter.format(date);
};

const formatDuration = (seconds: number | null) => {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = String(seconds % 60).padStart(2, "0");

  return `${minutes}:${remaining}`;
};

const todayDateInput = () => new Date().toISOString().slice(0, 10);

const defaultCustomRange = (): ContentDetailRange => {
  const today = todayDateInput();

  return { from: today, to: today };
};

const isValidCustomRange = (range: ContentDetailRange) => {
  if (!range.from || !range.to) return false;

  return range.from <= range.to;
};

const normalizeTargetType = (value: string): ContentDetailTargetType | null => {
  if (value === "post" || value === "comment" || value === "reply") return value;

  return null;
};

const detailHref = (slug: string, type: string, id: string) =>
  `/comunidades/${encodeURIComponent(slug)}/conteudo/${encodeURIComponent(
    type,
  )}/${encodeURIComponent(id)}`;

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
      // Entrada inválida de env não deve quebrar a tela administrativa.
    }
  }

  return hosts;
};

const canRenderImage = (src: string | null) => {
  const resolved = resolveAdminMediaUrl(src);
  if (!resolved) return false;
  if (resolved.startsWith("/")) return true;

  try {
    return allowedRemoteImageHosts().has(new URL(resolved).hostname);
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

const initials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AU";

const statusLabel = (status: AdminCommunityContentAnalyticsDetail["content"]["status"]) =>
  status === "published" ? "Publicado" : "Removido";

const contentTitle = (detail: AdminCommunityContentAnalyticsDetail) =>
  detail.content.title?.trim() ||
  detail.content.excerpt.trim() ||
  (detail.content.type === "post" ? "Post sem título" : "Resposta");

const metricCards = (detail: AdminCommunityContentAnalyticsDetail) => [
  {
    icon: Eye,
    id: "views",
    label: "Visualizações",
    value: detail.metrics.views_count,
  },
  {
    icon: ArrowUp,
    id: "upvotes",
    label: "Upvotes",
    value: detail.metrics.upvotes_count,
  },
  {
    icon: ArrowDown,
    id: "downvotes",
    label: "Downvotes",
    value: detail.metrics.downvotes_count,
  },
  {
    icon: MessageCircle,
    id: "comments",
    label: detail.content.type === "post" ? "Comentários" : "Respostas geradas",
    value: detail.metrics.comments_count,
  },
  {
    icon: Bookmark,
    id: "saves",
    label: "Salvamentos",
    value: detail.metrics.saves_count,
  },
  {
    icon: Share2,
    id: "shares",
    label: "Compartilhamentos",
    value: detail.metrics.shares_count,
  },
  {
    icon: Flag,
    id: "reports",
    label: "Denúncias",
    value: detail.metrics.reports_count,
  },
  {
    icon: ShieldCheck,
    id: "moderation",
    label: "Moderação",
    value: detail.metrics.moderation_events_count,
  },
];

const VerifiedBadgeIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("h-4 w-4 shrink-0 text-primary", className)}
    fill="none"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>Perfil verificado</title>
    <path
      d="M10 1.667 12.166 3.2l2.648-.17.83 2.52 2.13 1.58-.97 2.47.97 2.47-2.13 1.58-.83 2.52-2.648-.17L10 18.333 7.834 16.8l-2.648.17-.83-2.52-2.13-1.58.97-2.47-.97-2.47 2.13-1.58.83-2.52 2.648.17L10 1.667Z"
      fill="currentColor"
    />
    <path
      d="m7.58 10.19 1.57 1.57 3.38-3.52"
      stroke="white"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

const AuthorIdentity = ({
  author,
}: {
  author: AdminCommunityContentAuthor & { role_label: string };
}) => {
  const avatarSrc = renderableImageSrc(author.avatar);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-primary-soft text-xs font-black text-primary">
        {avatarSrc ? (
          <Image
            alt={`Foto de perfil de ${author.name}`}
            className="object-cover"
            fill
            sizes="48px"
            src={avatarSrc}
            unoptimized={isAdminPublicMediaUrl(author.avatar)}
          />
        ) : (
          initials(author.name)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-black text-foreground">{author.name}</span>
          {author.verified ? <VerifiedBadgeIcon aria-label="Perfil verificado" /> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-bold text-muted">
          <span>{author.role_label}</span>
          {author.anonymous ? (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 font-black text-primary">
              Anônimo no público
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const PeriodFilters = ({
  customRange,
  disabled,
  onCustomRangeChange,
  onPeriodChange,
  period,
  rangeError,
}: {
  customRange: ContentDetailRange;
  disabled: boolean;
  onCustomRangeChange: (range: ContentDetailRange) => void;
  onPeriodChange: (value: ContentDetailPeriodValue) => void;
  period: ContentDetailPeriodValue;
  rangeError: string | null;
}) => (
  <section className={cn(cardClass, "p-4 sm:p-5")} aria-labelledby="content-detail-period-title">
    <div className="grid gap-3 lg:grid-cols-[1fr_0.7fr_0.7fr] lg:items-end">
      <label className="block text-sm font-black text-muted" htmlFor="content-detail-period">
        Período independente do detalhe
        <span className="relative mt-2 block">
          <select
            className="h-11 w-full appearance-none rounded-control border border-border bg-surface px-3 pr-12 text-sm font-bold text-foreground disabled:opacity-70"
            disabled={disabled}
            id="content-detail-period"
            onChange={(event) => onPeriodChange(event.target.value as ContentDetailPeriodValue)}
            value={period}
          >
            {contentDetailPeriodOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />
        </span>
      </label>
      <label className="block text-sm font-black text-muted" htmlFor="content-detail-from">
        De
        <input
          className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground disabled:opacity-70"
          disabled={disabled || period !== "custom"}
          id="content-detail-from"
          max={customRange.to}
          onChange={(event) => onCustomRangeChange({ ...customRange, from: event.target.value })}
          type="date"
          value={customRange.from ?? ""}
        />
      </label>
      <label className="block text-sm font-black text-muted" htmlFor="content-detail-to">
        Até
        <input
          className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground disabled:opacity-70"
          disabled={disabled || period !== "custom"}
          id="content-detail-to"
          min={customRange.from}
          onChange={(event) => onCustomRangeChange({ ...customRange, to: event.target.value })}
          type="date"
          value={customRange.to ?? ""}
        />
      </label>
    </div>
    <p className="mt-3 text-xs font-bold text-muted" id="content-detail-period-title">
      O filtro recalcula somente esta página e não altera os filtros da aba Conteúdo.
    </p>
    {rangeError ? <p className="mt-2 text-xs font-bold text-danger">{rangeError}</p> : null}
  </section>
);

const HeaderSection = ({
  detail,
  slug,
}: {
  detail: AdminCommunityContentAnalyticsDetail;
  slug: string;
}) => {
  const title = contentTitle(detail);

  return (
    <section className={cn(cardClass, "p-5")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <nav className="flex flex-wrap items-center gap-2 text-xs font-black text-muted">
            <Link className="hover:text-primary" href="/comunidades">
              Comunidades
            </Link>
            <span aria-hidden>›</span>
            <Link className="hover:text-primary" href={`/comunidades/${slug}`}>
              {detail.community.name}
            </Link>
            <span aria-hidden>›</span>
            <Link className="hover:text-primary" href={`/comunidades/${slug}?tab=conteudo`}>
              Conteúdo
            </Link>
            <span aria-hidden>›</span>
            <span>Detalhe</span>
          </nav>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-black text-primary">
              {detail.content.content_kind_label}
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-black",
                detail.content.status === "published"
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger",
              )}
            >
              {statusLabel(detail.content.status)}
            </span>
            {detail.content.media?.media_type.toLowerCase() === "video" ? (
              <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-black text-muted">
                Vídeo
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 max-w-4xl text-2xl font-black leading-tight tracking-[-0.03em] text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm font-bold text-muted">
            Publicado em {formatDateTime(detail.content.created_at)} · fonte: {detail.source}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-xs font-black text-foreground transition hover:border-primary hover:text-primary"
            href={`/comunidades/${slug}?tab=conteudo`}
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Voltar ao Conteúdo
          </Link>
          {detail.content.public_url ? (
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-primary px-4 text-xs font-black text-white transition hover:bg-primary/90"
              href={toPublicHref(detail.content.public_url)}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink aria-hidden className="h-4 w-4" />
              Abrir público
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
};

const ContentVideoPreview = ({ label, src }: { label: string; src: string }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
      return;
    }

    video.pause();
  };

  return (
    <div className="relative aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-[24px] border border-border bg-black">
      {/* biome-ignore lint/a11y/useMediaCaption: o backend ainda não expõe arquivo de legenda para vídeos de conteúdo da comunidade. */}
      <video
        aria-label={label}
        className="h-full w-full object-contain"
        controls
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
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
          aria-label="Reproduzir vídeo do conteúdo"
          className="absolute left-1/2 top-1/2 inline-flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm transition hover:bg-white"
          onClick={togglePlayback}
          type="button"
        >
          <Play aria-hidden className="h-5 w-5 fill-current" />
        </button>
      ) : null}
    </div>
  );
};

const ContentMediaPreview = ({ detail }: { detail: AdminCommunityContentAnalyticsDetail }) => {
  const media = detail.content.media;
  if (!media) return null;

  const mediaType = media.media_type.toLowerCase();
  const imageSrc = mediaType === "image" ? renderableImageSrc(media.media_url) : null;
  const videoSrc = mediaType === "video" ? resolveAdminMediaUrl(media.media_url) : null;

  if (imageSrc) {
    return (
      <div className="relative h-72 w-full overflow-hidden rounded-[24px] border border-border bg-surface-muted sm:h-96">
        <Image
          alt={`Mídia de ${contentTitle(detail)}`}
          className="object-contain"
          fill
          sizes="(max-width: 768px) 100vw, 640px"
          src={imageSrc}
          unoptimized={isAdminPublicMediaUrl(media.media_url)}
        />
      </div>
    );
  }

  if (videoSrc)
    return <ContentVideoPreview label={`Vídeo de ${contentTitle(detail)}`} src={videoSrc} />;

  return (
    <div className="grid min-h-48 place-items-center rounded-[24px] border border-border bg-surface-muted p-6 text-center text-sm font-bold text-muted">
      Mídia registrada, mas indisponível para preview no Admin.
    </div>
  );
};

const PreviewSection = ({ detail }: { detail: AdminCommunityContentAnalyticsDetail }) => (
  <section className={cn(cardClass, "grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]")}>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2 text-xs font-black text-muted">
        <FileText aria-hidden className="h-4 w-4" />
        <span>{detail.content.type === "post" ? "Post" : "Resposta/comentário"}</span>
        <span aria-hidden>·</span>
        <span>{detail.community.name}</span>
      </div>
      <div className="mt-4">
        <AuthorIdentity author={detail.author} />
      </div>
      {detail.content.origin_preview ? (
        <div className="mt-4 rounded-2xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">
            {detail.content.origin_preview.label}
          </p>
          <p className="mt-2 text-sm font-black text-foreground">
            {detail.content.origin_preview.title || "Sem título"}
          </p>
          <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted">
            {detail.content.origin_preview.excerpt || "Sem trecho disponível."}
          </p>
        </div>
      ) : null}
      <div className="mt-5 rounded-2xl bg-surface-muted p-4">
        <p className="whitespace-pre-line text-sm leading-6 text-foreground">
          {detail.content.body || detail.content.excerpt || "Sem texto disponível."}
        </p>
      </div>
    </div>
    <ContentMediaPreview detail={detail} />
  </section>
);

const StatCards = ({ detail }: { detail: AdminCommunityContentAnalyticsDetail }) => (
  <section aria-labelledby="content-detail-stats-title">
    <h2 className="sr-only" id="content-detail-stats-title">
      Estatísticas principais do conteúdo
    </h2>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metricCards(detail).map((metric) => (
        <article className={cn(cardClass, "p-4")} key={metric.id}>
          <span className="grid h-11 w-11 place-items-center rounded-[18px] bg-primary-soft text-primary">
            <metric.icon aria-hidden className="h-5 w-5" />
          </span>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-muted">
            {metric.label}
          </p>
          <p className="mt-2 text-3xl font-black text-foreground">{formatCount(metric.value)}</p>
        </article>
      ))}
    </div>
  </section>
);

const seriesConfigs = [
  { color: "#2F8CFF", key: "views", label: "Visualizações" },
  { color: "#12B76A", key: "upvotes", label: "Upvotes" },
  { color: "#EF4444", key: "downvotes", label: "Downvotes" },
  { color: "#8B5CF6", key: "comments", label: "Comentários" },
  { color: "#F59E0B", key: "saves", label: "Salvamentos" },
  { color: "#0EA5E9", key: "shares", label: "Compartilhamentos" },
  { color: "#10B981", key: "whatsapp_clicks", label: "Cliques WhatsApp" },
  { color: "#64748B", key: "reports", label: "Denúncias" },
] as const satisfies ReadonlyArray<{
  color: string;
  key: Exclude<keyof SeriesPoint, "date">;
  label: string;
}>;

const seriesPointValue = (point: SeriesPoint, key: (typeof seriesConfigs)[number]["key"]) =>
  point[key];

const buildPolyline = (
  points: SeriesPoint[],
  key: (typeof seriesConfigs)[number]["key"],
  maxValue: number,
) =>
  points
    .map((point, index) => {
      const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * 100;
      const y = 100 - (seriesPointValue(point, key) / maxValue) * 100;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

const EvolutionChart = ({ detail }: { detail: AdminCommunityContentAnalyticsDetail }) => {
  const points = detail.series;
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) =>
      seriesConfigs.map((config) => seriesPointValue(point, config.key)),
    ),
  );
  const totalEvents = points.reduce(
    (total, point) =>
      total +
      point.views +
      point.upvotes +
      point.downvotes +
      point.comments +
      point.saves +
      point.shares +
      point.whatsapp_clicks +
      point.reports,
    0,
  );
  const latestPoints = points.slice(-7);

  return (
    <section className={cn(cardClass, "p-5")} aria-labelledby="content-detail-chart-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground" id="content-detail-chart-title">
            Evolução por período
          </h2>
          <p className="mt-1 text-sm font-bold text-muted">
            {detail.period.label} · {detail.period.from} a {detail.period.to}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-black text-primary">
          <CalendarDays aria-hidden className="h-4 w-4" />
          {formatCount(points.length)} pontos
        </span>
      </div>
      {totalEvents === 0 ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
          Nenhuma interação real encontrada neste período. O gráfico permanece vazio sem simular
          tendência.
        </p>
      ) : (
        <>
          <div className="mt-5 overflow-hidden rounded-[24px] border border-border bg-surface-muted p-3">
            <svg
              aria-label="Gráfico com evolução diária de visualizações, votos, comentários, salvamentos, compartilhamentos e denúncias"
              className="h-72 w-full overflow-visible"
              preserveAspectRatio="none"
              role="img"
              viewBox="0 0 100 100"
            >
              <title>Evolução diária do conteúdo</title>
              {[0, 25, 50, 75, 100].map((line) => (
                <line
                  key={line}
                  stroke="currentColor"
                  strokeDasharray="2 2"
                  strokeWidth="0.25"
                  className="text-border"
                  x1="0"
                  x2="100"
                  y1={line}
                  y2={line}
                />
              ))}
              {seriesConfigs.map((config) => (
                <polyline
                  fill="none"
                  key={config.key}
                  points={buildPolyline(points, config.key, maxValue)}
                  stroke={config.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
            {seriesConfigs.map((config) => (
              <span
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-muted"
                key={config.key}
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                {config.label}
              </span>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-surface-muted p-4">
            <p className="text-sm font-black text-foreground">Alternativa textual</p>
            <ul className="mt-3 grid gap-2 text-xs font-bold text-muted sm:grid-cols-2">
              {latestPoints.map((point) => (
                <li key={point.date}>
                  {point.date}: {formatCount(point.views)} views, {formatCount(point.upvotes)} up,
                  {formatCount(point.comments)} comentários, {formatCount(point.reports)} denúncias.
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
};

const VideoRetentionSection = ({ detail }: { detail: AdminCommunityContentAnalyticsDetail }) => {
  const video = detail.video;
  if (!video) return null;

  return (
    <section className={cn(cardClass, "p-5")} aria-labelledby="content-detail-retention-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground" id="content-detail-retention-title">
            Retenção de vídeo
          </h2>
          <p className="mt-1 text-sm font-bold text-muted">Fonte real: {video.source}</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-black text-primary">
          <Video aria-hidden className="h-4 w-4" />
          {formatCount(video.metrics.plays_count)} plays
        </span>
      </div>
      {!video.available ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
          {video.unavailable_reason ||
            "Retenção indisponível - a coleta começa a partir dos próximos acessos ao vídeo."}
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <p className="rounded-2xl bg-surface-muted p-4">
              <span className="block text-xs font-black text-muted">Conclusões</span>
              <strong className="mt-1 block text-2xl font-black text-foreground">
                {formatCount(video.metrics.completed_count)}
              </strong>
            </p>
            <p className="rounded-2xl bg-surface-muted p-4">
              <span className="block text-xs font-black text-muted">Taxa de conclusão</span>
              <strong className="mt-1 block text-2xl font-black text-foreground">
                {formatPercent(video.metrics.completion_rate)}
              </strong>
            </p>
            <p className="rounded-2xl bg-surface-muted p-4">
              <span className="block text-xs font-black text-muted">Replays</span>
              <strong className="mt-1 block text-2xl font-black text-foreground">
                {formatCount(video.metrics.replay_count)}
              </strong>
            </p>
            <p className="rounded-2xl bg-surface-muted p-4">
              <span className="block text-xs font-black text-muted">Tempo médio</span>
              <strong className="mt-1 block text-2xl font-black text-foreground">
                {formatDuration(video.metrics.average_watched_seconds)}
              </strong>
            </p>
            <p className="rounded-2xl bg-surface-muted p-4">
              <span className="block text-xs font-black text-muted">Retenção média</span>
              <strong className="mt-1 block text-2xl font-black text-foreground">
                {formatPercent(video.metrics.average_retention_percent)}
              </strong>
            </p>
          </div>
          <div className="mt-5 overflow-hidden rounded-[24px] border border-border bg-surface-muted p-3">
            <svg
              aria-label="Gráfico de retenção de vídeo por percentual alcançado"
              className="h-64 w-full overflow-visible"
              preserveAspectRatio="none"
              role="img"
              viewBox="0 0 100 100"
            >
              <title>Retenção do vídeo do conteúdo</title>
              <polyline
                fill="none"
                points={video.retention
                  .map((point) => `${point.position_percent},${100 - point.percentage}`)
                  .join(" ")}
                stroke="#2F8CFF"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          {video.retention_dropoff ? (
            <p className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
              Maior queda: {video.retention_dropoff.from_label} → {video.retention_dropoff.to_label}{" "}
              ({formatPercent(video.retention_dropoff.rate_drop)}
              ).
            </p>
          ) : null}
        </>
      )}
    </section>
  );
};

const ModerationSection = ({ detail }: { detail: AdminCommunityContentAnalyticsDetail }) => (
  <section className={cn(cardClass, "p-5")} aria-labelledby="content-detail-moderation-title">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-black text-foreground" id="content-detail-moderation-title">
          Denúncias e moderação
        </h2>
        <p className="mt-1 text-sm font-bold text-muted">
          Eventos associados diretamente ao conteúdo.
        </p>
      </div>
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-muted px-3 py-1 text-xs font-black text-muted">
        <Flag aria-hidden className="h-4 w-4" />
        {formatCount(detail.moderation.reports.length)} denúncias
      </span>
    </div>
    <div className="mt-5 grid gap-4 xl:grid-cols-2">
      <div>
        <h3 className="text-sm font-black text-foreground">Denúncias</h3>
        {detail.moderation.reports.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
            Nenhuma denúncia real associada a este conteúdo.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {detail.moderation.reports.map((report) => (
              <article
                className="rounded-2xl border border-border bg-surface-muted p-4"
                key={report.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-black text-muted">
                    {report.status_label}
                  </span>
                  <span className="text-xs font-bold text-muted">{report.reason_label}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-foreground">{report.reported_by.label}</p>
                {report.description ? (
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted">
                    {report.description}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-sm font-black text-foreground">Eventos de moderação</h3>
        {detail.moderation.events.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
            Nenhum evento de moderação associado ao conteúdo.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {detail.moderation.events.map((event) => (
              <article
                className="rounded-2xl border border-border bg-surface-muted p-4"
                key={event.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-black text-muted">
                    {event.status}
                  </span>
                  <span className="text-xs font-bold text-muted">{event.severity}</span>
                </div>
                <p className="mt-2 text-sm font-black text-foreground">{event.reason_code}</p>
                <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted">
                  {event.content_excerpt}
                </p>
                <p className="mt-2 text-[11px] font-bold text-muted">
                  Criado em {formatDateTime(event.created_at)}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  </section>
);

const OperationalMetadata = ({ detail }: { detail: AdminCommunityContentAnalyticsDetail }) => (
  <section className={cn(cardClass, "p-5")} aria-labelledby="content-detail-metadata-title">
    <h2 className="text-xl font-black text-foreground" id="content-detail-metadata-title">
      Metadados operacionais
    </h2>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Comunidade", detail.community.name],
        ["Autor", detail.author.name],
        ["Publicado em", formatDateTime(detail.content.created_at)],
        ["Editado em", formatDateTime(detail.content.edited_at)],
        ["Removido em", formatDateTime(detail.content.deleted_at)],
        ["Post ID", detail.content.post_id],
        ["Conteúdo ID", detail.content.id],
        ["Período", detail.period.label],
      ].map(([label, value]) => (
        <div className="rounded-2xl bg-surface-muted p-4" key={label}>
          <dt className="text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</dt>
          <dd className="mt-1 break-words font-bold text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
    <p className="mt-4 rounded-2xl bg-primary-soft p-4 text-sm font-bold text-primary">
      Retenção de vídeo não tem backfill: vídeos publicados antes da coleta começam vazios e passam
      a aparecer conforme novos acessos reais forem registrados.
    </p>
  </section>
);

const ContentRemovalForm = ({
  detail,
  onCancel,
  onRemoved,
  slug,
}: {
  detail: AdminCommunityContentAnalyticsDetail;
  onCancel: () => void;
  onRemoved: () => void;
  slug: string;
}) => {
  const mutation = useAdminCommunityRemoveContent(slug);
  const form = useForm<RemovalFormValues>({
    defaultValues: { confirmation: "", reason: "" },
    mode: "onSubmit",
    resolver: zodResolver(removalFormSchema),
  });

  const onSubmit = async (values: RemovalFormValues) => {
    try {
      await mutation.mutateAsync({
        input: {
          confirmation: values.confirmation,
          reason: values.reason.trim(),
        },
        targetId: detail.content.id,
        targetType: detail.content.type,
      });
      toast.success("Conteúdo removido com auditoria administrativa.");
      form.reset();
      onRemoved();
      onCancel();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form
        className="grid gap-3 rounded-2xl border border-danger/20 bg-danger/5 p-4"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div>
          <p className="text-sm font-black text-danger">Remoção auditada existente</p>
          <p className="mt-1 text-xs leading-5 text-danger">
            Esta ação usa o fluxo administrativo já auditado da aba Conteúdo.
          </p>
        </div>
        <TextareaController<RemovalFormValues>
          label="Motivo interno obrigatório"
          name="reason"
          required
          rows={3}
        />
        <InputController<RemovalFormValues>
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
            {mutation.isPending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            Remover conteúdo
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

const RemovalSection = ({
  detail,
  onRemoved,
  slug,
}: {
  detail: AdminCommunityContentAnalyticsDetail;
  onRemoved: () => void;
  slug: string;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <section className={cn(cardClass, "p-5")} aria-labelledby="content-detail-removal-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground" id="content-detail-removal-title">
            Ações administrativas
          </h2>
          <p className="mt-1 text-sm font-bold text-muted">
            Remoção usa a mutation auditada existente, sem endpoint paralelo.
          </p>
        </div>
        {detail.content.status === "published" ? (
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-danger/20 px-4 text-xs font-black text-danger transition hover:bg-danger/10"
            onClick={() => setOpen((current) => !current)}
            type="button"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
            {open ? "Fechar remoção" : "Remover conteúdo"}
          </button>
        ) : (
          <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-black text-muted">
            Conteúdo já removido
          </span>
        )}
      </div>
      {open ? (
        <div className="mt-4">
          <ContentRemovalForm
            detail={detail}
            onCancel={() => setOpen(false)}
            onRemoved={onRemoved}
            slug={slug}
          />
        </div>
      ) : null}
    </section>
  );
};

export const AdminCommunityContentDetailClient = ({
  contentId,
  contentType,
  slug,
}: {
  contentId: string;
  contentType: string;
  slug: string;
}) => {
  const normalizedType = normalizeTargetType(contentType);
  const [period, setPeriod] = useState<ContentDetailPeriodValue>("month");
  const [customRange, setCustomRange] = useState<ContentDetailRange>(() => defaultCustomRange());
  const rangeError =
    period === "custom" && !isValidCustomRange(customRange)
      ? "Informe um período personalizado completo, com data inicial menor ou igual à final."
      : null;
  const queryInput = useMemo<AdminCommunityContentDetailQuery>(
    () => ({
      from: period === "custom" ? customRange.from : undefined,
      period,
      to: period === "custom" ? customRange.to : undefined,
    }),
    [customRange.from, customRange.to, period],
  );
  const detailQuery = useAdminCommunityContentDetail(
    slug,
    normalizedType ?? "post",
    contentId,
    queryInput,
    {
      enabled: Boolean(normalizedType && !rangeError),
    },
  );
  const detail = detailQuery.data;

  if (!normalizedType) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className={cn(cardClass, "p-5")}>
          <AlertTriangle className="h-6 w-6 text-danger" aria-hidden />
          <h1 className="mt-3 text-xl font-black text-foreground">Tipo de conteúdo inválido</h1>
          <p className="mt-2 text-sm text-muted">Use post, comment ou reply na rota.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          className="inline-flex w-fit items-center gap-2 rounded-control border border-border bg-surface px-4 py-2 text-xs font-black text-foreground transition hover:border-primary hover:text-primary"
          href={`/comunidades/${slug}?tab=conteudo`}
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Voltar
        </Link>
        <button
          className="inline-flex w-fit items-center gap-2 rounded-control border border-border bg-surface px-4 py-2 text-xs font-black text-foreground transition hover:border-primary hover:text-primary disabled:opacity-70"
          disabled={detailQuery.isFetching}
          onClick={() => void detailQuery.refetch()}
          type="button"
        >
          <RefreshCw
            aria-hidden
            className={cn("h-4 w-4", detailQuery.isFetching && "animate-spin")}
          />
          Atualizar
        </button>
      </div>

      <PeriodFilters
        customRange={customRange}
        disabled={detailQuery.isFetching}
        onCustomRangeChange={setCustomRange}
        onPeriodChange={setPeriod}
        period={period}
        rangeError={rangeError}
      />

      {detailQuery.isLoading ? (
        <div className={cn(cardClass, "grid min-h-64 place-items-center p-8")}>
          <span className="inline-flex items-center gap-2 text-sm font-black text-muted">
            <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
            Carregando analytics reais do conteúdo
          </span>
        </div>
      ) : null}

      {detailQuery.isError ? (
        <div className={cn(cardClass, "p-5")}>
          <AlertTriangle aria-hidden className="h-6 w-6 text-danger" />
          <h1 className="mt-3 text-xl font-black text-foreground">Conteúdo indisponível</h1>
          <p className="mt-2 text-sm font-bold text-muted">{resolveApiError(detailQuery.error)}</p>
        </div>
      ) : null}

      {detail ? (
        <>
          <HeaderSection detail={detail} slug={slug} />
          <PreviewSection detail={detail} />
          <StatCards detail={detail} />
          <EvolutionChart detail={detail} />
          <VideoRetentionSection detail={detail} />
          <ModerationSection detail={detail} />
          <RemovalSection
            detail={detail}
            onRemoved={() => void detailQuery.refetch()}
            slug={slug}
          />
          <OperationalMetadata detail={detail} />
          <p className="text-xs font-bold text-muted">
            Rota atual: {detailHref(slug, normalizedType, contentId)}
          </p>
        </>
      ) : null}
    </main>
  );
};
