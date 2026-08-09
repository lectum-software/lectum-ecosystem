"use client";

import { startOfCurrentWeek } from "@/lib/date-period";

export { startOfCurrentWeek };

import { CalendarDays, ChevronDown } from "lucide-react";
import { type FocusEvent, type ReactNode, useCallback, useMemo, useState } from "react";
import type { AdminPsychologistStatisticsQuery } from "@/api/req/psychologists";
import { cn } from "@/lib/utils";
import { CardShell, IconCircle } from "../components/shared";
import type {
  StatisticsCustomRange,
  StatisticsPeriodPreset,
  StatisticsPeriodValue,
} from "./config";
import {
  dateFormatter,
  dateOnlyFormatter,
  dayMonthFormatter,
  dayShortMonthFormatter,
  STATISTICS_PERIOD_OPTIONS,
} from "./config";

export const formatDate = (value?: string | null) => {
  if (!value) return "Não informado";

  return dateFormatter.format(new Date(value));
};

export const formatDateOnly = (value?: string | null) => {
  if (!value) return "Não informado";

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/)?.[0];
  if (isoDate) {
    return dateOnlyFormatter.format(new Date(`${isoDate}T00:00:00.000Z`));
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";

  return dateOnlyFormatter.format(date);
};

export const formatDayMonth = (value?: string | null) => {
  if (!value) return "00/00";

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/)?.[0];
  if (isoDate) {
    return dayMonthFormatter.format(new Date(`${isoDate}T00:00:00.000Z`));
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "00/00";

  return dayMonthFormatter.format(date);
};

export const formatDayShortMonth = (value?: string | null) => {
  if (!value) return "data indisponível";

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/)?.[0];
  if (isoDate) {
    return dayShortMonthFormatter.format(new Date(`${isoDate}T00:00:00.000Z`));
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "data indisponível";

  return dayShortMonthFormatter.format(date);
};

export const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const startOfCurrentMonth = () => {
  const date = new Date();
  date.setDate(1);

  return date;
};

export const startOfCurrentYear = () => new Date(new Date().getFullYear(), 0, 1);

const startOfLastDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));

  return date;
};

const dateInputValueFromString = (value?: string | null) => {
  if (!value) return toDateInputValue(new Date());

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? toDateInputValue(new Date()) : toDateInputValue(date);
};

