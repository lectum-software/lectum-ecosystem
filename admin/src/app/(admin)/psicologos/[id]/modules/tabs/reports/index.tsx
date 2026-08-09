"use client";

import { AlertTriangle, ChevronDown } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useAdminPsychologistReports } from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPsychologistReportItem,
  AdminPsychologistReportsQuery,
} from "@/api/req/psychologists";
import { cn } from "@/lib/utils";
import { CardShell, ErrorState, IconCircle } from "../../components/shared";
import { numberFormatter } from "../../support/config";
import { PublicationsPagination } from "../publications/index";
import { EngagementLoadingState } from "../statistics/common";
import { PsychologistReportListItem, ReportModerationDialog } from "./dialog";
import type {
  ReportDateRange,
  ReportModerationState,
  ReportPeriodPreset,
  ReportPeriodValue,
} from "./support";
import {
  getReportRangeForPeriod,
  isValidReportRange,
  REPORT_PERIOD_OPTIONS,
  reportCardIcon,
} from "./support";

export const DetailFilterSelect = ({
  children,
  className,
  label,
  onChange,
  value,
}: {
  children: ReactNode;
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

export const ReportsTab = ({ id }: { id: string }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriodValue>("all");
  const [appliedRange, setAppliedRange] = useState<ReportDateRange>(() =>
    getReportRangeForPeriod("all"),
  );
  const [draftRange, setDraftRange] = useState<ReportDateRange>(() =>
    getReportRangeForPeriod("all"),
  );
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [type, setType] = useState<AdminPsychologistReportsQuery["type"]>("all");
  const [status, setStatus] = useState<AdminPsychologistReportsQuery["status"]>("all");
  const [page, setPage] = useState(1);
  const [moderationState, setModerationState] = useState<ReportModerationState>(null);
  const queryInput = useMemo<AdminPsychologistReportsQuery>(
    () => ({
      ...appliedRange,
      limit: 5,
      page,
      status,
      type,
    }),
    [appliedRange, page, status, type],
  );
  const query = useAdminPsychologistReports(id, queryInput);
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

  if (query.isLoading) return <EngagementLoadingState rows={2} />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const reports = query.data;

  return (
    <div className="space-y-5" data-psychologist-detail-tab="denuncias">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reports.cards.map((card) => {
          const Icon = reportCardIcon[card.id === "total" ? "total" : card.id] ?? AlertTriangle;

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
              setType(nextValue as AdminPsychologistReportsQuery["type"]);
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
              setStatus(nextValue as AdminPsychologistReportsQuery["status"]);
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
          reports.data.map((item: AdminPsychologistReportItem) => (
            <PsychologistReportListItem
              key={item.id}
              onResolve={setModerationState}
              report={item}
            />
          ))
        )}

        <CardShell className="p-4">
          <PublicationsPagination page={reports.page} pages={reports.pages} setPage={setPage} />
        </CardShell>
      </section>

      {moderationState ? (
        <ReportModerationDialog
          id={id}
          onClose={() => setModerationState(null)}
          state={moderationState}
        />
      ) : null}
    </div>
  );
};
