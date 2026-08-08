"use client";
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  MessageCircle,
  Play,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode, SVGProps } from "react";
import type {
  AdminModerationOperationalAlert,
  AdminModerationSeverity,
} from "@/api/req/moderation";
import { renderableImageSrc, resolveAdminMediaUrl } from "@/lib/admin-media";
import { cn } from "@/lib/utils";

import {
  formatDateTime,
  isPublicAdminMediaSrc,
  numberFormatter,
  operationalGroupCopy,
  severityCopy,
} from "../modules/report-support";

export const Pill = ({ className, children }: { children: ReactNode; className?: string }) => (
  <span
    className={["inline-flex rounded-full px-2.5 py-1 text-xs font-black", className].join(" ")}
  >
    {children}
  </span>
);

export const OperationalGroup = ({
  value,
}: {
  value: AdminModerationOperationalAlert["group"];
}) => (
  <Pill className={operationalGroupCopy[value].className}>{operationalGroupCopy[value].label}</Pill>
);

export const Severity = ({ value }: { value: AdminModerationSeverity }) => (
  <Pill className={severityCopy[value].className}>{severityCopy[value].label}</Pill>
);

export const HeaderPendingCount = ({
  count,
  loading,
}: {
  count?: number | null;
  loading?: boolean;
}) => {
  const hasCount = typeof count === "number";

  return (
    <div aria-live="polite" className="min-w-[9rem] px-4 py-2 text-center">
      <p className="inline-flex items-center justify-center gap-1.5 text-3xl font-black tracking-tight text-foreground">
        {hasCount ? numberFormatter.format(count) : "—"}
        {loading ? (
          <Loader2
            aria-label="Atualizando pendências"
            className="h-4 w-4 animate-spin text-muted"
          />
        ) : null}
      </p>
      <p className="text-xs font-bold text-muted">
        {hasCount && count === 1 ? "pendência" : "pendências"}
      </p>
    </div>
  );
};

export const alertFactValue = (alert: AdminModerationOperationalAlert, label: string) =>
  alert.facts.find(
    (fact) => fact.label.toLocaleLowerCase("pt-BR") === label.toLocaleLowerCase("pt-BR"),
  )?.value ?? "";

export const resolveComplianceProfileStatus = (alert: AdminModerationOperationalAlert) => {
  const published = alertFactValue(alert, "Publicado").trim().toLocaleLowerCase("pt-BR");

  if (["sim", "ativo", "publicado", "true"].includes(published)) {
    return {
      className: "bg-success/10 text-success",
      label: "Ativo",
    };
  }

  if (["não", "nao", "inativo", "despublicado", "false"].includes(published)) {
    return {
      className: "bg-danger/10 text-danger",
      label: "Inativo",
    };
  }

  return {
    className: "bg-surface-muted text-muted",
    label: "—",
  };
};

export type ModerationReport = NonNullable<AdminModerationOperationalAlert["report"]>;

export const reportStatusBadgeClass: Record<ModerationReport["status_group"], string> = {
  dismissed: "bg-success-soft text-success",
  pending: "bg-warning-soft text-warning",
  upheld: "bg-danger-soft text-danger",
};

export const ReportStatusBadge = ({ report }: { report: ModerationReport }) => (
  <Pill className={reportStatusBadgeClass[report.status_group]}>{report.status_label}</Pill>
);

export const moderationReportTitle = (report: ModerationReport) => {
  if (report.content.type === "post") return report.content.title?.trim() || "Post sem título";

  const title = report.content.title?.trim();
  const normalizedTitle = title?.toLowerCase();

  return normalizedTitle && !["comentário", "comentario"].includes(normalizedTitle) ? title : null;
};

export const moderationReportContentTypeLabel = (report: ModerationReport) => {
  if (report.content.type === "post") return "Post";

  const title = report.content.title?.trim().toLowerCase();

  return title && !["comentário", "comentario"].includes(title) ? "Resposta" : "Comentário";
};

export const ModerationReportContentHeader = ({ report }: { report: ModerationReport }) => {
  const TypeIcon = report.content.type === "post" ? FileText : MessageCircle;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
      <TypeIcon aria-hidden className="h-4 w-4 shrink-0" />
      <span className="font-black">{moderationReportContentTypeLabel(report)}</span>
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

export const authorInitials = (name: string) => {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (parts[0]?.[0] ?? "A") + (parts[1]?.[0] ?? "");
};

export const VerifiedBadgeIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
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

export const ModerationReportAuthor = ({ report }: { report: ModerationReport }) => {
  const avatarSrc = renderableImageSrc(report.content.author.avatar);

  return (
    <div className="mt-3 flex min-w-0 items-center gap-3 rounded-2xl border border-border/70 bg-surface-muted/55 p-3">
      <div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-sm font-black uppercase text-primary">
        {avatarSrc ? (
          <Image
            alt={`Foto de ${report.content.author.name}`}
            className="object-cover"
            fill
            sizes="44px"
            src={avatarSrc}
            unoptimized={isPublicAdminMediaSrc(avatarSrc)}
          />
        ) : (
          <span>{authorInitials(report.content.author.name)}</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="min-w-0 truncate text-sm font-black text-foreground">
            {report.content.author.name}
          </p>
          {report.content.author.verified ? (
            <VerifiedBadgeIcon aria-label="Psicólogo verificado" className="h-[18px] w-[18px]" />
          ) : null}
        </div>
        <p className="mt-0.5 text-xs font-bold text-muted">
          Autor do conteúdo · {report.content.author.role_label}
        </p>
      </div>
    </div>
  );
};

export const ModerationReportMedia = ({ report }: { report: ModerationReport }) => {
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
      className={[
        "relative w-full overflow-hidden rounded-2xl border border-border bg-surface-muted",
        isVideo ? "aspect-[9/16] max-w-40" : "h-32 max-w-72",
      ].join(" ")}
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
        <>
          <video
            aria-label={mediaLabel}
            className="h-full w-full object-cover"
            controls
            muted
            playsInline
            preload="metadata"
          >
            <source src={videoSrc} type={mediaType.startsWith("video") ? mediaType : undefined} />
          </video>
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-foreground/70 text-background shadow-admin-soft">
              <Play aria-hidden className="h-5 w-5 fill-current" />
            </span>
          </div>
        </>
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

export const ModerationReportHistory = ({ report }: { report: ModerationReport }) => (
  <section className="mt-5 border-t border-border/70 pt-4">
    <h4 className="text-sm font-black text-foreground">Histórico de denúncias</h4>
    <div className="mt-3 divide-y divide-border/70">
      <article
        className="py-2 text-sm"
        title={`${report.reported_by.name} · ${formatDateTime(report.created_at)} · Motivo: ${
          report.reason_label
        }${report.description ? ` · ${report.description}` : ""}`}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Pill className="bg-surface-muted text-muted">{report.reported_by.label}</Pill>
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

export type ReportModerationAction = "dismiss" | "uphold";

export type ReportModerationState = {
  action: ReportModerationAction;
  report: ModerationReport;
} | null;

export const ModerationReportActions = ({
  onResolve,
  report,
}: {
  onResolve: (action: ReportModerationAction) => void;
  report: ModerationReport;
}) => {
  const hasResolutionActions =
    report.capabilities.can_resolve_dismissed || report.capabilities.can_resolve_upheld;

  if (!hasResolutionActions) {
    return (
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-4">
        <span className="text-xs font-bold text-muted">Denúncia já encerrada:</span>
        <ReportStatusBadge report={report} />
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
