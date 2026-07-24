"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  MessageCircle,
  Play,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, type UseFormReturn, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useAdminModerationOperationalAlerts } from "@/api/callers/moderation";
import { resolveApiError } from "@/api/handle";
import type {
  AdminModerationOperationalAlert,
  AdminModerationOperationalAlertsGroup,
  AdminModerationOperationalAlertsQuery,
  AdminModerationSeverity,
} from "@/api/req/moderation";
import { InputController, SelectController } from "@/components/controllers";

const PAGE_LIMIT = 10;
const SKELETON_KEYS = ["first", "second", "third"] as const;
const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";
const numberFormatter = new Intl.NumberFormat("pt-BR");
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const publicFrontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
const publicMediaPathPrefixes = ["/public/files/", "/community/icons/"] as const;

const groupConfig: Record<
  Exclude<AdminModerationOperationalAlertsGroup, "all">,
  { description: string; emptyLabel: string; title: string }
> = {
  compliance: {
    description:
      "Página exclusiva para pendências de compliance profissional, incluindo CRP em Plano Profissional e WhatsApp inválido.",
    emptyLabel: "Nenhuma pendência de compliance encontrada nos dados reais atuais.",
    title: "Compliance",
  },
  denuncias: {
    description: "Denúncias de posts/respostas para triagem e moderação.",
    emptyLabel: "Nenhuma denúncia encontrada nos dados reais atuais.",
    title: "Denúncias",
  },
  operacional: {
    description:
      "Página exclusiva para pendências operacionais derivadas de oferta: cobertura de posts, publicação de perfis e tração de profissionais.",
    emptyLabel: "Nenhuma pendência operacional encontrada nos dados reais atuais.",
    title: "Operacionais",
  },
};

const denunciaFiltersSchema = z
  .object({
    from: z.string().max(10, "Use uma data válida."),
    q: z.string().max(120, "Use até 120 caracteres na busca."),
    reason: z.enum(["all", "spam", "abuse", "self_harm", "privacy", "other"]),
    reporter: z.enum(["all", "paciente", "psicologo"]),
    status: z.enum(["all", "pending", "upheld", "dismissed"]),
    to: z.string().max(10, "Use uma data válida."),
  })
  .refine((values) => !values.from || !values.to || values.from <= values.to, {
    message: "A data inicial deve ser menor ou igual à final.",
    path: ["to"],
  });

type DenunciaFiltersFormValues = z.infer<typeof denunciaFiltersSchema>;

const denunciaFilterDefaults: DenunciaFiltersFormValues = {
  from: "",
  q: "",
  reason: "all",
  reporter: "all",
  status: "all",
  to: "",
};

