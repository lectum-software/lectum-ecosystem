"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useAdminModerationOperationalAlerts } from "@/api/callers/moderation";
import { resolveApiError } from "@/api/handle";
import type {
  AdminModerationOperationalAlertsGroup,
  AdminModerationOperationalAlertsQuery,
} from "@/api/req/moderation";
import {
  ComplianceAlertsTable,
  OperationalAlertCard,
} from "./operational/components/compliance-alerts";
import {
  DenunciaFiltersBar,
  OperationalCategoryFiltersBar,
} from "./operational/components/filters";
import { OperationalAlertsTable } from "./operational/components/operational-alerts";
import {
  HeaderPendingCount,
  type ReportModerationState,
} from "./operational/components/report-common";
import {
  ModerationReportListItem,
  ReportModerationDialog,
} from "./operational/components/report-dialogs";
import {
  areDenunciaFiltersEqual,
  areOperationalCategoryFiltersEqual,
  cardClass,
  coerceDenunciaFilters,
  coerceOperationalCategoryFilters,
  type DenunciaFiltersFormValues,
  denunciaFilterDefaults,
  denunciaFiltersSchema,
  groupConfig,
  normalizeDenunciaFilters,
  normalizeOperationalCategoryFilters,
  type OperationalCategoryFiltersFormValues,
  operationalCategoryFilterDefaults,
  operationalCategoryFiltersSchema,
  PAGE_LIMIT,
  SKELETON_KEYS,
  toOperationalAlertsFilterQuery,
  toOperationalCategoryFilterQuery,
} from "./operational/modules/report-support";

