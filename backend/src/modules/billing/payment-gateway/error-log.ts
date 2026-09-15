export type PaymentGatewayErrorLog = {
  name: string;
  status?: number;
  status_detail?: string;
  cause_codes?: string[];
};

export type PaymentGatewayErrorDetails = {
  status?: number;
  status_detail?: string;
  error?: string;
  cause_codes?: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const safeStatus = (value: unknown) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 100 || value > 599) {
    return undefined;
  }

  return value;
};

const safeCode = (value: unknown) => {
  const normalized =
    typeof value === "string" || typeof value === "number"
      ? String(value).trim().toLowerCase()
      : "";

  return /^[a-z0-9_]{2,80}$/.test(normalized) ? normalized : undefined;
};

const safeCauseCodes = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  const codes = value
    .map((item) => {
      if (!isRecord(item)) return safeCode(item);

      return safeCode(item.code ?? item.status_detail ?? item.error);
    })
    .filter((item): item is string => Boolean(item));

  return Array.from(new Set(codes)).slice(0, 8);
};

export const getPaymentGatewayErrorDetails = (error: unknown): PaymentGatewayErrorDetails => {
  const errorRecord = isRecord(error) ? error : null;
  const details = isRecord(errorRecord?.details) ? errorRecord.details : null;
  const rawCause = details?.cause_codes ?? details?.cause ?? errorRecord?.cause;

  return {
    status: safeStatus(details?.status ?? errorRecord?.status),
    status_detail: safeCode(details?.status_detail ?? errorRecord?.status_detail),
    error: safeCode(details?.error ?? errorRecord?.error ?? errorRecord?.code),
    cause_codes: safeCauseCodes(rawCause),
  };
};

export const sanitizePaymentGatewayError = (error: unknown): PaymentGatewayErrorLog => {
  const details = getPaymentGatewayErrorDetails(error);

  const safeLog: PaymentGatewayErrorLog = {
    name: "PaymentGatewayError",
    status: details.status,
  };

  if (details.status_detail) safeLog.status_detail = details.status_detail;
  if (details.cause_codes?.length) safeLog.cause_codes = details.cause_codes;

  return safeLog;
};
