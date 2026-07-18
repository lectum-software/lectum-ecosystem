"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  FileText,
  Flag,
  Loader2,
  MessageCircle,
  Play,
  RotateCcw,
  Share2,
  Timer,
  Trash2,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type FocusEventHandler, type SVGProps, useMemo, useRef, useState } from "react";
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
import { useDateRangeCommitOnBlur } from "@/hooks/use-date-range-commit-on-blur";
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
const cardClass =
  "min-w-0 max-w-full rounded-card border border-border bg-surface/95 shadow-admin-soft";

type ContentDetailTargetType = "comment" | "post" | "reply";
type ContentDetailPeriodValue = NonNullable<AdminCommunityContentDetailQuery["period"]>;
type ContentDetailPeriodPreset = Exclude<ContentDetailPeriodValue, "custom">;
type ContentDetailDateRange = Required<Pick<AdminCommunityContentDetailQuery, "from" | "to">>;

const CONTENT_DETAIL_PERIOD_OPTIONS = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "all", label: "Todo o período" },
] as const satisfies ReadonlyArray<{
  id: ContentDetailPeriodPreset;
  label: string;
}>;

const pad = (value: number) => String(value).padStart(2, "0");
const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const startOfCurrentWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  return date;
};
const startOfCurrentMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const startOfCurrentYear = () => new Date(new Date().getFullYear(), 0, 1);
const getContentDetailRangeForPeriod = (
  period: ContentDetailPeriodPreset,
): ContentDetailDateRange => {
  const today = toInputDate(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "all") return { from: "", to: today };
  if (period === "month") return { from: toInputDate(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toInputDate(startOfCurrentYear()), to: today };

  return { from: toInputDate(startOfCurrentWeek()), to: today };
};
const isValidCustomDateRange = (range: ContentDetailDateRange) =>
  Boolean(range.from && range.to && range.from <= range.to);
const buildContentDetailPeriodQuery = (
  period: ContentDetailPeriodValue,
  range: ContentDetailDateRange,
): AdminCommunityContentDetailQuery =>
  period === "custom" ? { from: range.from, period, to: range.to } : { period };

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
const formatPercent = (value?: number | null) =>
  typeof value !== "number" || !Number.isFinite(value)
    ? "—"
    : `${percentageFormatter.format(value)}%`;
const formatRatioPercent = (value: number, total: number) =>
  total > 0 ? formatPercent((value / total) * 100) : "0%";
const formatPlaybackDuration = (seconds?: number | null) => {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${seconds}s`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return dateTimeFormatter.format(date);
};

const normalizeTargetType = (value: string): ContentDetailTargetType | null => {
  if (value === "post" || value === "comment" || value === "reply") return value;

  return null;
};

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

const contentTitle = (detail: AdminCommunityContentAnalyticsDetail) =>
  detail.content.title?.trim() ||
  detail.content.excerpt.trim() ||
  (detail.content.type === "post" ? "Post sem título" : "Resposta");

const videoAnalyticsCounters = (
  detail: AdminCommunityContentAnalyticsDetail,
  video: NonNullable<AdminCommunityContentAnalyticsDetail["video"]>,
) => [
  {
    icon: Eye,
    id: "views",
    label: "Visualizações",
    value: formatCount(detail.metrics.views_count),
  },
  {
    icon: Video,
    id: "plays",
    label: "Plays",
    caption: `${formatRatioPercent(video.metrics.plays_count, detail.metrics.views_count)} das visualizações`,
    value: formatCount(video.metrics.plays_count),
  },
  {
    icon: Timer,
    id: "total_watched_seconds",
    label: "Tempo total de reprodução",
    value: formatPlaybackDuration(video.metrics.total_watched_seconds),
  },
  {
    icon: Clock3,
    id: "average_watched_seconds",
    label: "Tempo médio de reprodução",
    caption:
      video.metrics.average_retention_percent === null
        ? "Sem retenção suficiente"
        : `${formatPercent(video.metrics.average_retention_percent)} do vídeo`,
    value: formatPlaybackDuration(video.metrics.average_watched_seconds),
  },
  {
    icon: CheckCircle2,
    id: "completion_rate",
    label: "Taxa que assistiu completo",
    value: formatPercent(video.metrics.completion_rate),
  },
  {
    icon: RotateCcw,
    id: "replay_rate_percent",
    label: "Taxa de replay",
    caption: `${formatCount(video.metrics.replay_count)} replays`,
    value: formatPercent(video.metrics.replay_rate_percent),
  },
];

const contentDetailMetricRowItems = (detail: AdminCommunityContentAnalyticsDetail) => [
  {
    icon: Eye,
    id: "views",
    label: "visualizações",
    value: detail.metrics.views_count,
  },
  {
    icon: ArrowUp,
    id: "upvotes",
    label: "upvotes",
    value: detail.metrics.upvotes_count,
  },
  {
    icon: ArrowDown,
    id: "downvotes",
    label: "downvotes",
    value: detail.metrics.downvotes_count,
  },
  {
    icon: MessageCircle,
    id: "comments",
    label: "comentários",
    value: detail.metrics.comments_count,
  },
  {
    icon: Bookmark,
    id: "saves",
    label: "salvos",
    value: detail.metrics.saves_count,
  },
  {
    icon: Share2,
    id: "shares",
    label: "compartilhamentos",
    value: detail.metrics.shares_count,
  },
  {
    icon: null,
    id: "whatsapp_clicks",
    label: "cliques WhatsApp",
    value: detail.metrics.whatsapp_clicks_count,
  },
  {
    icon: AlertTriangle,
    id: "reports",
    label: "denúncias",
    value: detail.metrics.reports_count,
  },
];

const ContentWhatsAppIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
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

const HeaderSection = ({
  detail,
  onDateChange,
  onDateControlsBlur,
  onPeriodChange,
  period,
  range,
  rangeError,
}: {
  detail: AdminCommunityContentAnalyticsDetail;
  onDateChange: (field: "from" | "to", value: string) => void;
  onDateControlsBlur: FocusEventHandler<HTMLDivElement>;
  onPeriodChange: (period: ContentDetailPeriodPreset) => void;
  period: ContentDetailPeriodValue;
  range: ContentDetailDateRange;
  rangeError: string | null;
}) => (
  <section className={cn(cardClass, "p-5")}>
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-black text-primary">
            {detail.content.content_kind_label}
          </span>
          <span className="max-w-full rounded-full bg-surface-muted px-3 py-1 text-xs font-black text-muted [overflow-wrap:anywhere]">
            {detail.community.name}
          </span>
        </div>
        <h1 className="mt-3 max-w-4xl text-2xl font-black leading-tight tracking-[-0.03em] text-foreground sm:text-3xl">
          Detalhes do vídeo
        </h1>
        <p className="mt-2 text-sm font-bold text-muted">
          Publicado em {formatDateTime(detail.content.created_at)}
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
        <label className="grid gap-1 text-xs font-black text-muted" htmlFor="content-detail-period">
          Período
          <span className="relative">
            <select
              className="h-11 min-w-[170px] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              id="content-detail-period"
              onChange={(event) => onPeriodChange(event.target.value as ContentDetailPeriodPreset)}
              value={period}
            >
              {period === "custom" ? (
                <option disabled hidden value="custom">
                  Personalizado
                </option>
              ) : null}
              {CONTENT_DETAIL_PERIOD_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
            />
          </span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2" onBlur={onDateControlsBlur}>
          <label className="text-xs font-black text-muted" htmlFor="content-detail-filter-from">
            De
            <input
              className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
              id="content-detail-filter-from"
              max={range.to || undefined}
              onChange={(event) => onDateChange("from", event.target.value)}
              type="date"
              value={range.from}
            />
          </label>
          <label className="text-xs font-black text-muted" htmlFor="content-detail-filter-to">
            Até
            <input
              className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
              id="content-detail-filter-to"
              min={range.from || undefined}
              onChange={(event) => onDateChange("to", event.target.value)}
              type="date"
              value={range.to}
            />
          </label>
        </div>
        {period === "custom" && rangeError ? (
          <p className="text-xs font-bold text-danger sm:max-w-48">{rangeError}</p>
        ) : null}
      </div>
    </div>
  </section>
);

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
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-[20px] border border-border bg-black xl:ml-0 xl:mr-auto">
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
          className="absolute left-1/2 top-1/2 inline-flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm transition hover:bg-white"
          onClick={togglePlayback}
          type="button"
        >
          <Play aria-hidden className="h-4 w-4 fill-current" />
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
      <div className="relative h-56 w-full overflow-hidden rounded-[20px] border border-border bg-surface-muted sm:h-64">
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

const ContentDetailMetricRow = ({ detail }: { detail: AdminCommunityContentAnalyticsDetail }) => (
  <div className="mt-5 border-t border-border pt-3">
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-muted">
      {contentDetailMetricRowItems(detail).map((metric) => {
        const Icon = metric.icon;

        return (
          <span className="inline-flex items-center gap-1.5" key={metric.id}>
            {Icon ? <Icon aria-hidden className="h-4 w-4" /> : <ContentWhatsAppIcon aria-hidden />}
            {formatCount(metric.value)} {metric.label}
          </span>
        );
      })}
    </div>
  </div>
);

const PreviewSection = ({ detail }: { detail: AdminCommunityContentAnalyticsDetail }) => {
  const publicHref = detail.content.public_url ? toPublicHref(detail.content.public_url) : null;

  return (
    <section className={cn(cardClass, "relative min-w-0 max-w-full p-5")}>
      {publicHref ? (
        <Link
          aria-label="Visualizar post no site público"
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-primary shadow-control transition hover:border-primary hover:bg-primary-soft"
          href={publicHref}
          rel="noreferrer"
          target="_blank"
          title="Visualizar post no site público"
        >
          <Eye aria-hidden className="h-5 w-5" />
        </Link>
      ) : null}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 pr-12 text-xs font-black text-muted">
          <FileText aria-hidden className="h-4 w-4" />
          <span>{detail.content.type === "post" ? "Post" : "Resposta/comentário"}</span>
          <span aria-hidden>·</span>
          <span>{detail.community.name}</span>
        </div>
        <div className="mt-4">
          <AuthorIdentity author={detail.author} />
        </div>
        <h2 className="mt-5 min-w-0 text-xl font-black leading-tight text-foreground [overflow-wrap:anywhere]">
          {contentTitle(detail)}
        </h2>
        <div className="mt-4 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,240px)_minmax(0,1fr)] xl:items-start">
          <div className="min-w-0 xl:justify-self-start">
            <ContentMediaPreview detail={detail} />
          </div>
          <div className="min-w-0">
            {detail.content.origin_preview ? (
              <div className="rounded-2xl border border-border bg-surface-muted p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">
                  {detail.content.origin_preview.label}
                </p>
                <p className="mt-2 text-sm font-black text-foreground [overflow-wrap:anywhere]">
                  {detail.content.origin_preview.title || "Sem título"}
                </p>
                <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted [overflow-wrap:anywhere]">
                  {detail.content.origin_preview.excerpt || "Sem trecho disponível."}
                </p>
              </div>
            ) : null}
            <p
              className={cn(
                "whitespace-pre-line text-sm leading-6 text-foreground [overflow-wrap:anywhere]",
                detail.content.origin_preview && "mt-5",
              )}
            >
              {detail.content.body || detail.content.excerpt || "Sem texto disponível."}
            </p>
          </div>
        </div>
        <ContentDetailMetricRow detail={detail} />
      </div>
    </section>
  );
};

type ContentVideoAnalytics = NonNullable<AdminCommunityContentAnalyticsDetail["video"]>;
type ContentVideoRetentionCurvePoint = ContentVideoAnalytics["retention"][number];

const CONTENT_RETENTION_CHART_WIDTH = 300;
const CONTENT_RETENTION_CHART_TOP = 12;
const CONTENT_RETENTION_CHART_BOTTOM = 116;
const CONTENT_RETENTION_CHART_AXIS_LABEL_Y = 144;
const CONTENT_RETENTION_CHART_LEFT_PADDING = 18;
const CONTENT_RETENTION_CHART_RIGHT_PADDING = 58;

const clampVideoPercent = (value: number) => Math.min(100, Math.max(0, value));

const formatVideoAxisTime = (positionPercent: number, durationSeconds?: number | null) => {
  if (!durationSeconds || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return positionPercent === 0 ? "0:00" : "Fim";
  }

  const clampedPosition = clampVideoPercent(positionPercent);
  const totalSeconds = Math.round((clampedPosition / 100) * durationSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const buildContentVideoRetentionAxisTicks = (durationSeconds?: number | null) => {
  if (!durationSeconds || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return [
      { id: "start", label: "0:00", positionPercent: 0 },
      { id: "end", label: "Fim", positionPercent: 100 },
    ];
  }

  const totalSeconds = Math.max(1, Math.round(durationSeconds));
  const tickCount = totalSeconds <= 60 ? 3 : totalSeconds <= 300 ? 4 : 5;

  return Array.from({ length: tickCount }, (_, index) => {
    const positionPercent = (index / (tickCount - 1)) * 100;

    return {
      id: String(index),
      label: formatVideoAxisTime(positionPercent, durationSeconds),
      positionPercent,
    };
  });
};

const toContentVideoRetentionChartPoint = (positionPercent: number, percentage: number) => {
  const x =
    CONTENT_RETENTION_CHART_LEFT_PADDING +
    (clampVideoPercent(positionPercent) / 100) *
      (CONTENT_RETENTION_CHART_WIDTH -
        CONTENT_RETENTION_CHART_LEFT_PADDING -
        CONTENT_RETENTION_CHART_RIGHT_PADDING);
  const y =
    CONTENT_RETENTION_CHART_TOP +
    ((100 - clampVideoPercent(percentage)) / 100) *
      (CONTENT_RETENTION_CHART_BOTTOM - CONTENT_RETENTION_CHART_TOP);

  return { x, y };
};

const buildContentVideoRetentionCurvePoints = (
  video: ContentVideoAnalytics,
): ContentVideoRetentionCurvePoint[] => {
  if (video.metrics.plays_count <= 0) {
    return [
      { label: "0%", percentage: 0, position_percent: 0 },
      { label: "100%", percentage: 0, position_percent: 100 },
    ];
  }

  const points = video.retention
    .map((point) => ({
      label: point.label,
      percentage: clampVideoPercent(point.percentage),
      position_percent: clampVideoPercent(point.position_percent),
    }))
    .sort((left, right) => left.position_percent - right.position_percent);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  if (!firstPoint || firstPoint.position_percent > 0) {
    points.unshift({ label: "0%", percentage: 100, position_percent: 0 });
  }

  if (!lastPoint || lastPoint.position_percent < 100) {
    points.push({
      label: "100%",
      percentage: clampVideoPercent(video.metrics.completion_rate),
      position_percent: 100,
    });
  }

  return points;
};

const buildSmoothContentVideoRetentionPath = (points: ContentVideoRetentionCurvePoint[]) => {
  if (points.length === 0) return "";

  const chartPoints = points.map((point) =>
    toContentVideoRetentionChartPoint(point.position_percent, point.percentage),
  );
  const firstPoint = chartPoints[0];
  if (!firstPoint) return "";
  let path = `M ${firstPoint.x.toFixed(2)} ${firstPoint.y.toFixed(2)}`;

  if (chartPoints.length === 1) return path;

  if (chartPoints.length === 2) {
    const lastPoint = chartPoints[1];
    if (!lastPoint) return path;

    const control1X = firstPoint.x + (lastPoint.x - firstPoint.x) * 0.42;
    const control2X = firstPoint.x + (lastPoint.x - firstPoint.x) * 0.78;

    return `${path} C ${control1X.toFixed(2)} ${firstPoint.y.toFixed(
      2,
    )}, ${control2X.toFixed(2)} ${lastPoint.y.toFixed(2)}, ${lastPoint.x.toFixed(
      2,
    )} ${lastPoint.y.toFixed(2)}`;
  }

  for (let index = 1; index < chartPoints.length - 1; index += 1) {
    const point = chartPoints[index];
    const nextPoint = chartPoints[index + 1];

    if (!point || !nextPoint) continue;

    const midX = (point.x + nextPoint.x) / 2;
    const midY = (point.y + nextPoint.y) / 2;

    path += ` Q ${point.x.toFixed(2)} ${point.y.toFixed(2)}, ${midX.toFixed(2)} ${midY.toFixed(2)}`;
  }

  const penultimatePoint = chartPoints[chartPoints.length - 2];
  const lastPoint = chartPoints[chartPoints.length - 1];

  if (penultimatePoint && lastPoint) {
    path += ` Q ${penultimatePoint.x.toFixed(2)} ${penultimatePoint.y.toFixed(
      2,
    )}, ${lastPoint.x.toFixed(2)} ${lastPoint.y.toFixed(2)}`;
  }

  return path;
};

const ContentVideoRetentionChart = ({ video }: { video: ContentVideoAnalytics }) => {
  const chartPoints = buildContentVideoRetentionCurvePoints(video);
  const smoothPath = buildSmoothContentVideoRetentionPath(chartPoints);
  const firstChartPoint = chartPoints[0] ?? { label: "0%", percentage: 0, position_percent: 0 };
  const lastChartPoint = chartPoints[chartPoints.length - 1] ?? {
    label: "100%",
    percentage: 0,
    position_percent: 100,
  };
  const firstAreaPoint = toContentVideoRetentionChartPoint(
    firstChartPoint.position_percent,
    firstChartPoint.percentage,
  );
  const lastAreaPoint = toContentVideoRetentionChartPoint(
    lastChartPoint.position_percent,
    lastChartPoint.percentage,
  );
  const areaPath = smoothPath
    ? `${smoothPath} L ${lastAreaPoint.x.toFixed(
        2,
      )} ${CONTENT_RETENTION_CHART_BOTTOM} L ${firstAreaPoint.x.toFixed(
        2,
      )} ${CONTENT_RETENTION_CHART_BOTTOM} Z`
    : "";
  const axisTicks = buildContentVideoRetentionAxisTicks(video.metrics.duration_seconds);

  return (
    <div className="grid min-w-0 gap-3">
      <div className="relative w-full overflow-hidden rounded-[22px] bg-transparent px-1 py-2 text-left">
        <svg
          aria-label="Curva de retenção real do vídeo do conteúdo"
          className="mx-auto h-[clamp(185px,24vw,245px)] w-full max-w-[620px] overflow-visible text-subtle"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox="0 0 300 150"
        >
          <title>Curva de retenção por trecho assistido do vídeo</title>
          <defs>
            <linearGradient id="content-video-retention-gradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="var(--admin-primary)" />
              <stop offset="100%" stopColor="var(--admin-primary-hover)" />
            </linearGradient>
            <linearGradient id="content-video-retention-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--admin-primary)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--admin-primary)" stopOpacity="0" />
            </linearGradient>
            <filter
              colorInterpolationFilters="sRGB"
              height="160%"
              id="content-video-retention-shadow"
              width="160%"
              x="-30%"
              y="-30%"
            >
              <feDropShadow
                dx="0"
                dy="2"
                floodColor="var(--admin-primary)"
                floodOpacity="0.14"
                stdDeviation="1.4"
              />
            </filter>
          </defs>
          <line
            stroke="currentColor"
            strokeDasharray="3 6"
            strokeOpacity="0.42"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
            x1={CONTENT_RETENTION_CHART_LEFT_PADDING}
            x2={CONTENT_RETENTION_CHART_WIDTH - CONTENT_RETENTION_CHART_RIGHT_PADDING + 4}
            y1="12"
            y2="12"
          />
          <line
            stroke="currentColor"
            strokeDasharray="3 6"
            strokeOpacity="0.42"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
            x1={CONTENT_RETENTION_CHART_LEFT_PADDING}
            x2={CONTENT_RETENTION_CHART_WIDTH - CONTENT_RETENTION_CHART_RIGHT_PADDING + 4}
            y1="64"
            y2="64"
          />
          {areaPath ? <path d={areaPath} fill="url(#content-video-retention-fill)" /> : null}
          {smoothPath ? (
            <path
              d={smoothPath}
              fill="none"
              filter="url(#content-video-retention-shadow)"
              stroke="url(#content-video-retention-gradient)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.4"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          <line
            className="stroke-border"
            strokeLinecap="round"
            strokeWidth="3.4"
            vectorEffect="non-scaling-stroke"
            x1={CONTENT_RETENTION_CHART_LEFT_PADDING}
            x2={CONTENT_RETENTION_CHART_WIDTH - CONTENT_RETENTION_CHART_RIGHT_PADDING + 4}
            y1="122"
            y2="122"
          />
          <line
            stroke="var(--admin-primary)"
            strokeLinecap="round"
            strokeWidth="3.4"
            vectorEffect="non-scaling-stroke"
            x1={CONTENT_RETENTION_CHART_LEFT_PADDING}
            x2={CONTENT_RETENTION_CHART_LEFT_PADDING}
            y1="122"
            y2="122"
          />
          <circle
            className="fill-surface stroke-border"
            cx={CONTENT_RETENTION_CHART_LEFT_PADDING}
            cy="122"
            r="6.5"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          {axisTicks.map((tick) => {
            const tickPoint = toContentVideoRetentionChartPoint(tick.positionPercent, 0);

            return (
              <g key={tick.id}>
                <line
                  className="stroke-border"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  x1={tickPoint.x}
                  x2={tickPoint.x}
                  y1="122"
                  y2="128"
                />
                <text
                  className="fill-subtle text-[8px] font-black"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  x={tickPoint.x}
                  y={CONTENT_RETENTION_CHART_AXIS_LABEL_Y}
                >
                  {tick.label}
                </text>
              </g>
            );
          })}
        </svg>
        <span className="pointer-events-none absolute right-5 top-4 rounded-full bg-surface/95 px-1.5 py-0.5 text-[0.65rem] font-extrabold leading-none text-subtle shadow-sm">
          100%
        </span>
        <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 rounded-full bg-surface/95 px-1.5 py-0.5 text-[0.65rem] font-extrabold leading-none text-subtle shadow-sm">
          50%
        </span>
      </div>

      {video.retention_dropoff ? (
        <div className="rounded-2xl border border-border/70 bg-surface px-3 py-3 text-left text-xs leading-5 text-muted">
          <span className="block font-black text-foreground">Maior queda</span>
          <span>
            {video.retention_dropoff.from_label} → {video.retention_dropoff.to_label} (
            {formatPercent(video.retention_dropoff.rate_drop)} de queda).
          </span>
        </div>
      ) : null}
    </div>
  );
};

const VideoAnalyticsSection = ({ detail }: { detail: AdminCommunityContentAnalyticsDetail }) => {
  const video = detail.video;
  if (!video) return null;

  return (
    <section
      className={cn(cardClass, "p-5")}
      aria-labelledby="content-detail-video-analytics-title"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            className="text-xl font-black text-foreground"
            id="content-detail-video-analytics-title"
          >
            Análises do vídeo
          </h2>
          <p className="mt-1 text-sm font-bold text-muted">
            Retenção e interações atribuídas ao conteúdo no período selecionado.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-stretch">
        <div className="min-w-0 rounded-[1.5rem] border border-border/70 bg-surface-muted/40 p-3 sm:p-4">
          {!video.available ? (
            <p className="rounded-2xl border border-border/70 bg-surface px-4 py-5 text-sm font-bold leading-6 text-muted">
              {video.unavailable_reason ||
                "Retenção indisponível - a coleta começa a partir dos próximos acessos ao vídeo."}
            </p>
          ) : (
            <ContentVideoRetentionChart video={video} />
          )}
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {videoAnalyticsCounters(detail, video).map((metric) => (
            <article
              className="min-w-0 rounded-2xl border border-border/70 bg-surface-muted/40 p-4"
              key={metric.id}
            >
              <span className="grid h-10 w-10 place-items-center rounded-[16px] bg-primary-soft text-primary">
                <metric.icon aria-hidden className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.14em] text-muted">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-black text-foreground">{metric.value}</p>
              {"caption" in metric && metric.caption ? (
                <p className="mt-1 text-xs font-bold leading-5 text-muted">{metric.caption}</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
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
                <p className="mt-2 text-sm font-bold text-foreground [overflow-wrap:anywhere]">
                  {report.reported_by.label}
                </p>
                {report.description ? (
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted [overflow-wrap:anywhere]">
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
                <p className="mt-2 text-sm font-black text-foreground [overflow-wrap:anywhere]">
                  {event.reason_code}
                </p>
                <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted [overflow-wrap:anywhere]">
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
  const [selectedPeriod, setSelectedPeriod] = useState<ContentDetailPeriodValue>("all");
  const {
    appliedRange,
    applyRange,
    draftRange,
    handleDateChange: handleDraftDateChange,
    handleDateControlsBlur,
    rangeError,
  } = useDateRangeCommitOnBlur<ContentDetailDateRange>({
    initialRange: () => getContentDetailRangeForPeriod("all"),
    isValidRange: (range) => selectedPeriod !== "custom" || isValidCustomDateRange(range),
  });
  const validRange = selectedPeriod !== "custom" || isValidCustomDateRange(appliedRange);
  const queryInput = useMemo<AdminCommunityContentDetailQuery>(
    () => buildContentDetailPeriodQuery(selectedPeriod, appliedRange),
    [appliedRange, selectedPeriod],
  );
  const handlePeriodChange = (nextPeriod: ContentDetailPeriodPreset) => {
    setSelectedPeriod(nextPeriod);
    applyRange(getContentDetailRangeForPeriod(nextPeriod));
  };
  const handleDateChange = (field: "from" | "to", value: string) => {
    setSelectedPeriod("custom");
    handleDraftDateChange(field, value);
  };
  const detailQuery = useAdminCommunityContentDetail(
    slug,
    normalizedType ?? "post",
    contentId,
    queryInput,
    {
      enabled: Boolean(normalizedType && validRange),
    },
  );
  const detail = detailQuery.data;

  if (!normalizedType) {
    return (
      <main className="mx-auto min-w-0 w-full max-w-7xl overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
        <div className={cn(cardClass, "p-5")}>
          <AlertTriangle className="h-6 w-6 text-danger" aria-hidden />
          <h1 className="mt-3 text-xl font-black text-foreground">Tipo de conteúdo inválido</h1>
          <p className="mt-2 text-sm text-muted">Use post, comment ou reply na rota.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-w-0 w-full max-w-7xl gap-5 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
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
          <HeaderSection
            detail={detail}
            onDateChange={handleDateChange}
            onDateControlsBlur={handleDateControlsBlur}
            onPeriodChange={handlePeriodChange}
            period={selectedPeriod}
            range={draftRange}
            rangeError={rangeError}
          />
          <PreviewSection detail={detail} />
          <VideoAnalyticsSection detail={detail} />
          <ModerationSection detail={detail} />
          <RemovalSection
            detail={detail}
            onRemoved={() => void detailQuery.refetch()}
            slug={slug}
          />
        </>
      ) : null}
    </main>
  );
};
