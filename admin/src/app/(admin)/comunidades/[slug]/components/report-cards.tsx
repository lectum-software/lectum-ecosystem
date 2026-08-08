"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAdminCommunityResolveReports } from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import type {
  AdminCommunityReportItem,
  AdminCommunityReports,
  AdminCommunityReportsQuery,
  AdminCommunityResolveReportsInput,
} from "@/api/req/communities";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import { isAdminPublicMediaUrl, renderableImageSrc, resolveAdminMediaUrl } from "@/lib/admin-media";
import { toPublicFrontendHref } from "@/lib/public-frontend-url";
import { cn } from "@/lib/utils";

import {
  type CommunityReportResolveFormValues,
  cardClass,
  communityReportResolveSchema,
  formatDateTime,
  initials,
  numberFormatter,
} from "../modules/detail-support";

import { ContentVideoMiniplayer } from "./content-media";

import { StatusBadge } from "./content-shared";

export type CommunityReportCard = AdminCommunityReports["cards"][number];

export type CommunityReportFilterType = NonNullable<AdminCommunityReportsQuery["type"]>;

export const emptyCommunityReportCards: CommunityReportCard[] = [
  { id: "total", label: "Total de denúncias", source: "post_report", value: 0 },
  { id: "pending", label: "Pendentes", source: "post_report", value: 0 },
  { id: "upheld", label: "Procedentes", source: "post_report", value: 0 },
  { id: "dismissed", label: "Improcedentes", source: "post_report", value: 0 },
];

export const communityReportTypeFallback: AdminCommunityReports["filters"]["types"] = [
  { count: 0, id: "all", label: "Todos" },
  { count: 0, id: "verified_psychologist_post", label: "Post de psicólogo verificado" },
  { count: 0, id: "unverified_psychologist_post", label: "Post de psicólogo não verificado" },
  { count: 0, id: "verified_psychologist_reply", label: "Resposta de psicólogo verificado" },
  { count: 0, id: "unverified_psychologist_reply", label: "Resposta de psicólogo não verificado" },
  { count: 0, id: "patient_post", label: "Post de paciente" },
  { count: 0, id: "patient_comment", label: "Comentário de paciente" },
];

export const communityReportStatusFallback: AdminCommunityReports["filters"]["statuses"] = [
  { count: 0, id: "all", label: "Todos os status" },
  { count: 0, id: "pending", label: "Pendentes" },
  { count: 0, id: "upheld", label: "Procedentes" },
  { count: 0, id: "dismissed", label: "Improcedentes" },
];

export const CommunityReportMetricCard = ({ card }: { card: CommunityReportCard }) => {
  const Icon =
    card.id === "dismissed" ? CheckCircle2 : card.id === "upheld" ? ShieldCheck : AlertTriangle;

  return (
    <section className={cn(cardClass, "p-5")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-foreground">{card.label}</p>
          <p className="mt-5 text-4xl font-black text-foreground">
            {numberFormatter.format(card.value)}
          </p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-primary-soft text-primary ring-1 ring-primary/10">
          <Icon aria-hidden className="h-5 w-5" />
        </span>
      </div>
    </section>
  );
};

export const CommunityReportFilterSelect = ({
  children,
  className,
  label,
  onChange,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <label className={cn("block text-sm font-black text-muted", className)}>
    {label}
    <span className="relative mt-2 block">
      <select
        className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-14 text-sm font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
      />
    </span>
  </label>
);

export const CommunityReportStatusBadge = ({
  group,
  label,
}: {
  group: AdminCommunityReportItem["status_group"];
  label: string;
}) => {
  const Icon =
    group === "upheld" ? ShieldCheck : group === "dismissed" ? CheckCircle2 : AlertTriangle;
  const className =
    group === "upheld"
      ? "border-danger/20 bg-danger/10 text-danger"
      : group === "dismissed"
        ? "border-success/20 bg-success/10 text-success"
        : "border-warning/20 bg-warning/10 text-warning";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black",
        className,
      )}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {label}
    </span>
  );
};

export const COMMUNITY_REPORT_DISMISS_CONFIRMATION = "DENUNCIA IMPROCEDENTE";

export const COMMUNITY_REPORT_UPHOLD_CONFIRMATION = "DENUNCIA PROCEDENTE";

export const COMMUNITY_REPORT_REVIEW_CONFIRMATION = "REVISAR DECISAO";

