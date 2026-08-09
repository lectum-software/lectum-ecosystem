"use client";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Eye,
  FileText,
  type LucideIcon,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAdminPatientReports } from "@/api/callers/patients";
import { resolveApiError } from "@/api/handle";
import type { AdminPatientReportItem, AdminPatientReportsQuery } from "@/api/req/patients";
import { renderableImageSrc, resolveAdminMediaUrl } from "@/lib/admin-media";
import { toPublicFrontendHref } from "@/lib/public-frontend-url";
import { cn } from "@/lib/utils";
import { numberFormatter } from "../modules/detail-config";
import {
  formatDateTime,
  isPublicAdminMediaSrc,
  startOfCurrentMonth,
  startOfCurrentWeek,
  startOfCurrentYear,
  toDateInputValue,
} from "../modules/detail-support";
import { ActivitiesPagination, DetailFilterSelect } from "./activities";
import { Badge, CardShell, ErrorState, IconCircle } from "./common";

export const reportCardIcon: Record<"dismissed" | "pending" | "total" | "upheld", LucideIcon> = {
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

export const reportDateFromInput = (value: string) => {
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
      ? "bg-danger-soft text-danger"
      : group === "dismissed"
        ? "bg-success-soft text-success"
        : group === "pending"
          ? "bg-warning-soft text-warning"
          : "bg-warning-soft text-warning";

  return <Badge className={className}>{label}</Badge>;
};

export const patientReportTitle = (report: AdminPatientReportItem) => {
  if (report.content.type === "post") return report.content.title?.trim() || "Post sem título";

  const title = report.content.title?.trim();
  const normalizedTitle = title?.toLowerCase();

  return normalizedTitle && !["comentário", "comentario"].includes(normalizedTitle) ? title : null;
};

export const patientReportContentTypeLabel = (report: AdminPatientReportItem) => {
  if (report.content.type === "post") return "Post";

  const title = report.content.title?.trim().toLowerCase();
  return title && !["comentário", "comentario"].includes(title) ? "Resposta" : "Comentário";
};

export const PatientReportContentHeader = ({ report }: { report: AdminPatientReportItem }) => {
  const TypeIcon = report.content.type === "post" ? FileText : MessageCircle;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
      <TypeIcon aria-hidden className="h-4 w-4 shrink-0" />
      <span className="font-black">{patientReportContentTypeLabel(report)}</span>
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

export const PatientReportMedia = ({ report }: { report: AdminPatientReportItem }) => {
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
      {videoSrc ? (
        <video
          aria-label={mediaLabel}
          className="h-full w-full bg-media-background object-cover"
          controls
          muted
          playsInline
          preload="metadata"
          src={videoSrc}
        />
      ) : null}
      {!imageSrc && !videoSrc ? (
        <div className="grid h-full place-items-center gap-1 p-3 text-center text-xs font-black text-muted">
          <FileText aria-hidden className="mx-auto h-5 w-5" />
          <span>Mídia denunciada</span>
        </div>
      ) : null}
    </div>
  );
};

export const PatientReportReporterHistory = ({ report }: { report: AdminPatientReportItem }) => (
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

export const PatientReportListItem = ({ report }: { report: AdminPatientReportItem }) => {
  const title = patientReportTitle(report);

  return (
    <article className="rounded-card border border-border/75 bg-surface/95 p-4 shadow-admin-soft md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ReportStatusBadge group={report.status_group} label={report.status_label} />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-black text-primary">
            <AlertTriangle aria-hidden className="h-3.5 w-3.5" />1 denúncia
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted">
            <CalendarDays aria-hidden className="h-3.5 w-3.5" />
            Última em {formatDateTime(report.created_at)}
          </span>
        </div>
        {report.content.available && report.content.public_url ? (
          <Link
            aria-label="Ver conteúdo público"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground/75 transition hover:text-foreground"
            href={toPublicFrontendHref(report.content.public_url)}
            rel="noreferrer"
            target="_blank"
            title="Ver conteúdo público"
          >
            <Eye aria-hidden className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
      <section className="mt-4">
        <p className="text-[0.68rem] font-black uppercase tracking-wide text-muted">
          Conteúdo denunciado
        </p>
        <PatientReportContentHeader report={report} />
        {title ? <h3 className="mt-3 text-lg font-bold text-foreground">{title}</h3> : null}
        <div className="mt-3 space-y-4">
          <div className="min-w-0 whitespace-pre-wrap text-sm leading-6 text-muted">
            {report.content.body || report.content.excerpt || "Conteúdo sem texto disponível."}
          </div>
          {report.content.media ? (
            <div className="max-w-72">
              <PatientReportMedia report={report} />
            </div>
          ) : null}
        </div>
        {!report.content.available ? (
          <p className="mt-3 rounded-2xl border border-danger/15 bg-danger/10 p-3 text-xs font-bold leading-5 text-danger">
            {report.content.unavailable_reason || "Conteúdo removido ou indisponível."}
          </p>
        ) : null}
      </section>
      <PatientReportReporterHistory report={report} />
    </article>
  );
};

export const ReportsLoadingState = () => (
  <div className="space-y-5" data-patient-reports-loading="true">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {["total", "pending", "dismissed", "upheld"].map((card) => (
        <CardShell className="h-[8.75rem] animate-pulse bg-surface-muted" key={card} />
      ))}
    </div>
    <CardShell className="h-[8.25rem] animate-pulse bg-surface-muted" />
    <div className="space-y-4">
      {["first", "second"].map((item) => (
        <CardShell className="h-60 animate-pulse bg-surface-muted" key={item} />
      ))}
    </div>
  </div>
);

export const ReportsTab = ({ id }: { id: string }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriodValue>("all");
  const [appliedRange, setAppliedRange] = useState<ReportDateRange>(() =>
    getReportRangeForPeriod("all"),
  );
  const [draftRange, setDraftRange] = useState<ReportDateRange>(() =>
    getReportRangeForPeriod("all"),
  );
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [type, setType] = useState<AdminPatientReportsQuery["type"]>("all");
  const [status, setStatus] = useState<AdminPatientReportsQuery["status"]>("all");
  const [page, setPage] = useState(1);
  const queryInput = useMemo<AdminPatientReportsQuery>(
    () => ({
      ...appliedRange,
      limit: 5,
      page,
      status,
      type,
    }),
    [appliedRange, page, status, type],
  );
  const query = useAdminPatientReports(id, queryInput);
  const errorMessage = query.error ? resolveApiError(query.error) : null;
  const handleReportPeriodChange = (value: ReportPeriodPreset) => {
    const nextRange = getReportRangeForPeriod(value);

    setRangeError(null);
    setSelectedPeriod(value);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
    setPage(1);
  };
  const handleReportDateChange = (field: keyof ReportDateRange, value: string) => {
    setRangeError(null);
    setSelectedPeriod("custom");
    setDraftRange((current) => ({
      ...current,
      [field]: value,
    }));
  };
  const commitReportRange = () => {
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
  const handleReportDateControlsBlur = (event: {
    currentTarget: HTMLDivElement;
    relatedTarget: EventTarget | null;
  }) => {
    const currentTarget = event.currentTarget;
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (nextFocusedElement && currentTarget.contains(nextFocusedElement)) return;

    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (activeElement && currentTarget.contains(activeElement)) return;

      commitReportRange();
    }, 0);
  };

  if (query.isLoading) return <ReportsLoadingState />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const reports = query.data;

  return (
    <div className="space-y-5" data-patient-detail-tab="denuncias">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reports.cards.map((card) => {
          const Icon = reportCardIcon[card.id] ?? AlertTriangle;

          return (
            <CardShell className="p-5" key={card.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-foreground">{card.label}</p>
                  <p className="mt-5 text-4xl font-black text-foreground">
                    {numberFormatter.format(card.value)}
                  </p>
                </div>
                <IconCircle icon={Icon} />
              </div>
            </CardShell>
          );
        })}
      </div>

      <CardShell className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_2fr] lg:items-end">
          <DetailFilterSelect
            label="Tipo"
            onChange={(nextValue) => {
              setType(nextValue as AdminPatientReportsQuery["type"]);
              setPage(1);
            }}
            value={type ?? "all"}
          >
            {reports.filters.types.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({numberFormatter.format(option.count)})
              </option>
            ))}
          </DetailFilterSelect>
          <DetailFilterSelect
            label="Status"
            onChange={(nextValue) => {
              setStatus(nextValue as AdminPatientReportsQuery["status"]);
              setPage(1);
            }}
            value={status ?? "all"}
          >
            {reports.filters.statuses.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({numberFormatter.format(option.count)})
              </option>
            ))}
          </DetailFilterSelect>
          <DetailFilterSelect
            label="Período"
            onChange={(nextValue) => {
              handleReportPeriodChange(nextValue as ReportPeriodPreset);
            }}
            value={selectedPeriod}
          >
            {selectedPeriod === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            {REPORT_PERIOD_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </DetailFilterSelect>
          <div className="grid gap-3 sm:grid-cols-2" onBlur={handleReportDateControlsBlur}>
            <label className="block text-sm font-black text-muted">
              De
              <input
                className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
                max={draftRange.to || undefined}
                onChange={(event) => handleReportDateChange("from", event.target.value)}
                type="date"
                value={draftRange.from ?? ""}
              />
            </label>
            <label className="block text-sm font-black text-muted">
              Até
              <input
                className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
                min={draftRange.from || undefined}
                onChange={(event) => handleReportDateChange("to", event.target.value)}
                type="date"
                value={draftRange.to ?? ""}
              />
            </label>
          </div>
        </div>
        {rangeError ? <p className="mt-3 text-xs font-bold text-danger">{rangeError}</p> : null}
      </CardShell>

      <section className="space-y-4" aria-label="Denúncias recebidas">
        {reports.data.length === 0 ? (
          <CardShell className="p-5">
            <p className="text-sm font-bold text-muted">
              Nenhuma denúncia encontrada para os filtros atuais.
            </p>
          </CardShell>
        ) : (
          reports.data.map((item) => <PatientReportListItem key={item.id} report={item} />)
        )}

        <CardShell className="p-4">
          <ActivitiesPagination page={reports.page} pages={reports.pages} setPage={setPage} />
        </CardShell>
      </section>
    </div>
  );
};
