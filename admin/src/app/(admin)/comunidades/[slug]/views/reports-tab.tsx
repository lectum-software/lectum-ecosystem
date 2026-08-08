"use client";
import { useMemo, useState } from "react";
import { useAdminCommunityReports } from "@/api/callers/communities";
import type { AdminCommunityReportItem, AdminCommunityReportsQuery } from "@/api/req/communities";
import { cn } from "@/lib/utils";
import { PaginationControls, QueryStatus } from "../components/content-controls";

import {
  CommunityReportFilterSelect,
  type CommunityReportFilterType,
  CommunityReportListItem,
  CommunityReportMetricCard,
  CommunityReportResolveDialog,
  type CommunityReportResolveState,
  communityReportStatusFallback,
  communityReportTypeFallback,
  emptyCommunityReportCards,
} from "../components/report-cards";
import {
  cardClass,
  getReportRangeForPeriod,
  isValidReportRange,
  numberFormatter,
  type ReportDateRange,
  type ReportPeriodPreset,
  type ReportPeriodValue,
  reportPeriodOptions,
} from "../modules/detail-support";

export const ReportsTab = ({ slug }: { slug: string }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriodValue>("all");
  const [appliedRange, setAppliedRange] = useState<ReportDateRange>(() =>
    getReportRangeForPeriod("all"),
  );
  const [draftRange, setDraftRange] = useState<ReportDateRange>(() =>
    getReportRangeForPeriod("all"),
  );
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [type, setType] = useState<CommunityReportFilterType>("all");
  const [status, setStatus] = useState<AdminCommunityReportsQuery["status"]>("all");
  const [page, setPage] = useState(1);
  const [resolveState, setResolveState] = useState<CommunityReportResolveState>(null);
  const queryInput = useMemo<AdminCommunityReportsQuery>(
    () => ({
      ...appliedRange,
      limit: 10,
      page,
      status,
      type,
    }),
    [appliedRange, page, status, type],
  );
  const result = useAdminCommunityReports(slug, queryInput);
  const reportCards = result.data?.cards ?? emptyCommunityReportCards;
  const reportItems = result.data?.data ?? [];
  const typeOptions = result.data?.filters.types ?? communityReportTypeFallback;
  const statusOptions = result.data?.filters.statuses ?? communityReportStatusFallback;

  const handlePeriodChange = (value: ReportPeriodPreset) => {
    const nextRange = getReportRangeForPeriod(value);

    setRangeError(null);
    setSelectedPeriod(value);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
    setPage(1);
  };
  const handleDateChange = (field: keyof ReportDateRange, value: string) => {
    setRangeError(null);
    setSelectedPeriod("custom");
    setDraftRange((current) => ({ ...current, [field]: value }));
  };
  const commitRange = () => {
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
  const handleDateControlsBlur = (event: {
    currentTarget: HTMLDivElement;
    relatedTarget: EventTarget | null;
  }) => {
    const currentTarget = event.currentTarget;
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (nextFocusedElement && currentTarget.contains(nextFocusedElement)) return;

    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (activeElement && currentTarget.contains(activeElement)) return;

      commitRange();
    }, 0);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reportCards.map((card) => (
          <CommunityReportMetricCard card={card} key={card.id} />
        ))}
      </div>

      <section className={cn(cardClass, "p-4")}>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_2fr] lg:items-end">
          <CommunityReportFilterSelect
            label="Tipo"
            onChange={(value) => {
              setType(value as CommunityReportFilterType);
              setPage(1);
            }}
            value={type}
          >
            {typeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({numberFormatter.format(option.count)})
              </option>
            ))}
          </CommunityReportFilterSelect>
          <CommunityReportFilterSelect
            label="Status"
            onChange={(value) => {
              setStatus(value as AdminCommunityReportsQuery["status"]);
              setPage(1);
            }}
            value={status ?? "all"}
          >
            {statusOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({numberFormatter.format(option.count)})
              </option>
            ))}
          </CommunityReportFilterSelect>
          <CommunityReportFilterSelect
            label="Período"
            onChange={(value) => handlePeriodChange(value as ReportPeriodPreset)}
            value={selectedPeriod}
          >
            {selectedPeriod === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            {reportPeriodOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </CommunityReportFilterSelect>
          <div className="grid gap-3 sm:grid-cols-2" onBlur={handleDateControlsBlur}>
            <label className="block text-sm font-black text-muted">
              De
              <input
                className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
                max={draftRange.to || undefined}
                onChange={(event) => handleDateChange("from", event.target.value)}
                type="date"
                value={draftRange.from ?? ""}
              />
            </label>
            <label className="block text-sm font-black text-muted">
              Até
              <input
                className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
                min={draftRange.from || undefined}
                onChange={(event) => handleDateChange("to", event.target.value)}
                type="date"
                value={draftRange.to ?? ""}
              />
            </label>
          </div>
        </div>
        {rangeError ? <p className="mt-3 text-xs font-bold text-danger">{rangeError}</p> : null}
      </section>

      <section className="space-y-4" aria-label="Denúncias da comunidade">
        <QueryStatus
          error={result.error}
          loading={result.isLoading}
          onRetry={() => void result.refetch()}
        />

        {reportItems.length === 0 && !result.isLoading ? (
          <div className={cn(cardClass, "p-6 text-sm font-bold text-muted")}>
            Nenhuma denúncia encontrada para os filtros atuais.
          </div>
        ) : null}

        {reportItems.length > 0 ? (
          <div className="space-y-4">
            {reportItems.map((report: AdminCommunityReportItem) => (
              <CommunityReportListItem
                key={report.id}
                report={report}
                setResolveState={setResolveState}
                slug={slug}
              />
            ))}
          </div>
        ) : null}

        {result.data ? (
          <div className={cn(cardClass, "p-4")}>
            <PaginationControls
              page={result.data.page}
              pages={result.data.pages}
              setPage={setPage}
            />
          </div>
        ) : null}
      </section>

      {resolveState ? (
        <CommunityReportResolveDialog
          onClose={() => setResolveState(null)}
          slug={slug}
          state={resolveState}
        />
      ) : null}
    </div>
  );
};
