import { toSafeErrorLog } from "@/utils/safe-error-log";

export type PaymentGatewayErrorLog = {
  blocked_by?: string;
  code?: string;
  name: string;
  operation?: string;
  status?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const safeIdentifier = (value: unknown) => {
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 100 && /^[\w.:-]+$/u.test(normalized)
    ? normalized
    : undefined;
};

const safeStatus = (value: unknown) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 100 || value > 599) {
    return undefined;
  }

  return value;
};

export const sanitizePaymentGatewayError = (error: unknown): PaymentGatewayErrorLog => {
  const errorRecord = isRecord(error) ? error : null;
  const details = isRecord(errorRecord?.details) ? errorRecord.details : null;

  return {
    blocked_by: safeIdentifier(details?.blocked_by ?? errorRecord?.blocked_by),
    code: safeIdentifier(details?.code ?? errorRecord?.code),
    name: toSafeErrorLog(error, "PaymentGatewayError").name,
    operation: safeIdentifier(details?.operation ?? errorRecord?.operation),
    status: safeStatus(details?.status ?? errorRecord?.status),
  };
};
