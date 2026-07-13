import { type FocusEvent, useState } from "react";

type DateRange = {
  from?: string;
  to?: string;
};

type DateRangeField = "from" | "to";

const DEFAULT_DATE_RANGE_ERROR =
  "Informe um período personalizado completo, com data inicial menor ou igual à final.";

const resolveInitialRange = <TRange extends DateRange>(
  initialRange: TRange | (() => TRange),
): TRange => (typeof initialRange === "function" ? initialRange() : initialRange);

export const useDateRangeCommitOnBlur = <TRange extends DateRange>({
  errorMessage = DEFAULT_DATE_RANGE_ERROR,
  initialRange,
  isValidRange,
  onApply,
}: {
  errorMessage?: string;
  initialRange: TRange | (() => TRange);
  isValidRange: (range: TRange) => boolean;
  onApply?: (range: TRange) => void;
}) => {
  const [initialResolvedRange] = useState(() => resolveInitialRange(initialRange));
  const [draftRange, setDraftRange] = useState<TRange>(initialResolvedRange);
  const [appliedRange, setAppliedRange] = useState<TRange>(initialResolvedRange);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const validDraftRange = isValidRange(draftRange);

  const applyRange = (nextRange: TRange) => {
    setRangeError(null);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
    onApply?.(nextRange);
  };

  const handleDateChange = (field: DateRangeField, value: string) => {
    setRangeError(null);
    setDraftRange((current) => ({ ...current, [field]: value }));
  };

  const commitDraftRange = () => {
    if (!isValidRange(draftRange)) {
      setRangeError(errorMessage);
      return false;
    }

    setRangeError(null);
    setAppliedRange(draftRange);
    onApply?.(draftRange);

    return true;
  };

  const handleDateControlsBlur = (event: FocusEvent<HTMLDivElement>) => {
    const currentTarget = event.currentTarget;
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (nextFocusedElement && currentTarget.contains(nextFocusedElement)) return;

    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (activeElement && currentTarget.contains(activeElement)) return;

      commitDraftRange();
    }, 0);
  };

  return {
    appliedRange,
    applyRange,
    commitDraftRange,
    draftRange,
    handleDateChange,
    handleDateControlsBlur,
    rangeError,
    validDraftRange,
  };
};