export const getStatisticsRangeForPeriod = (
  period: StatisticsPeriodPreset,
  createdAt?: string | null,
): Required<StatisticsCustomRange> => {
  const today = toDateInputValue(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "7d") return { from: toDateInputValue(startOfLastDays(7)), to: today };
  if (period === "30d") return { from: toDateInputValue(startOfLastDays(30)), to: today };
  if (period === "90d") return { from: toDateInputValue(startOfLastDays(90)), to: today };
  if (period === "month") return { from: toDateInputValue(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toDateInputValue(startOfCurrentYear()), to: today };
  if (period === "all") return { from: dateInputValueFromString(createdAt), to: today };

  return { from: toDateInputValue(startOfCurrentWeek()), to: today };
};

const buildStatisticsPeriodQuery = (
  period: StatisticsPeriodValue,
  customRange: StatisticsCustomRange,
): AdminPsychologistStatisticsQuery =>
  period === "custom" ? { from: customRange.from, period, to: customRange.to } : { period };

const statisticsDateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export const isValidStatisticsRange = (range: StatisticsCustomRange) => {
  if (!range.from || !range.to) return false;

  return statisticsDateFromInput(range.from) <= statisticsDateFromInput(range.to);
};

const STATISTICS_CUSTOM_RANGE_ERROR =
  "Informe um período personalizado completo, com data inicial menor ou igual à final.";

export const useStatisticsPeriodFilter = (createdAt?: string | null) => {
  const [selectedPeriod, setSelectedPeriod] = useState<StatisticsPeriodValue>("all");
  const [appliedPeriod, setAppliedPeriod] = useState<StatisticsPeriodValue>("all");
  const [draftRange, setDraftRange] = useState<StatisticsCustomRange>(() =>
    getStatisticsRangeForPeriod("all", createdAt),
  );
  const [appliedRange, setAppliedRange] = useState<StatisticsCustomRange>(() =>
    getStatisticsRangeForPeriod("all", createdAt),
  );
  const [rangeError, setRangeError] = useState<string | null>(null);
  const periodQuery = useMemo(
    () => buildStatisticsPeriodQuery(appliedPeriod, appliedRange),
    [appliedPeriod, appliedRange],
  );
  const handlePeriodChange = useCallback(
    (period: StatisticsPeriodPreset) => {
      const nextRange = getStatisticsRangeForPeriod(period, createdAt);
      setRangeError(null);
      setSelectedPeriod(period);
      setAppliedPeriod(period);
      setDraftRange(nextRange);
      setAppliedRange(nextRange);
    },
    [createdAt],
  );
  const handleDateChange = useCallback((field: keyof StatisticsCustomRange, value: string) => {
    setRangeError(null);
    setSelectedPeriod("custom");
    setDraftRange((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);
  const commitRange = useCallback(() => {
    if (selectedPeriod !== "custom") return;

    if (!isValidStatisticsRange(draftRange)) {
      setRangeError(STATISTICS_CUSTOM_RANGE_ERROR);
      return;
    }

    setRangeError(null);
    setAppliedPeriod("custom");
    setAppliedRange(draftRange);
  }, [draftRange, selectedPeriod]);
  const handleDateControlsBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const currentTarget = event.currentTarget;
      const nextFocusedElement = event.relatedTarget as Node | null;

      if (nextFocusedElement && currentTarget.contains(nextFocusedElement)) return;

      window.setTimeout(() => {
        const activeElement = document.activeElement;

        if (activeElement && currentTarget.contains(activeElement)) return;

        commitRange();
      }, 0);
    },
    [commitRange],
  );

  return {
    draftRange,
    handleDateChange,
    handleDateControlsBlur,
    handlePeriodChange,
    periodQuery,
    rangeError,
    selectedPeriod,
  };
};

type StatisticsPeriodControlsProps = {
  className?: string;
  idPrefix: string;
  leadingControl?: ReactNode;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onDateChange: (field: keyof StatisticsCustomRange, value: string) => void;
  onPeriodChange: (period: StatisticsPeriodPreset) => void;
  period: StatisticsPeriodValue;
  range: StatisticsCustomRange;
  rangeError: string | null;
};

const StatisticsPeriodControls = ({
  className,
  idPrefix,
  leadingControl,
  onDateControlsBlur,
  onDateChange,
  onPeriodChange,
  period,
  range,
  rangeError,
}: StatisticsPeriodControlsProps) => (
  <div className={cn("w-full lg:w-[min(720px,52vw)]", className)} onBlur={onDateControlsBlur}>
    <div className={cn("grid gap-2 sm:grid-cols-3", leadingControl && "lg:grid-cols-4")}>
      {leadingControl}
      <label className="block text-xs font-black text-muted" htmlFor={`${idPrefix}-period`}>
        Período
        <span className="relative mt-2 block">
          <select
            className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id={`${idPrefix}-period`}
            onChange={(event) => onPeriodChange(event.target.value as StatisticsPeriodPreset)}
            value={period}
          >
            {period === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            {STATISTICS_PERIOD_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
          />
        </span>
      </label>

      <label className="block text-xs font-black text-muted" htmlFor={`${idPrefix}-from`}>
        De
        <input
          className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          id={`${idPrefix}-from`}
          onChange={(event) => onDateChange("from", event.target.value)}
          type="date"
          value={range.from ?? ""}
        />
      </label>
      <label className="block text-xs font-black text-muted" htmlFor={`${idPrefix}-to`}>
        Até
        <input
          className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          id={`${idPrefix}-to`}
          onChange={(event) => onDateChange("to", event.target.value)}
          type="date"
          value={range.to ?? ""}
        />
      </label>
    </div>
    {rangeError ? (
      <p className="mt-2 max-w-md text-xs font-bold text-danger">{rangeError}</p>
    ) : null}
  </div>
);

export const StatisticsGlobalPeriodCard = (
  props: Omit<StatisticsPeriodControlsProps, "className">,
) => (
  <CardShell className="min-w-0 max-w-full overflow-x-clip p-5">
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
      <div className="flex min-w-0 gap-3">
        <IconCircle icon={CalendarDays} />
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground">
            Per&iacute;odo das estat&iacute;sticas
          </h2>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">
            Selecione o per&iacute;odo de an&aacute;lise.
          </p>
        </div>
      </div>
      <StatisticsPeriodControls
        className="lg:w-[min(620px,44vw)] xl:w-[min(680px,44vw)]"
        {...props}
      />
    </div>
  </CardShell>
);