export type CommunityReportResolution = AdminCommunityResolveReportsInput["resolution"];

export const communityReportResolutionOptions: {
  label: string;
  value: CommunityReportResolution;
}[] = [
  { label: "Pendente", value: "pending" },
  { label: "Improcedente", value: "dismissed" },
  { label: "Procedente", value: "upheld" },
];

export const communityReportResolutionLabel = (resolution: CommunityReportResolution) =>
  communityReportResolutionOptions.find((option) => option.value === resolution)?.label ??
  "Pendente";

export type CommunityReportResolveState = {
  report: AdminCommunityReportItem;
  resolution: CommunityReportResolution;
} | null;

export const CommunityReportMedia = ({ report }: { report: AdminCommunityReportItem }) => {
  if (!report.content.media) return null;

  const mediaType = report.content.media.media_type.toLowerCase();
  const imageSrc =
    mediaType === "image" ? renderableImageSrc(report.content.media.media_url) : null;
  const videoSrc =
    mediaType === "video" ? resolveAdminMediaUrl(report.content.media.media_url) : null;
  const label = mediaType === "video" ? "Midia de video denunciada" : "Midia de imagem denunciada";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border bg-surface-muted",
        mediaType === "video" ? "aspect-[9/16] max-w-48" : "min-h-44",
      )}
    >
      {imageSrc ? (
        <Image
          alt={label}
          className="object-cover"
          fill
          sizes="(min-width: 1024px) 220px, 100vw"
          src={imageSrc}
          unoptimized={isAdminPublicMediaUrl(report.content.media.media_url)}
        />
      ) : null}
      {!imageSrc && videoSrc ? <ContentVideoMiniplayer label={label} src={videoSrc} /> : null}
      {!imageSrc && !videoSrc ? (
        <div className="grid h-32 place-items-center gap-1 p-4 text-center text-xs font-black text-muted">
          <ImageIcon aria-hidden className="mx-auto h-5 w-5" />
          <span>Midia do conteudo denunciado</span>
        </div>
      ) : null}
    </div>
  );
};

export const communityReportTitle = (report: AdminCommunityReportItem) => {
  if (report.content.type === "comment") {
    const title = report.content.title?.trim();
    const normalizedTitle = title?.toLowerCase();

    return normalizedTitle && !["comentário", "comentario"].includes(normalizedTitle)
      ? title
      : null;
  }

  return report.content.title?.trim() || "Post sem título";
};

export const CommunityReportContentAuthor = ({ report }: { report: AdminCommunityReportItem }) => {
  const author = report.content.author;
  if (!author) return null;

  const avatarSrc = renderableImageSrc(author.avatar);

  return (
    <div className="mt-2 flex min-w-0 items-center gap-2.5">
      <div className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-primary-soft text-xs font-black text-primary">
        {avatarSrc ? (
          <Image
            alt={`Foto de perfil de ${author.name}`}
            className="object-cover"
            fill
            sizes="36px"
            src={avatarSrc}
            unoptimized={isAdminPublicMediaUrl(author.avatar)}
          />
        ) : (
          initials(author.name)
        )}
      </div>
      <div className="min-w-0">
        <span className="block truncate text-sm font-bold text-foreground">{author.name}</span>
        <span className="block text-xs font-bold text-muted">{author.role_label}</span>
      </div>
    </div>
  );
};

export const CommunityReportReporterHistory = ({
  report,
}: {
  report: AdminCommunityReportItem;
}) => (
  <section className="mt-5 border-t border-border/70 pt-5">
    <h4 className="text-sm font-black text-foreground">Histórico de denúncias</h4>

    <div className="mt-3 divide-y divide-border/70">
      {report.reporters.map((reporter) => (
        <article
          className="py-2 text-sm"
          key={reporter.id}
          title={`${reporter.reporter.name} · ${formatDateTime(reporter.created_at)} · Motivo: ${reporter.reason_label}${
            reporter.description ? ` · ${reporter.description}` : ""
          }`}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <StatusBadge tone="muted">{reporter.reporter.label}</StatusBadge>
            <span className="shrink-0 font-normal text-foreground">{reporter.reporter.name}</span>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-muted">
              <CalendarDays aria-hidden className="h-3.5 w-3.5" />
              {formatDateTime(reporter.created_at)}
            </span>
            <span aria-hidden className="shrink-0 text-muted/70">
              ·
            </span>
            <span className="min-w-0 truncate font-bold text-foreground">
              Motivo: {reporter.reason_label}
            </span>
          </div>
          {reporter.description ? (
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">{reporter.description}</p>
          ) : null}
        </article>
      ))}
    </div>
  </section>
);

