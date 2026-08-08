"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAdminPsychologistResolveReport } from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type { AdminPsychologistReportItem } from "@/api/req/psychologists";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import { toPublicFrontendHref } from "@/lib/public-frontend-url";
import { formatDateTime } from "../../support/formatters";
import type {
  ReportDismissFormValues,
  ReportReviewFormValues,
  ReportUpholdFormValues,
} from "../../support/schemas";
import {
  REPORT_DISMISS_CONFIRMATION,
  REPORT_REVIEW_CONFIRMATION,
  REPORT_UPHOLD_CONFIRMATION,
  reportDismissSchema,
  reportReviewSchema,
  reportUpholdSchema,
} from "../../support/schemas";
import type { ReportModerationState } from "./support";
import {
  PsychologistReportActions,
  PsychologistReportContentHeader,
  PsychologistReportMedia,
  PsychologistReportReporterHistory,
  psychologistReportTitle,
  ReportStatusBadge,
  reportReviewResolutionLabel,
  reportReviewResolutionOptions,
} from "./support";

export const PsychologistReportListItem = ({
  onResolve,
  report,
}: {
  onResolve: (state: ReportModerationState) => void;
  report: AdminPsychologistReportItem;
}) => {
  const title = psychologistReportTitle(report);

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
        <PsychologistReportContentHeader report={report} />
        {title ? <h3 className="mt-3 text-lg font-bold text-foreground">{title}</h3> : null}
        <div className="mt-3 space-y-4">
          <div className="min-w-0 whitespace-pre-wrap text-sm leading-6 text-muted">
            {report.content.body || report.content.excerpt || "Conteúdo sem texto disponível."}
          </div>
          {report.content.media ? (
            <div className="max-w-72">
              <PsychologistReportMedia report={report} />
            </div>
          ) : null}
        </div>
        {!report.content.available ? (
          <p className="mt-3 rounded-2xl border border-danger/15 bg-danger/10 p-3 text-xs font-bold leading-5 text-danger">
            {report.content.unavailable_reason || "Conteúdo removido ou indisponível."}
          </p>
        ) : null}
      </section>
      <PsychologistReportReporterHistory report={report} />
      <PsychologistReportActions
        onResolve={(action) => onResolve({ action, report })}
        report={report}
      />
    </article>
  );
};

export const ReportModerationDialog = ({
  id,
  onClose,
  state,
}: {
  id: string;
  onClose: () => void;
  state: NonNullable<ReportModerationState>;
}) => {
  const title =
    state.action === "dismiss"
      ? "Resolver como improcedente"
      : state.action === "uphold"
        ? "Resolver como procedente"
        : "Revisar decisão encerrada";

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4"
      role="dialog"
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-border bg-surface p-5 shadow-admin-soft sm:max-w-2xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
              Denúncias e moderação
            </p>
            <h3 className="mt-1 text-xl font-bold text-foreground">{title}</h3>
            <p className="mt-2 text-sm font-bold leading-6 text-muted">
              {state.report.content.type === "post" ? "Post" : "Resposta"} em{" "}
              {state.report.content.community.name}: {state.report.content.title}
            </p>
          </div>
          <button
            aria-label="Fechar"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition hover:bg-surface-muted"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">
          {state.action === "dismiss" ? (
            <ReportDismissForm id={id} onClose={onClose} report={state.report} />
          ) : state.action === "uphold" ? (
            <ReportUpholdForm id={id} onClose={onClose} report={state.report} />
          ) : (
            <ReportReviewForm id={id} onClose={onClose} report={state.report} />
          )}
        </div>
      </div>
    </div>
  );
};

const ReportDismissForm = ({
  id,
  onClose,
  report,
}: {
  id: string;
  onClose: () => void;
  report: AdminPsychologistReportItem;
}) => {
  const mutation = useAdminPsychologistResolveReport(id);
  const form = useForm<ReportDismissFormValues>({
    defaultValues: { confirmation: "", reason: "" },
    mode: "onSubmit",
    resolver: zodResolver(reportDismissSchema),
  });

  const onSubmit: SubmitHandler<ReportDismissFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        input: {
          confirmation: values.confirmation.trim().toUpperCase(),
          reason: values.reason.trim(),
          resolution: "dismissed",
        },
        reportId: report.id,
      });
      form.reset();
      toast.success("Denúncia resolvida como improcedente.");
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold leading-6 text-emerald-800">
          Esta ação encerra a denúncia como improcedente e não altera o conteúdo denunciado.
        </div>
        <TextareaController<ReportDismissFormValues>
          disabled={mutation.isPending}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Explique por que a denúncia foi considerada improcedente."
          required
          rows={4}
        />
        <InputController<ReportDismissFormValues>
          autoComplete="off"
          disabled={mutation.isPending}
          label="Confirmação forte"
          name="confirmation"
          placeholder={REPORT_DISMISS_CONFIRMATION}
          required
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-12 items-center justify-center rounded-control border border-border px-4 text-sm font-black text-muted transition hover:bg-surface-muted"
            disabled={mutation.isPending}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-success bg-surface px-4 text-sm font-black text-success transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 aria-hidden className="h-4 w-4" />
            )}
            Resolver como improcedente
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

