const FINANCE_OPERATIONAL_CODE_SIZE = 5;

const formatFinanceOperationalCode = (prefix: "A" | "C", internalId: number) =>
  `${prefix}${String(internalId).padStart(FINANCE_OPERATIONAL_CODE_SIZE, "0")}`;

export const formatFinanceChargeCode = (internalId: number) =>
  formatFinanceOperationalCode("C", internalId);

export const formatFinanceSubscriptionCode = (internalId: number) =>
  formatFinanceOperationalCode("A", internalId);
