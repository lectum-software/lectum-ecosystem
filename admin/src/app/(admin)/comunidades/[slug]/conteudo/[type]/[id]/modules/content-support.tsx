import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bookmark,
  CheckCircle2,
  Clock3,
  Eye,
  MessageCircle,
  Play,
  RotateCcw,
  Share2,
  Timer,
} from "lucide-react";
import { z } from "zod";
import type { AdminCommunityContentAnalyticsDetail } from "@/api/req/communities";
import { cn } from "@/lib/utils";

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

export const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export const cardClass =
  "min-w-0 max-w-full rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";

export const pageClass = "min-w-0 max-w-full space-y-7 overflow-x-clip";

export type ContentDetailTargetType = "comment" | "post" | "reply";

export const CONTENT_DETAIL_QUERY = { period: "all" } as const;

export const removalFormSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .refine(
      (value) => value.toUpperCase() === "REMOVER CONTEUDO",
      "Digite REMOVER CONTEUDO para confirmar.",
    ),
  reason: z.string().trim().min(3, "Informe o motivo.").max(500, "Use até 500 caracteres."),
});

export type RemovalFormValues = z.infer<typeof removalFormSchema>;

export const formatCount = (value: number) => numberFormatter.format(value);

export const formatPercent = (value?: number | null) =>
  typeof value !== "number" || !Number.isFinite(value)
    ? "—"
    : `${percentageFormatter.format(value)}%`;

export const formatRatioPercent = (value: number, total: number) =>
  total > 0 ? formatPercent((value / total) * 100) : "0%";

export const formatPlaybackDuration = (seconds?: number | null) => {
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

export const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return dateTimeFormatter.format(date);
};

export type ContentPublicationStatus = AdminCommunityContentAnalyticsDetail["content"]["status"];

export const contentStatusCopy: Record<
  ContentPublicationStatus,
  { className: string; createdAtLabel: string; label: string }
> = {
  blocked: {
    className: "border-danger/20 bg-danger/10 text-danger",
    createdAtLabel: "Bloqueado automaticamente em",
    label: "Bloqueado automaticamente",
  },
  published: {
    className: "border-primary/20 bg-primary-soft text-primary",
    createdAtLabel: "Publicado em",
    label: "Publicado",
  },
  removed: {
    className: "border-border bg-surface-muted text-muted",
    createdAtLabel: "Criado em",
    label: "Removido",
  },
};

export const getContentStatusCopy = (status?: string | null) =>
  contentStatusCopy[status as ContentPublicationStatus] ?? {
    className: "border-border bg-surface-muted text-muted",
    createdAtLabel: "Criado em",
    label: "Status não classificado",
  };

export const ContentStatusBadge = ({ status }: { status: ContentPublicationStatus }) => {
  const copy = getContentStatusCopy(status);

  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-black",
        copy.className,
      )}
    >
      {copy.label}
    </span>
  );
};

export const normalizeTargetType = (value: string): ContentDetailTargetType | null => {
  if (value === "post" || value === "comment" || value === "reply") return value;

  return null;
};

export const initials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AU";

export const contentTitle = (detail: AdminCommunityContentAnalyticsDetail) =>
  detail.content.title?.trim() ||
  detail.content.excerpt.trim() ||
  (detail.content.type === "post"
    ? "Post sem título"
    : detail.author.role === "psicologo"
      ? "Resposta"
      : "Comentário");

export const contentTypeLabel = (detail: AdminCommunityContentAnalyticsDetail) => {
  if (detail.content.type === "post") return "Post";

  return detail.author.role === "psicologo" ? "Resposta" : "Comentário";
};

export const videoAnalyticsCounters = (
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
    icon: Play,
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
    label: "Assistiu ao vídeo completo",
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

export const contentDetailMetricRowItems = (detail: AdminCommunityContentAnalyticsDetail) => [
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

export const contentCommentBreakdownItems = (detail: AdminCommunityContentAnalyticsDetail) => {
  const breakdown = detail.metrics.comment_breakdown;
  const total = breakdown.total_count;

  return [
    {
      id: "total_comments",
      label: "Total de comentários",
      value: total,
    },
    {
      rate: formatRatioPercent(breakdown.verified_psychologist_replies_count, total),
      id: "verified_psychologist_replies",
      label: "Respostas de psicólogos verificados",
      value: breakdown.verified_psychologist_replies_count,
    },
    {
      rate: formatRatioPercent(breakdown.unverified_psychologist_replies_count, total),
      id: "unverified_psychologist_replies",
      label: "Respostas de psicólogos não verificados",
      value: breakdown.unverified_psychologist_replies_count,
    },
    {
      id: "patient_comments",
      label: "Comentários de pacientes",
      rate: formatRatioPercent(breakdown.patient_comments_count, total),
      value: breakdown.patient_comments_count,
    },
  ];
};
