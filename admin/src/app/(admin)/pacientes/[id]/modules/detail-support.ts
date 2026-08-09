"use client";

import { startOfCurrentWeek } from "@/lib/date-period";

export { startOfCurrentWeek };

import { type FocusEvent, useCallback, useMemo, useState } from "react";
import type { PatientsDetailQuery } from "@/api/req/patients";
import { isAdminApiMediaUrl, isAdminPublicMediaUrl, renderableImageSrc } from "@/lib/admin-media";

import {
  PATIENT_DETAIL_TABS,
  PATIENT_GENDER_OPTIONS,
  type PatientDetailTab,
  type PatientStatisticsCustomRange,
  type PatientStatisticsPeriodPreset,
  type PatientStatisticsPeriodValue,
} from "./detail-config";

export const formatDateTime = (value?: string | null) => {
  if (!value) return "N\u00e3o informado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N\u00e3o informado";

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
};

export const formatLastAccess = (value?: string | null) => {
  if (!value) return "N\u00e3o capturado";

  return formatDateTime(value);
};

export const formatPlatformDuration = (value: number | null) => {
  if (typeof value !== "number") return "Indisponível";

  const seconds = Math.round(value);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (minutes <= 0) return `${remainder}s`;
  if (remainder === 0) return `${minutes}min`;

  return `${minutes}min ${remainder}s`;
};

export const formatDayMonth = (value?: string | null) => {
  if (!value) return "período anterior";

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/)?.[0];
  const date = new Date(isoDate ? `${isoDate}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) return "período anterior";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(date);
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

export const startOfLastDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));

  return date;
};

export const dateInputValueFromString = (value?: string | null) => {
  if (!value) return toDateInputValue(new Date());

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? toDateInputValue(new Date()) : toDateInputValue(date);
};

export const getPatientStatisticsRangeForPeriod = (
  period: PatientStatisticsPeriodPreset,
  createdAt?: string | null,
): Required<PatientStatisticsCustomRange> => {
  const today = toDateInputValue(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "week") return { from: toDateInputValue(startOfCurrentWeek()), to: today };
  if (period === "month") return { from: toDateInputValue(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toDateInputValue(startOfCurrentYear()), to: today };
  if (period === "7d") return { from: toDateInputValue(startOfLastDays(7)), to: today };
  if (period === "30d") return { from: toDateInputValue(startOfLastDays(30)), to: today };
  if (period === "90d") return { from: toDateInputValue(startOfLastDays(90)), to: today };

  return { from: dateInputValueFromString(createdAt), to: today };
};

export const buildPatientStatisticsPeriodQuery = (
  period: PatientStatisticsPeriodValue,
  customRange: PatientStatisticsCustomRange,
): PatientsDetailQuery =>
  period === "custom" ? { from: customRange.from, period, to: customRange.to } : { period };

export const patientStatisticsDateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export const isValidPatientStatisticsRange = (range: PatientStatisticsCustomRange) => {
  if (!range.from || !range.to) return false;

  return patientStatisticsDateFromInput(range.from) <= patientStatisticsDateFromInput(range.to);
};

export const PATIENT_STATISTICS_CUSTOM_RANGE_ERROR =
  "Informe um período personalizado completo, com data inicial menor ou igual à final.";

export const usePatientStatisticsPeriodFilter = (createdAt?: string | null) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PatientStatisticsPeriodValue>("all");
  const [appliedPeriod, setAppliedPeriod] = useState<PatientStatisticsPeriodValue>("all");
  const [draftRange, setDraftRange] = useState<PatientStatisticsCustomRange>(() =>
    getPatientStatisticsRangeForPeriod("all", createdAt),
  );
  const [appliedRange, setAppliedRange] = useState<PatientStatisticsCustomRange>(() =>
    getPatientStatisticsRangeForPeriod("all", createdAt),
  );
  const [rangeError, setRangeError] = useState<string | null>(null);
  const periodQuery = useMemo(
    () => buildPatientStatisticsPeriodQuery(appliedPeriod, appliedRange),
    [appliedPeriod, appliedRange],
  );
  const handlePeriodChange = useCallback(
    (period: PatientStatisticsPeriodPreset) => {
      const nextRange = getPatientStatisticsRangeForPeriod(period, createdAt);

      setRangeError(null);
      setSelectedPeriod(period);
      setAppliedPeriod(period);
      setDraftRange(nextRange);
      setAppliedRange(nextRange);
    },
    [createdAt],
  );
  const handleDateChange = useCallback(
    (field: keyof PatientStatisticsCustomRange, value: string) => {
      setRangeError(null);
      setSelectedPeriod("custom");
      setDraftRange((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [],
  );
  const commitRange = useCallback(() => {
    if (selectedPeriod !== "custom") return;

    if (!isValidPatientStatisticsRange(draftRange)) {
      setRangeError(PATIENT_STATISTICS_CUSTOM_RANGE_ERROR);
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

export const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
};

export const safeAvatarSrc = (src: string | null) => renderableImageSrc(src);

export const isApiMediaSrc = (src: string | null) => isAdminApiMediaUrl(src);

export const isPublicAdminMediaSrc = (src: string) => isAdminPublicMediaUrl(src);

export const initialsFromName = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "PA";

export const isPatientDetailTab = (value: string | null): value is PatientDetailTab =>
  PATIENT_DETAIL_TABS.some((tab) => tab.id === value);

export const patientTabHref = (id: string, tab: PatientDetailTab) =>
  tab === "geral" ? `/pacientes/${id}` : `/pacientes/${id}?tab=${tab}`;

export const formatNullable = (value: string | null | undefined) => {
  const normalized = String(value ?? "").trim();
  return normalized || "N\u00e3o informado";
};

export const emptyToNull = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || null;
};

export const capitalizeOptionLabel = (value?: string | number | null) => {
  const formatted = formatNullable(value === undefined || value === null ? null : String(value));
  if (formatted === "N\u00e3o informado") return formatted;

  return formatted.replace(/^(\s*)(\p{L})/u, (_, spaces: string, letter: string) => {
    return `${spaces}${letter.toLocaleUpperCase("pt-BR")}`;
  });
};

export const mergeCurrentOption = (
  options: readonly { label: string; value: string }[],
  currentValue?: string | null,
) => {
  const normalized = String(currentValue ?? "").trim();
  if (!normalized || options.some((option) => option.value === normalized)) return [...options];
  const [firstOption, ...restOptions] = options;
  if (!firstOption) {
    return [{ label: `${capitalizeOptionLabel(normalized)} (valor atual)`, value: normalized }];
  }

  return [
    firstOption,
    { label: `${capitalizeOptionLabel(normalized)} (valor atual)`, value: normalized },
    ...restOptions,
  ];
};

export const getStaticOptionLabel = (
  options: readonly { label: string; value: string }[],
  value?: string | null,
) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "N\u00e3o informado";

  return (
    options.find((option) => option.value === normalized)?.label ??
    capitalizeOptionLabel(normalized)
  );
};

export const formatPatientGender = (value?: string | null) =>
  getStaticOptionLabel(PATIENT_GENDER_OPTIONS, value);
