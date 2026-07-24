"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Loader2,
  MessageCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { FormProvider, type UseFormReturn, useForm } from "react-hook-form";
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
    emptyLabel: "Nenhuma denúncia pendente encontrada nos dados reais atuais.",
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
    reason: z.string().max(80, "Use até 80 caracteres no motivo."),
    reporter: z.enum(["all", "paciente", "psicologo"]),
    status: z.enum(["all", "pending", "reviewing"]),
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
  reason: "",
  reporter: "all",
  status: "all",
  to: "",
};

const denunciaStatusOptions = [
  { label: "Todos os status", value: "all" },
  { label: "Pendente", value: "pending" },
  { label: "Em análise (legado)", value: "reviewing" },
] satisfies Array<{ label: string; value: DenunciaFiltersFormValues["status"] }>;

const denunciaReporterOptions = [
  { label: "Todos os denunciantes", value: "all" },
  { label: "Paciente", value: "paciente" },
  { label: "Psicólogo", value: "psicologo" },
] satisfies Array<{ label: string; value: DenunciaFiltersFormValues["reporter"] }>;

const normalizeDenunciaFilters = (
  values: DenunciaFiltersFormValues,
): DenunciaFiltersFormValues => ({
  from: values.from,
  q: values.q.trim(),
  reason: values.reason.trim(),
  reporter: values.reporter,
  status: values.status,
  to: values.to,
});

const countActiveDenunciaFilters = (values: DenunciaFiltersFormValues) =>
  [
    values.q,
    values.from,
    values.to,
    values.reason,
    values.status !== "all" ? values.status : "",
    values.reporter !== "all" ? values.reporter : "",
  ].filter(Boolean).length;

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
    reason: normalized.reason || undefined,
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

const DenunciaFiltersBar = ({
  activeFilterCount,
  disabled,
  form,
  onClear,
  onSubmit,
}: {
  activeFilterCount: number;
  disabled: boolean;
  form: UseFormReturn<DenunciaFiltersFormValues>;
  onClear: () => void;
  onSubmit: (values: DenunciaFiltersFormValues) => void;
}) => (
  <div className="border-b border-border bg-surface/80 p-4">
    <FormProvider {...form}>
      <form
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.25fr)_repeat(5,minmax(150px,1fr))_auto]"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="md:col-span-2 xl:col-span-1">
          <InputController<DenunciaFiltersFormValues>
            disabled={disabled}
            label="Buscar"
            name="q"
            placeholder="Conteúdo, comunidade ou alvo"
          />
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
        <InputController<DenunciaFiltersFormValues>
          disabled={disabled}
          label="Motivo"
          name="reason"
          placeholder="Ex.: other"
        />
        <div className="flex flex-col gap-2 md:col-span-2 md:flex-row xl:col-span-1 xl:flex-col xl:justify-end">
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white shadow-admin-soft transition hover:bg-primary-hover disabled:opacity-60"
            disabled={disabled}
            type="submit"
          >
            <Filter aria-hidden className="h-4 w-4" />
            Filtrar
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground shadow-control transition hover:border-primary hover:text-primary disabled:opacity-60"
            disabled={disabled || activeFilterCount === 0}
            onClick={onClear}
            type="button"
          >
            <X aria-hidden className="h-4 w-4" />
            Limpar
          </button>
        </div>
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
    mode: "onSubmit",
    resolver: zodResolver(denunciaFiltersSchema),
  });
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
  const activeFilterCount = countActiveDenunciaFilters(appliedFilters);
  const submitFilters = (values: DenunciaFiltersFormValues) => {
    setAppliedFilters(normalizeDenunciaFilters(values));
    setPage(1);
  };
  const clearFilters = () => {
    filtersForm.reset(denunciaFilterDefaults);
    setAppliedFilters(denunciaFilterDefaults);
    setPage(1);
  };

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
        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-foreground">Pendências</h2>
            <p className="text-xs font-bold text-muted">
              {numberFormatter.format(query.data?.count ?? 0)} registro(s) real(is) nesta categoria
            </p>
          </div>
          {query.isFetching ? (
            <span className="inline-flex items-center gap-2 text-xs font-black text-muted">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Atualizando
            </span>
          ) : null}
        </div>
        {group === "denuncias" ? (
          <DenunciaFiltersBar
            activeFilterCount={activeFilterCount}
            disabled={query.isFetching}
            form={filtersForm}
            onClear={clearFilters}
            onSubmit={submitFilters}
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
            query.data?.data.map((alert) => <OperationalAlertCard alert={alert} key={alert.id} />)
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