export const AdminModerationOperationalCategoryClient = ({
  group,
}: {
  group: Exclude<AdminModerationOperationalAlertsGroup, "all">;
}) => {
  const [page, setPage] = useState(1);
  const [moderationState, setModerationState] = useState<ReportModerationState>(null);
  const [appliedFilters, setAppliedFilters] =
    useState<DenunciaFiltersFormValues>(denunciaFilterDefaults);
  const [appliedCategoryFilters, setAppliedCategoryFilters] =
    useState<OperationalCategoryFiltersFormValues>(operationalCategoryFilterDefaults);
  const filtersForm = useForm<DenunciaFiltersFormValues>({
    defaultValues: denunciaFilterDefaults,
    mode: "onChange",
    resolver: zodResolver(denunciaFiltersSchema),
  });
  const categoryFiltersForm = useForm<OperationalCategoryFiltersFormValues>({
    defaultValues: operationalCategoryFilterDefaults,
    mode: "onChange",
    resolver: zodResolver(operationalCategoryFiltersSchema),
  });
  const watchedAutoFilters = useWatch({
    control: filtersForm.control,
    name: ["contentType", "reason", "reporter", "status"],
  });
  const watchedCategoryAutoFilters = useWatch({
    control: categoryFiltersForm.control,
    name: ["alertType", "plan", "profileStatus", "userRole"],
  });
  const watchedAutoFiltersKey = watchedAutoFilters.join("|");
  const watchedCategoryAutoFiltersKey = watchedCategoryAutoFilters.join("|");
  const latestAppliedFiltersRef = useRef(appliedFilters);
  const latestAppliedCategoryFiltersRef = useRef(appliedCategoryFilters);
  const queryInput = useMemo<AdminModerationOperationalAlertsQuery>(
    () => ({
      group,
      limit: PAGE_LIMIT,
      page,
      ...(group === "denuncias"
        ? toOperationalAlertsFilterQuery(appliedFilters)
        : toOperationalCategoryFilterQuery(appliedCategoryFilters, group)),
    }),
    [appliedCategoryFilters, appliedFilters, group, page],
  );
  const query = useAdminModerationOperationalAlerts(queryInput);
  const config = groupConfig[group];

  useEffect(() => {
    latestAppliedFiltersRef.current = appliedFilters;
  }, [appliedFilters]);

  useEffect(() => {
    latestAppliedCategoryFiltersRef.current = appliedCategoryFilters;
  }, [appliedCategoryFilters]);

  const applyCurrentDenunciaFilters = useCallback(
    async ({ includeDateDraft = false }: { includeDateDraft?: boolean } = {}) => {
      if (group !== "denuncias") return;

      if (includeDateDraft) {
        const validDates = await filtersForm.trigger(["from", "to"], { shouldFocus: false });
        if (!validDates) return;
      }

      const current = normalizeDenunciaFilters(coerceDenunciaFilters(filtersForm.getValues()));
      const normalized = includeDateDraft
        ? current
        : {
            ...current,
            from: latestAppliedFiltersRef.current.from,
            to: latestAppliedFiltersRef.current.to,
          };

      if (areDenunciaFiltersEqual(latestAppliedFiltersRef.current, normalized)) return;

      setAppliedFilters(normalized);
      setPage(1);
    },
    [filtersForm, group],
  );

  const applyCurrentOperationalCategoryFilters = useCallback(
    async ({ includeDateDraft = false }: { includeDateDraft?: boolean } = {}) => {
      if (group === "denuncias") return;

      if (includeDateDraft) {
        const validDates = await categoryFiltersForm.trigger(["from", "to"], {
          shouldFocus: false,
        });
        if (!validDates) return;
      }

      const current = normalizeOperationalCategoryFilters(
        coerceOperationalCategoryFilters(categoryFiltersForm.getValues()),
      );
      const normalized = includeDateDraft
        ? current
        : {
            ...current,
            from: latestAppliedCategoryFiltersRef.current.from,
            to: latestAppliedCategoryFiltersRef.current.to,
          };

      if (areOperationalCategoryFiltersEqual(latestAppliedCategoryFiltersRef.current, normalized)) {
        return;
      }

      setAppliedCategoryFilters(normalized);
      setPage(1);
    },
    [categoryFiltersForm, group],
  );

  const handleDenunciaDateBlur = useCallback(() => {
    void applyCurrentDenunciaFilters({ includeDateDraft: true });
  }, [applyCurrentDenunciaFilters]);

  const handleOperationalCategoryDateBlur = useCallback(() => {
    void applyCurrentOperationalCategoryFilters({ includeDateDraft: true });
  }, [applyCurrentOperationalCategoryFilters]);

  useEffect(() => {
    if (group !== "denuncias") return;
    void watchedAutoFiltersKey;

    const timeout = window.setTimeout(() => {
      void applyCurrentDenunciaFilters();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [applyCurrentDenunciaFilters, group, watchedAutoFiltersKey]);

  useEffect(() => {
    if (group === "denuncias") return;
    void watchedCategoryAutoFiltersKey;

    const timeout = window.setTimeout(() => {
      void applyCurrentOperationalCategoryFilters();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [applyCurrentOperationalCategoryFilters, group, watchedCategoryAutoFiltersKey]);

  const headerPendingCount = (() => {
    if (group === "denuncias") return query.data?.counts.pending_reports;
    if (group === "compliance") return query.data?.counts.compliance_total;

    return query.data?.counts.operational_total;
  })();

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <div className="p-5 md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
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
            <div className="flex shrink-0 justify-start xl:justify-end">
              <HeaderPendingCount count={headerPendingCount} loading={query.isFetching} />
            </div>
          </div>
        </div>
      </section>

      {query.error ? (
        <section className={`${cardClass} p-5`}>
          <div className="flex gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger-soft text-danger">
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
          <OperationalCategoryFiltersBar
            disabled={query.isLoading}
            form={categoryFiltersForm}
            group={group}
            isFetching={query.isFetching}
            onDateBlur={handleOperationalCategoryDateBlur}
            resultCount={query.data?.count ?? 0}
          />
        ) : null}
        {group === "denuncias" ? (
          <DenunciaFiltersBar
            disabled={query.isLoading}
            form={filtersForm}
            isFetching={query.isFetching}
            onDateBlur={handleDenunciaDateBlur}
            resultCount={query.data?.count ?? 0}
          />
        ) : null}
        {query.isLoading ? (
          <div className="grid gap-3 p-4">
            {SKELETON_KEYS.map((key) => (
              <div className="h-36 animate-pulse rounded-2xl bg-surface-muted" key={key} />
            ))}
          </div>
        ) : (query.data?.data.length ?? 0) === 0 ? (
          <div className="p-4">
            <div className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-muted">
              {config.emptyLabel}
            </div>
          </div>
        ) : group === "compliance" ? (
          <ComplianceAlertsTable alerts={query.data?.data ?? []} />
        ) : group === "operacional" ? (
          <OperationalAlertsTable alerts={query.data?.data ?? []} />
        ) : (
          <div className="grid gap-3 p-4">
            {query.data?.data.map((alert) =>
              alert.report ? (
                <ModerationReportListItem
                  alert={alert}
                  key={alert.id}
                  onResolve={setModerationState}
                />
              ) : (
                <OperationalAlertCard alert={alert} key={alert.id} />
              ),
            )}
          </div>
        )}
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

      {moderationState ? (
        <ReportModerationDialog onClose={() => setModerationState(null)} state={moderationState} />
      ) : null}
    </div>
  );
};
