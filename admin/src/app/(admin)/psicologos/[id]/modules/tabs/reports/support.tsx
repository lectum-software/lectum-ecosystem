"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileText,
  Info,
  type LucideIcon,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import type { AdminPsychologistReportItem } from "@/api/req/psychologists";
import { renderableImageSrc, resolveAdminMediaUrl } from "@/lib/admin-media";
import { cn } from "@/lib/utils";
import { Badge } from "../../components/shared";
import {
  startOfCurrentMonth,
  startOfCurrentWeek,
  startOfCurrentYear,
  toDateInputValue,
} from "../../support/date-period";
import { formatDateTime } from "../../support/formatters";
import { isPublicAdminMediaSrc } from "../../support/media";
import { PublicationVideoMiniplayer } from "../publications/media";

export const reportCardIcon: Record<
  "all" | "dismissed" | "pending" | "total" | "upheld",
  LucideIcon
> = {
  all: Info,
  dismissed: CheckCircle2,
  pending: AlertTriangle,
  total: AlertTriangle,
  upheld: ShieldCheck,
};

export type ReportPeriodValue =
  | "today"
  | "week"
  | "month"
  | "year"
  | "7d"
  | "30d"
  | "90d"
  | "180d"
  | "all"
  | "custom";

export type ReportPeriodPreset = Exclude<ReportPeriodValue, "custom">;

export type ReportDateRange = {
  from?: string;
  to?: string;
};

export const REPORT_PERIOD_OPTIONS: { id: ReportPeriodPreset; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "180d", label: "Últimos 180 dias" },
  { id: "all", label: "Todo o período" },
];

export const getReportRangeForPeriod = (preset: ReportPeriodPreset): ReportDateRange => {
  const today = toDateInputValue(new Date());

  if (preset === "all") return { from: "", to: "" };
  if (preset === "today") return { from: today, to: today };
  if (preset === "week") return { from: toDateInputValue(startOfCurrentWeek()), to: today };
  if (preset === "month") return { from: toDateInputValue(startOfCurrentMonth()), to: today };
  if (preset === "year") return { from: toDateInputValue(startOfCurrentYear()), to: today };

  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : preset === "180d" ? 180 : 90;
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - (days - 1));

  return {
    from: toDateInputValue(from),
    to: today,
  };
};

const reportDateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export const isValidReportRange = (range: ReportDateRange) => {
  if (!range.from || !range.to) return false;

  return reportDateFromInput(range.from) <= reportDateFromInput(range.to);
};

export const ReportStatusBadge = ({ group, label }: { group: string; label: string }) => {
  const className =
    group === "upheld"
      ? "bg-red-50 text-danger"
      : group === "dismissed"
        ? "bg-emerald-50 text-success"
        : group === "pending"
          ? "bg-yellow-50 text-yellow-700"
          : "bg-orange-50 text-orange-700";

  return <Badge className={className}>{label}</Badge>;
};

type ReportResolutionValue = "dismissed" | "pending" | "upheld";

export const reportReviewResolutionOptions: { label: string; value: ReportResolutionValue }[] = [
  { label: "Pendente", value: "pending" },
  { label: "Improcedente", value: "dismissed" },
  { label: "Procedente", value: "upheld" },
];

export const reportReviewResolutionLabel = (resolution: ReportResolutionValue) =>
  reportReviewResolutionOptions.find((option) => option.value === resolution)?.label ?? "Pendente";

type ReportModerationAction = "dismiss" | "review" | "uphold";

export type ReportModerationState = {
  action: ReportModerationAction;
  report: AdminPsychologistReportItem;
} | null;

export const psychologistReportTitle = (report: AdminPsychologistReportItem) => {
  if (report.content.type === "post") return report.content.title?.trim() || "Post sem título";

  const title = report.content.title?.trim();
  const normalizedTitle = title?.toLowerCase();

  return normalizedTitle && !["comentário", "comentario"].includes(normalizedTitle) ? title : null;
};

const psychologistReportContentTypeLabel = (report: AdminPsychologistReportItem) => {
  if (report.content.type === "post") return "Post";

  const title = report.content.title?.trim().toLowerCase();
  return title && !["comentário", "comentario"].includes(title) ? "Resposta" : "Comentário";
};

export const PsychologistReportContentHeader = ({
  report,
}: {
  report: AdminPsychologistReportItem;
}) => {
  const TypeIcon = report.content.type === "post" ? FileText : MessageCircle;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
      <TypeIcon aria-hidden className="h-4 w-4 shrink-0" />
      <span className="font-black">{psychologistReportContentTypeLabel(report)}</span>
      <span aria-hidden className="font-bold">
        ·
      </span>
      <span className="font-black">{report.content.community.name}</span>
      <span aria-hidden className="font-bold">
        ·
      </span>
      <span className="font-bold">{formatDateTime(report.content.created_at)}</span>
    </div>
  );
};