const denunciaStatusOptions = [
  { label: "Todos", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Procedentes", value: "upheld" },
  { label: "Improcedentes", value: "dismissed" },
] satisfies Array<{ label: string; value: DenunciaFiltersFormValues["status"] }>;

const denunciaReporterOptions = [
  { label: "Todos", value: "all" },
  { label: "Pacientes", value: "paciente" },
  { label: "Psicólogos", value: "psicologo" },
] satisfies Array<{ label: string; value: DenunciaFiltersFormValues["reporter"] }>;

const denunciaReasonOptions = [
  { label: "Todos", value: "all" },
  { label: "Spam ou divulgação indevida", value: "spam" },
  { label: "Ofensa, assédio ou discurso de ódio", value: "abuse" },
  { label: "Incentivo à violência ou autolesão", value: "self_harm" },
  { label: "Exposição de dados pessoais", value: "privacy" },
  { label: "Outro motivo", value: "other" },
] satisfies Array<{ label: string; value: DenunciaFiltersFormValues["reason"] }>;

const normalizeDenunciaFilters = (
  values: DenunciaFiltersFormValues,
): DenunciaFiltersFormValues => ({
  from: values.from,
  q: values.q.trim(),
  reason: values.reason,
  reporter: values.reporter,
  status: values.status,
  to: values.to,
});

const areDenunciaFiltersEqual = (
  left: DenunciaFiltersFormValues,
  right: DenunciaFiltersFormValues,
) =>
  left.from === right.from &&
  left.q === right.q &&
  left.reason === right.reason &&
  left.reporter === right.reporter &&
  left.status === right.status &&
  left.to === right.to;

const coerceDenunciaFilters = (
  values?: Partial<DenunciaFiltersFormValues>,
): DenunciaFiltersFormValues => ({
  from: values?.from ?? denunciaFilterDefaults.from,
  q: values?.q ?? denunciaFilterDefaults.q,
  reason: values?.reason ?? denunciaFilterDefaults.reason,
  reporter: values?.reporter ?? denunciaFilterDefaults.reporter,
  status: values?.status ?? denunciaFilterDefaults.status,
  to: values?.to ?? denunciaFilterDefaults.to,
});

const toOperationalAlertsFilterQuery = (
  values: DenunciaFiltersFormValues,
): Pick<
  AdminModerationOperationalAlertsQuery,
  "from" | "q" | "reason" | "reporter" | "status" | "to"
> => {
  const normalized = normalizeDenunciaFilters(values);

  return {
    from: normalized.from || undefined,
    q: normalized.q || undefined,
    reason: normalized.reason !== "all" ? normalized.reason : undefined,
    reporter: normalized.reporter,
    status: normalized.status,
    to: normalized.to || undefined,
  };
};

const operationalTypeLabels: Record<AdminModerationOperationalAlert["type"], string> = {
  invalid_whatsapp: "WhatsApp inválido",
  patient_post_without_coverage: "Post sem cobertura",
  post_report: "Denúncia de conteúdo",
  professional_crp_pending: "CRP pendente",
  psychologist_no_traction: "Sem tração",
  unpublished_required_settings: "Perfil não publicado",
};

const operationalGroupCopy: Record<
  AdminModerationOperationalAlert["group"],
  { className: string; label: string }
> = {
  compliance: { className: "bg-red-50 text-danger", label: "Compliance" },
  denuncias: { className: "bg-red-600 text-white", label: "Denúncias" },
  operacional: { className: "bg-blue-50 text-blue-700", label: "Operacional" },
};

const severityCopy: Record<AdminModerationSeverity, { className: string; label: string }> = {
  high: { className: "bg-red-50 text-danger", label: "Alta" },
  low: { className: "bg-surface-muted text-muted", label: "Baixa" },
  medium: { className: "bg-orange-50 text-orange-700", label: "Média" },
  urgent: { className: "bg-red-600 text-white", label: "Urgente" },
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
};

const toPublicHref = (url: string) => {
  if (/^https?:\/\//.test(url)) return url;

  return `${publicFrontendUrl.replace(/\/$/, "")}${url}`;
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
      // Entradas inválidas de env não devem impedir a lista de denúncias.
    }
  }

  return hosts;
};

const canRenderImage = (src: string | null) => {
  const resolved = resolveAdminMediaUrl(src);
  if (!resolved) return false;
  if (resolved.startsWith("/")) return true;

  try {
    const url = new URL(resolved);

    return allowedRemoteImageHosts().has(url.hostname);
  } catch {
    return false;
  }
};

const renderableImageSrc = (src: string | null) => {
  const resolved = resolveAdminMediaUrl(src);

  return resolved && canRenderImage(resolved) ? resolved : null;
};

const isPublicAdminMediaSrc = (src: string) => {
  try {
    return isPublicMediaPath(new URL(src, apiUrl).pathname);
  } catch {
    return false;
  }
};

const Pill = ({ className, children }: { children: ReactNode; className?: string }) => (
  <span
    className={["inline-flex rounded-full px-2.5 py-1 text-xs font-black", className].join(" ")}
  >
    {children}
  </span>
);

