const FINANCE_OPERATIONAL_CODE_SIZE = 5;

const hasFinanceInternalId = (internalId?: number | null) =>
  Number.isSafeInteger(internalId) && Number(internalId) > 0;

const formatFinanceOperationalCode = (prefix: "A" | "C", internalId: number) =>
  `${prefix}${String(internalId).padStart(FINANCE_OPERATIONAL_CODE_SIZE, "0")}`;

export const formatFinanceChargeCode = (internalId?: number | null) =>
  hasFinanceInternalId(internalId) ? formatFinanceOperationalCode("C", Number(internalId)) : "—";

export const formatFinanceSubscriptionCode = (internalId?: number | null) =>
  hasFinanceInternalId(internalId) ? formatFinanceOperationalCode("A", Number(internalId)) : "—";