export const PsychologistReportMedia = ({ report }: { report: AdminPsychologistReportItem }) => {
  if (!report.content.media) return null;

  const src = report.content.media.media_url;
  const mediaType = report.content.media.media_type.toLowerCase();
  const isVideo = mediaType.startsWith("video") || /\.(mp4|webm|mov|m4v)$/i.test(src);
  const looksLikeImage = mediaType.startsWith("image") || /\.(png|jpe?g|webp|gif)$/i.test(src);
  const imageSrc = !isVideo ? renderableImageSrc(src) : null;
  const videoSrc = isVideo ? resolveAdminMediaUrl(src) : null;
  const mediaLabel = isVideo ? "Miniplayer de vídeo denunciado" : "Miniatura de mídia denunciada";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border bg-surface-muted",
        isVideo ? "aspect-[9/16] max-w-40" : "h-32 max-w-72",
      )}
    >
      {imageSrc && looksLikeImage ? (
        <Image
          alt={mediaLabel}
          className="object-cover"
          fill
          sizes="288px"
          src={imageSrc}
          unoptimized={isPublicAdminMediaSrc(imageSrc)}
        />
      ) : null}
      {videoSrc ? <PublicationVideoMiniplayer label={mediaLabel} src={videoSrc} /> : null}
      {!imageSrc && !videoSrc ? (
        <div className="grid h-full place-items-center gap-1 p-3 text-center text-xs font-black text-muted">
          <FileText aria-hidden className="mx-auto h-5 w-5" />
          <span>Mídia denunciada</span>
        </div>
      ) : null}
    </div>
  );
};

export const PsychologistReportReporterHistory = ({
  report,
}: {
  report: AdminPsychologistReportItem;
}) => (
  <section className="mt-5 border-t border-border/70 pt-4">
    <h4 className="text-sm font-bold text-foreground">Histórico de denúncias</h4>
    <div className="mt-3 divide-y divide-border/70">
      <article
        className="py-2 text-sm"
        title={`${report.reported_by.name} · ${formatDateTime(report.created_at)} · Motivo: ${
          report.reason_label
        }${report.description ? ` · ${report.description}` : ""}`}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge className="bg-surface-muted text-muted">{report.reported_by.label}</Badge>
          <span className="shrink-0 font-normal text-foreground">{report.reported_by.name}</span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-muted">
            <CalendarDays aria-hidden className="h-3.5 w-3.5" />
            {formatDateTime(report.created_at)}
          </span>
          <span aria-hidden className="shrink-0 text-muted/70">
            ·
          </span>
          <span className="min-w-0 truncate font-bold text-foreground">
            Motivo: {report.reason_label}
          </span>
        </div>
        {report.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">{report.description}</p>
        ) : null}
      </article>
    </div>
  </section>
);

export const PsychologistReportActions = ({
  onResolve,
  report,
}: {
  onResolve: (action: ReportModerationAction) => void;
  report: AdminPsychologistReportItem;
}) => {
  const hasResolutionActions =
    report.capabilities.can_resolve_dismissed || report.capabilities.can_resolve_upheld;

  if (!hasResolutionActions) {
    return (
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-4">
        <span className="text-xs font-bold text-muted">Denúncia já encerrada:</span>
        <ReportStatusBadge group={report.status_group} label={report.status_label} />
        {report.capabilities.can_review_resolution ? (
          <button
            className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full border border-border/60 bg-transparent px-3 py-1 text-xs font-semibold text-muted transition hover:border-primary/25 hover:bg-primary-soft/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            onClick={() => onResolve("review")}
            type="button"
          >
            <RefreshCw aria-hidden className="h-3 w-3" />
            Revisar decisão
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border/70 pt-4">
      {report.capabilities.can_resolve_dismissed ? (
        <button
          className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full border border-success/20 bg-transparent px-3 py-1 text-xs font-semibold text-success transition hover:border-success/35 hover:bg-success/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/15"
          onClick={() => onResolve("dismiss")}
          type="button"
        >
          <CheckCircle2 aria-hidden className="h-3 w-3" />
          Improcedente
        </button>
      ) : null}
      {report.capabilities.can_resolve_upheld ? (
        <button
          className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full border border-danger/20 bg-transparent px-3 py-1 text-xs font-semibold text-danger transition hover:border-danger/35 hover:bg-danger/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/15"
          onClick={() => onResolve("uphold")}
          type="button"
        >
          <ShieldCheck aria-hidden className="h-3 w-3" />
          Procedente
        </button>
      ) : null}
    </div>
  );
};