const OperationalGroup = ({ value }: { value: AdminModerationOperationalAlert["group"] }) => (
  <Pill className={operationalGroupCopy[value].className}>{operationalGroupCopy[value].label}</Pill>
);

const Severity = ({ value }: { value: AdminModerationSeverity }) => (
  <Pill className={severityCopy[value].className}>{severityCopy[value].label}</Pill>
);

type ModerationReport = NonNullable<AdminModerationOperationalAlert["report"]>;

const reportStatusBadgeClass: Record<ModerationReport["status_group"], string> = {
  dismissed: "bg-emerald-50 text-success",
  pending: "bg-yellow-50 text-yellow-700",
  upheld: "bg-red-50 text-danger",
};

const ReportStatusBadge = ({ report }: { report: ModerationReport }) => (
  <Pill className={reportStatusBadgeClass[report.status_group]}>{report.status_label}</Pill>
);

const moderationReportTitle = (report: ModerationReport) => {
  if (report.content.type === "post") return report.content.title?.trim() || "Post sem título";

  const title = report.content.title?.trim();
  const normalizedTitle = title?.toLowerCase();

  return normalizedTitle && !["comentário", "comentario"].includes(normalizedTitle) ? title : null;
};

const moderationReportContentTypeLabel = (report: ModerationReport) => {
  if (report.content.type === "post") return "Post";

  const title = report.content.title?.trim().toLowerCase();

  return title && !["comentário", "comentario"].includes(title) ? "Resposta" : "Comentário";
};