const ReportUpholdForm = ({
  id,
  onClose,
  report,
}: {
  id: string;
  onClose: () => void;
  report: AdminPsychologistReportItem;
}) => {
  const mutation = useAdminPsychologistResolveReport(id);
  const measureOptions = report.capabilities.can_remove_content
    ? [
        { label: "Remover conteúdo denunciado", value: "remove_content" },
        { label: "Manter conteúdo sem alteração", value: "none" },
      ]
    : [{ label: "Manter conteúdo sem alteração", value: "none" }];
  const form = useForm<ReportUpholdFormValues>({
    defaultValues: {
      confirmation: "",
      measure: report.capabilities.can_remove_content ? "remove_content" : "none",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(reportUpholdSchema),
  });

  const onSubmit: SubmitHandler<ReportUpholdFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        input: {
          confirmation: values.confirmation.trim().toUpperCase(),
          measure: values.measure,
          reason: values.reason.trim(),
          resolution: "upheld",
        },
        reportId: report.id,
      });
      form.reset();
      toast.success(
        values.measure === "remove_content"
          ? "Denúncia procedente. Conteúdo removido."
          : "Denúncia resolvida como procedente.",
      );
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold leading-6 text-red-800">
          {report.content.available
            ? "Se a medida for remover, o conteúdo sairá das listagens públicas. Esta ação não notifica nem aplica sanções de conta automaticamente."
            : (report.content.unavailable_reason ??
              "O conteúdo denunciado já está indisponível. A denúncia pode ser encerrada como procedente sem nova remoção.")}
        </div>
        <SelectController<ReportUpholdFormValues>
          disabled={mutation.isPending}
          label="Medida"
          name="measure"
          options={measureOptions}
          required
        />
        <TextareaController<ReportUpholdFormValues>
          disabled={mutation.isPending}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Explique por que a denúncia foi considerada procedente."
          required
          rows={4}
        />
        <InputController<ReportUpholdFormValues>
          autoComplete="off"
          disabled={mutation.isPending}
          label="Confirmação forte"
          name="confirmation"
          placeholder={REPORT_UPHOLD_CONFIRMATION}
          required
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-12 items-center justify-center rounded-control border border-border px-4 text-sm font-black text-muted transition hover:bg-surface-muted"
            disabled={mutation.isPending}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-danger px-4 text-sm font-black text-white transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck aria-hidden className="h-4 w-4" />
            )}
            Resolver como procedente
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

const ReportReviewForm = ({
  id,
  onClose,
  report,
}: {
  id: string;
  onClose: () => void;
  report: AdminPsychologistReportItem;
}) => {
  const mutation = useAdminPsychologistResolveReport(id);
  const resolutionOptions = reportReviewResolutionOptions.filter(
    (option) => option.value !== report.status_group,
  );
  const form = useForm<ReportReviewFormValues>({
    defaultValues: {
      confirmation: "",
      reason: "",
      resolution: "pending",
    },
    mode: "onSubmit",
    resolver: zodResolver(reportReviewSchema),
  });

  const onSubmit: SubmitHandler<ReportReviewFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        input: {
          confirmation: values.confirmation.trim().toUpperCase(),
          reason: values.reason.trim(),
          resolution: values.resolution,
        },
        reportId: report.id,
      });
      form.reset();
      toast.success(
        `Decisão da denúncia revisada para ${reportReviewResolutionLabel(
          values.resolution,
        ).toLowerCase()}.`,
      );
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm font-bold leading-6 text-blue-900">
          A revisão altera apenas o status da denúncia e registra uma nova auditoria. Conteúdo
          removido não será restaurado automaticamente.
        </div>
        <SelectController<ReportReviewFormValues>
          disabled={mutation.isPending}
          label="Novo status"
          name="resolution"
          options={resolutionOptions}
          required
        />
        <TextareaController<ReportReviewFormValues>
          disabled={mutation.isPending}
          label="Motivo da revisão"
          name="reason"
          placeholder="Explique por que a decisão encerrada está sendo revista."
          required
          rows={4}
        />
        <InputController<ReportReviewFormValues>
          autoComplete="off"
          disabled={mutation.isPending}
          label="Confirmação forte"
          name="confirmation"
          placeholder={REPORT_REVIEW_CONFIRMATION}
          required
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-12 items-center justify-center rounded-control border border-border px-4 text-sm font-black text-muted transition hover:bg-surface-muted"
            disabled={mutation.isPending}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw aria-hidden className="h-4 w-4" />
            )}
            Confirmar revisão
          </button>
        </div>
      </form>
    </FormProvider>
  );
};
