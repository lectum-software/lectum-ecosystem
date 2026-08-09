export type PaymentGatewayErrorLog = {
  name: string;
  status?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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
    name: "PaymentGatewayError",
    status: safeStatus(details?.status ?? errorRecord?.status),
  };
};