const ModerationReportContentHeader = ({ report }: { report: ModerationReport }) => {
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

const ModerationReportMedia = ({ report }: { report: ModerationReport }) => {
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

const ModerationReportHistory = ({ report }: { report: ModerationReport }) => (
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

const ModerationReportListItem = ({ alert }: { alert: AdminModerationOperationalAlert }) => {
  const report = alert.report;
  if (!report) return null;

  const title = moderationReportTitle(report);
  const adminHref = alert.action_href ?? report.content.public_url;
  const contentHref = report.content.public_url ? toPublicHref(report.content.public_url) : null;
  const adminLinkTarget = adminHref === report.content.public_url ? "_blank" : undefined;

  return (
    <article className="rounded-card border border-border/75 bg-surface/95 p-4 shadow-admin-soft md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ReportStatusBadge report={report} />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-black text-primary">
            <AlertTriangle aria-hidden className="h-3.5 w-3.5" />1 denúncia
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted">
            <CalendarDays aria-hidden className="h-3.5 w-3.5" />
            Última em {formatDateTime(report.created_at)}
          </span>
        </div>
        {contentHref ? (
          <Link
            aria-label="Ver conteúdo público"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground/75 transition hover:text-foreground"
            href={contentHref}
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
        <ModerationReportContentHeader report={report} />
        {title ? <h3 className="mt-3 text-lg font-black text-foreground">{title}</h3> : null}
        <div className="mt-3 space-y-4">
          <div className="min-w-0 whitespace-pre-wrap text-sm leading-6 text-muted">
            {report.content.body || report.content.excerpt || "Conteúdo sem texto disponível."}
          </div>
          {report.content.media ? (
            <div className="max-w-72">
              <ModerationReportMedia report={report} />
            </div>
          ) : null}
        </div>
        {!report.content.available ? (
          <p className="mt-3 rounded-2xl border border-danger/15 bg-danger/10 p-3 text-xs font-bold leading-5 text-danger">
            {report.content.unavailable_reason || "Conteúdo removido ou indisponível."}
          </p>
        ) : null}
      </section>

      <ModerationReportHistory report={report} />

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border/70 pt-4">
        {adminHref ? (
          <Link
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-xs font-black text-foreground transition hover:border-primary hover:text-primary"
            href={adminHref === report.content.public_url ? toPublicHref(adminHref) : adminHref}
            rel={adminLinkTarget ? "noreferrer" : undefined}
            target={adminLinkTarget}
          >
            <ExternalLink aria-hidden className="h-4 w-4" />
            Abrir conteúdo denunciado
          </Link>
        ) : null}
      </div>
    </article>
  );
};

const DenunciaFiltersBar = ({
  disabled,
  form,
  isFetching,
  resultCount,
}: {
  disabled: boolean;
  form: UseFormReturn<DenunciaFiltersFormValues>;
  isFetching: boolean;
  resultCount: number;
}) => (
  <div className="border-b border-border bg-surface/80 p-4">
    <FormProvider {...form}>
      <form
        className="grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(260px,1.25fr)_repeat(5,minmax(150px,1fr))]"
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="md:col-span-2 2xl:col-span-1">
          <InputController<DenunciaFiltersFormValues>
            disabled={disabled}
            label="Buscar"
            name="q"
            placeholder="Conteúdo, comunidade ou alvo"
          />
          <p className="-mt-1 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-muted">
            <span>{numberFormatter.format(resultCount)} registro(s) encontrado(s)</span>
            {isFetching ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            ) : null}
          </p>
        </div>
        <InputController<DenunciaFiltersFormValues>
          disabled={disabled}
          label="De"
          name="from"
          type="date"
        />
        <InputController<DenunciaFiltersFormValues>
          disabled={disabled}
          label="Até"
          name="to"
          type="date"
        />
        <SelectController<DenunciaFiltersFormValues>
          disabled={disabled}
          label="Motivo"
          name="reason"
          options={denunciaReasonOptions}
        />
        <SelectController<DenunciaFiltersFormValues>
          disabled={disabled}
          label="Status"
          name="status"
          options={denunciaStatusOptions}
        />
        <SelectController<DenunciaFiltersFormValues>
          disabled={disabled}
          label="Denunciante"
          name="reporter"
          options={denunciaReporterOptions}
        />
      </form>
    </FormProvider>
  </div>
);

const OperationalAlertCard = ({ alert }: { alert: AdminModerationOperationalAlert }) => {
  const href = alert.action_href ?? alert.entity.href;

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-control">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <OperationalGroup value={alert.group} />
            <Severity value={alert.priority} />
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-black text-muted">
              {operationalTypeLabels[alert.type]}
            </span>
          </div>
          <h3 className="mt-3 text-base font-black text-foreground">{alert.title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{alert.description}</p>
        </div>
        <p className="shrink-0 text-xs font-black text-muted">{formatDateTime(alert.created_at)}</p>
      </div>
      <div className="mt-3 grid gap-2 text-xs font-bold text-muted sm:grid-cols-2">
        <p>Alvo: {alert.entity.label}</p>
        <p>Origem: {alert.source}</p>
        {alert.community ? <p>Comunidade: {alert.community.name}</p> : null}
        {alert.age_hours !== null ? <p>Idade: {numberFormatter.format(alert.age_hours)}h</p> : null}
      </div>
      {alert.facts.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {alert.facts.map((fact) => (
            <span
              className="rounded-full bg-primary-soft px-2.5 py-1 text-[0.68rem] font-black text-primary"
              key={`${alert.id}-${fact.label}-${fact.value}`}
            >
              {fact.label}: {fact.value}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2 text-xs font-bold text-muted">
          <MessageCircle aria-hidden className="h-4 w-4" />
          Dados reais; sem mock ou estimativa artificial.
        </span>
        {href ? (
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-black text-foreground transition hover:border-primary hover:text-primary"
            href={href}
          >
            <ExternalLink aria-hidden className="h-4 w-4" />
            {alert.action_label}
          </Link>
        ) : null}
      </div>
    </article>
  );
};

export const AdminModerationOperationalCategoryClient = ({
  group,
}: {
  group: Exclude<AdminModerationOperationalAlertsGroup, "all">;
}) => {
  const [page, setPage] = useState(1);
  const [appliedFilters, setAppliedFilters] =
    useState<DenunciaFiltersFormValues>(denunciaFilterDefaults);
  const filtersForm = useForm<DenunciaFiltersFormValues>({
    defaultValues: denunciaFilterDefaults,
    mode: "onChange",
    resolver: zodResolver(denunciaFiltersSchema),
  });
  const watchedFilters = useWatch({ control: filtersForm.control });
  const latestAppliedFiltersRef = useRef(appliedFilters);
  const queryInput = useMemo<AdminModerationOperationalAlertsQuery>(
    () => ({
      group,
      limit: PAGE_LIMIT,
      page,
      ...(group === "denuncias" ? toOperationalAlertsFilterQuery(appliedFilters) : {}),
    }),
    [appliedFilters, group, page],
  );
  const query = useAdminModerationOperationalAlerts(queryInput);
  const config = groupConfig[group];

  useEffect(() => {
    latestAppliedFiltersRef.current = appliedFilters;
  }, [appliedFilters]);

  useEffect(() => {
    if (group !== "denuncias") return;

    const timeout = window.setTimeout(async () => {
      const valid = await filtersForm.trigger(undefined, { shouldFocus: false });
      if (!valid) return;

      const normalized = normalizeDenunciaFilters(coerceDenunciaFilters(watchedFilters));
      if (areDenunciaFiltersEqual(latestAppliedFiltersRef.current, normalized)) return;

      setAppliedFilters(normalized);
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [filtersForm, group, watchedFilters]);

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <div className="p-5 md:p-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Moderação
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {config.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted md:text-base">
              {config.description}
            </p>
          </div>
        </div>
      </section>

      {query.error ? (
        <section className={`${cardClass} p-5`}>
          <div className="flex gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
              <AlertTriangle aria-hidden className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black">Não foi possível carregar a categoria</h2>
              <p className="mt-1 text-sm text-muted">{resolveApiError(query.error)}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className={`${cardClass} overflow-hidden`}>
        {group !== "denuncias" ? (
          <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-foreground">Pendências</h2>
              <p className="text-xs font-bold text-muted">
                {numberFormatter.format(query.data?.count ?? 0)} registro(s) real(is) nesta
                categoria
              </p>
            </div>
            {query.isFetching ? (
              <span className="inline-flex items-center gap-2 text-xs font-black text-muted">
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Atualizando
              </span>
            ) : null}
          </div>
        ) : null}
        {group === "denuncias" ? (
          <DenunciaFiltersBar
            disabled={query.isLoading}
            form={filtersForm}
            isFetching={query.isFetching}
            resultCount={query.data?.count ?? 0}
          />
        ) : null}
        <div className="grid gap-3 p-4">
          {query.isLoading ? (
            SKELETON_KEYS.map((key) => (
              <div className="h-36 animate-pulse rounded-2xl bg-surface-muted" key={key} />
            ))
          ) : (query.data?.data.length ?? 0) === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-muted">
              {config.emptyLabel}
            </div>
          ) : (
            query.data?.data.map((alert) =>
              alert.report ? (
                <ModerationReportListItem alert={alert} key={alert.id} />
              ) : (
                <OperationalAlertCard alert={alert} key={alert.id} />
              ),
            )
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-muted">
            Página {query.data?.page ?? page} de {query.data?.pages ?? 1}
          </p>
          <div className="flex gap-2">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-border px-3 text-sm font-black text-foreground transition hover:border-primary disabled:opacity-50"
              disabled={(query.data?.page ?? page) <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
              Anterior
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-border px-3 text-sm font-black text-foreground transition hover:border-primary disabled:opacity-50"
              disabled={(query.data?.page ?? page) >= (query.data?.pages ?? 1)}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Próxima
              <ChevronRight aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {query.data?.excluded_dimensions.length ? (
        <div className="rounded-2xl border border-border bg-surface-muted p-4 text-xs leading-5 text-muted">
          Fora do escopo agora:{" "}
          {query.data.excluded_dimensions.map((item) => item.title).join("; ")}.
        </div>
      ) : null}
    </div>
  );
};