export const CommunityReportActions = ({
  onResolve,
  report,
}: {
  onResolve: (resolution: CommunityReportResolution) => void;
  report: AdminCommunityReportItem;
}) => {
  const hasResolutionActions =
    report.capabilities.can_resolve_dismissed || report.capabilities.can_resolve_upheld;

  if (!hasResolutionActions) {
    return (
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-4">
        <span className="text-xs font-bold text-muted">Denúncia já encerrada:</span>
        <CommunityReportStatusBadge group={report.status_group} label={report.status_label} />
        {report.capabilities.can_review_resolution ? (
          <button
            className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full border border-border/60 bg-transparent px-3 py-1 text-xs font-semibold text-muted transition hover:border-primary/25 hover:bg-primary-soft/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            onClick={() => onResolve("pending")}
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
          onClick={() => onResolve("dismissed")}
          type="button"
        >
          <CheckCircle2 aria-hidden className="h-3 w-3" />
          Improcedente
        </button>
      ) : null}
      {report.capabilities.can_resolve_upheld ? (
        <button
          className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full border border-danger/20 bg-transparent px-3 py-1 text-xs font-semibold text-danger transition hover:border-danger/35 hover:bg-danger/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/15"
          onClick={() => onResolve("upheld")}
          type="button"
        >
          <ShieldCheck aria-hidden className="h-3 w-3" />
          Procedente
        </button>
      ) : null}
    </div>
  );
};

export const CommunityReportListItem = ({
  report,
  setResolveState,
  slug,
}: {
  report: AdminCommunityReportItem;
  setResolveState: (state: CommunityReportResolveState) => void;
  slug: string;
}) => {
  const title = communityReportTitle(report);
  const detailHref = `/comunidades/${encodeURIComponent(slug)}/conteudo/${encodeURIComponent(
    report.content.type,
  )}/${encodeURIComponent(report.content.id)}`;

  return (
    <article className="rounded-card border border-border/75 bg-surface/95 p-4 shadow-admin-soft md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="muted">{report.content.content_kind_label}</StatusBadge>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-black text-primary">
            <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
            {numberFormatter.format(report.report_count)} denúncia(s)
          </span>
          <CommunityReportStatusBadge group={report.status_group} label={report.status_label} />
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted">
            <CalendarDays aria-hidden className="h-3.5 w-3.5" />
            Última em {formatDateTime(report.last_reported_at)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            aria-label="Ver detalhe analítico do conteúdo denunciado"
            className="grid h-9 w-9 place-items-center rounded-full text-primary transition hover:bg-primary-soft"
            href={detailHref}
            title="Detalhe analítico"
          >
            <FileText aria-hidden className="h-4 w-4" />
          </Link>
          {report.content.public_url ? (
            <Link
              aria-label="Ver conteúdo público"
              className="grid h-9 w-9 place-items-center rounded-full text-foreground/75 transition hover:text-foreground"
              href={toPublicFrontendHref(report.content.public_url)}
              rel="noreferrer"
              target="_blank"
              title="Ver conteúdo público"
            >
              <Eye aria-hidden className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>

      <section className="mt-4">
        <p className="text-[0.68rem] font-black uppercase tracking-wide text-muted">
          Conteúdo denunciado
        </p>
        <CommunityReportContentAuthor report={report} />
        {title ? <h3 className="mt-3 text-lg font-black text-foreground">{title}</h3> : null}
        <div className="mt-3 space-y-4">
          <div className="min-w-0 whitespace-pre-wrap text-sm font-bold leading-6 text-foreground">
            {report.content.body || report.content.excerpt || "Conteúdo sem texto disponível."}
          </div>
          {report.content.media ? (
            <div className="max-w-72">
              <CommunityReportMedia report={report} />
            </div>
          ) : null}
        </div>
        {!report.content.available ? (
          <p className="mt-3 rounded-2xl border border-danger/15 bg-danger/10 p-3 text-xs font-bold leading-5 text-danger">
            {report.content.unavailable_reason || "Conteúdo removido ou indisponível."}
          </p>
        ) : null}
      </section>

      <CommunityReportReporterHistory report={report} />
      <CommunityReportActions
        onResolve={(resolution) => setResolveState({ report, resolution })}
        report={report}
      />
    </article>
  );
};

export const CommunityReportResolveDialog = ({
  onClose,
  slug,
  state,
}: {
  onClose: () => void;
  slug: string;
  state: NonNullable<CommunityReportResolveState>;
}) => {
  const isReview = state.report.status_group !== "pending";
  const expectedConfirmation = isReview
    ? COMMUNITY_REPORT_REVIEW_CONFIRMATION
    : state.resolution === "dismissed"
      ? COMMUNITY_REPORT_DISMISS_CONFIRMATION
      : COMMUNITY_REPORT_UPHOLD_CONFIRMATION;
  const reviewResolutionOptions = communityReportResolutionOptions.filter(
    (option) => option.value !== state.report.status_group,
  );
  const mutation = useAdminCommunityResolveReports(slug);
  const form = useForm<CommunityReportResolveFormValues>({
    defaultValues: {
      confirmation: "",
      reason: "",
      resolution: state.resolution,
    },
    mode: "onSubmit",
    resolver: zodResolver(communityReportResolveSchema(expectedConfirmation)),
  });

  const onSubmit = async (values: CommunityReportResolveFormValues) => {
    try {
      await mutation.mutateAsync({
        input: {
          confirmation: values.confirmation,
          reason: values.reason.trim(),
          resolution: values.resolution,
        },
        targetId: state.report.content.id,
        targetType: state.report.content.type,
      });
      toast.success(
        isReview
          ? `Decisão da denúncia revisada para ${communityReportResolutionLabel(
              values.resolution,
            ).toLowerCase()}.`
          : values.resolution === "dismissed"
            ? "Denuncia marcada como improcedente."
            : "Denuncia marcada como procedente.",
      );
      form.reset();
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-foreground/40 p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <FormProvider {...form}>
        <form
          aria-modal="true"
          className="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] border border-border bg-surface shadow-xl sm:max-h-[92dvh] sm:rounded-[28px]"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          role="dialog"
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  {isReview ? "Revisão de decisão" : "Resolucao de denuncias"}
                </p>
                <h3 className="mt-1 text-xl font-black text-foreground">
                  {isReview
                    ? "Revisar decisão encerrada"
                    : `Marcar como ${
                        state.resolution === "dismissed" ? "improcedente" : "procedente"
                      }`}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {isReview
                    ? "A revisão altera o status das denúncias deste conteúdo e registra auditoria sem apagar a decisão anterior. Conteúdo removido não será restaurado automaticamente."
                    : "A decisao atualiza todas as denuncias pendentes deste mesmo conteudo e registra auditoria. O conteudo nao sera removido por esta acao."}
                </p>
              </div>
              <button
                aria-label="Fechar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted"
                onClick={onClose}
                type="button"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-surface-muted p-3 text-sm font-bold text-muted">
              {state.report.content.title ? (
                <p className="text-foreground">{state.report.content.title}</p>
              ) : null}
              <p className="mt-1 line-clamp-3">
                {state.report.content.excerpt || "Conteudo sem texto."}
              </p>
              <p className="mt-2 text-xs">
                {numberFormatter.format(state.report.report_count)} denuncia(s) recebida(s)
              </p>
            </div>

            <div className="mt-4 grid gap-3">
              {isReview ? (
                <SelectController<CommunityReportResolveFormValues>
                  label="Novo status"
                  name="resolution"
                  options={reviewResolutionOptions}
                  required
                />
              ) : null}
              <TextareaController<CommunityReportResolveFormValues>
                label="Motivo interno obrigatorio"
                name="reason"
                required
                rows={3}
              />
              <InputController<CommunityReportResolveFormValues>
                label="Confirmacao forte"
                name="confirmation"
                placeholder={expectedConfirmation}
                required
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-border/70 bg-surface p-4 sm:flex-row sm:justify-end">
            <button
              className="h-10 rounded-control border border-border bg-surface px-4 text-xs font-black text-foreground"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-control px-4 text-xs font-black text-primary-foreground disabled:opacity-70",
                isReview
                  ? "bg-primary"
                  : state.resolution === "dismissed"
                    ? "bg-success"
                    : "bg-danger",
              )}
              disabled={mutation.isPending}
              type="submit"
            >
              {mutation.isPending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
              {isReview ? "Confirmar revisão" : "Confirmar decisao"}
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};
