"use client";

import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import type {
  AdminModerationDecision,
  AdminModerationSeverity,
  AdminModerationStatus,
} from "@/api/req/moderation";
import { InputController, SelectController } from "@/components/controllers";
import {
  moderationCategoryLabel,
  moderationDecisionLabel,
  moderationSeverityLabel,
  moderationStatusLabel,
} from "@/lib/moderation-copy";
import { cn } from "@/lib/utils";
import {
  cardClass,
  decisionCopy,
  decisionFilterOptions,
  type Filters,
  numberFormatter,
  severityCopy,
  statusCopy,
  statusFilterOptions,
} from "../modules/moderation-support";

export const Card = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <section className={cn(cardClass, className)}>{children}</section>
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

export const Header = ({
  backHref,
  description = "Análise global de denúncias, compliance e alertas operacionais da plataforma.",
  eyebrow = "Moderação",
  pendingCount,
  pendingCountLoading = false,
  title = "Dashboard da moderação",
}: {
  backHref?: string;
  description?: string;
  eyebrow?: string;
  pendingCount?: number | null;
  pendingCountLoading?: boolean;
  title?: string;
}) => (
  <Card className="p-5 md:p-6">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted md:text-base">
          {description}
        </p>
      </div>
      {backHref || pendingCount !== undefined || pendingCountLoading ? (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:items-start xl:justify-end">
          {pendingCount !== undefined || pendingCountLoading ? (
            <HeaderPendingCount count={pendingCount} loading={pendingCountLoading} />
          ) : null}
          {backHref ? (
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-control transition hover:border-border-strong hover:text-primary"
              href={backHref}
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
              Voltar
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  </Card>
);

export const Pill = ({ className, children }: { className?: string; children: ReactNode }) => (
  <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black", className)}>
    {children}
  </span>
);

export const Decision = ({ value }: { value: AdminModerationDecision }) => (
  <Pill className={decisionCopy[value]?.className}>{moderationDecisionLabel(value)}</Pill>
);

export const Status = ({ value }: { value: AdminModerationStatus }) => (
  <Pill className={statusCopy[value]?.className}>{moderationStatusLabel(value)}</Pill>
);

export const Severity = ({ value }: { value: AdminModerationSeverity }) => (
  <Pill className={severityCopy[value]?.className}>{moderationSeverityLabel(value)}</Pill>
);

export const Categories = ({ items }: { items: string[] }) => (
  <div className="flex flex-wrap gap-2">
    {(items.length ? items : ["other"]).map((item) => (
      <span
        className="rounded-full bg-primary-soft px-2.5 py-1 text-[0.68rem] font-black text-primary"
        key={item}
      >
        {moderationCategoryLabel(item)}
      </span>
    ))}
  </div>
);

export const FiltersBar = ({
  communitiesLoading,
  communityOptions,
  disabled,
  form,
  isFetching,
  onDateBlur,
  resultCount,
}: {
  communitiesLoading: boolean;
  communityOptions: Array<{ label: string; value: string }>;
  disabled: boolean;
  form: UseFormReturn<Filters>;
  isFetching: boolean;
  onDateBlur: () => void;
  resultCount: number;
}) => (
  <div className="border-b border-border bg-surface/80 p-4">
    <FormProvider {...form}>
      <form
        className="grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(180px,0.9fr)_minmax(150px,0.75fr)_minmax(150px,0.75fr)_minmax(180px,0.9fr)_minmax(240px,1.2fr)]"
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="md:col-span-2 2xl:col-span-1">
          <SelectController<Filters>
            disabled={disabled}
            label="Status"
            name="status"
            options={statusFilterOptions}
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
        <InputController<Filters>
          disabled={disabled}
          label="De"
          name="from"
          onBlur={onDateBlur}
          type="date"
        />
        <InputController<Filters>
          disabled={disabled}
          label="Até"
          name="to"
          onBlur={onDateBlur}
          type="date"
        />
        <SelectController<Filters>
          disabled={disabled}
          label="Decisão"
          name="decision"
          options={decisionFilterOptions}
        />
        <SelectController<Filters>
          disabled={disabled || communitiesLoading}
          label="Comunidade"
          name="community"
          options={communityOptions}
        />
      </form>
    </FormProvider>
  </div>
);
