"use client";

import { useState } from "react";
import type { CommunitiesDashboardQuery } from "@/api/req/communities";
import { useDateRangeCommitOnBlur } from "@/hooks/use-date-range-commit-on-blur";
import {
  buildCommunityDashboardPeriodQuery,
  getCommunityDashboardRangeForPeriod,
} from "./period-support";
import { isValidCustomRange } from "./statistics-builders";
import type {
  CommunityDashboardPeriodPreset,
  CommunityDashboardPeriodValue,
} from "./statistics-config";

export const useCommunityDashboardPeriod = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<CommunityDashboardPeriodValue>("all");
  const [appliedPeriod, setAppliedPeriod] = useState<CommunityDashboardPeriodValue>("all");
  const {
    appliedRange,
    applyRange,
    draftRange,
    handleDateChange: handleDraftDateChange,
    handleDateControlsBlur,
    rangeError,
    commitDraftRange,
  } = useDateRangeCommitOnBlur<CommunitiesDashboardQuery>({
    errorMessage:
      "Informe um período personalizado completo, com data inicial menor ou igual à final.",
    initialRange: () => getCommunityDashboardRangeForPeriod("all"),
    isValidRange: isValidCustomRange,
    onApply: () => setAppliedPeriod(selectedPeriod),
  });
  const validRange = appliedPeriod === "custom" ? isValidCustomRange(appliedRange) : true;
  const queryInput = buildCommunityDashboardPeriodQuery(appliedPeriod, appliedRange);
  const handlePeriodChange = (nextPeriod: CommunityDashboardPeriodPreset) => {
    applyRange(getCommunityDashboardRangeForPeriod(nextPeriod));
    setSelectedPeriod(nextPeriod);
    // applyRange notifies onApply; the explicit preset must win that same batch.
    setAppliedPeriod(nextPeriod);
  };
  const handleDateChange = (field: "from" | "to", value: string) => {
    setSelectedPeriod("custom");
    handleDraftDateChange(field, value);
  };

  return {
    appliedPeriod,
    commitDraftRange,
    queryInput,
    validRange,
    periodControls: {
      displayRange: draftRange,
      onDateChange: handleDateChange,
      onDateControlsBlur: handleDateControlsBlur,
      onPeriodChange: handlePeriodChange,
      period: selectedPeriod,
      rangeError,
    },
  };
};
