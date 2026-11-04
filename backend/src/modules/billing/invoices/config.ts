import { isDisposableRuntime } from "@/utils/runtime-config";

export class InvoiceError extends Error {
  constructor(
    readonly code: string,
    readonly retryable = false,
  ) {
    super("BILLING_INVOICE_OPERATION_FAILED");
    this.name = "InvoiceError";
  }
}

export type InvoiceConfig = {
  mode: InvoiceMode;
  apiKey: string;
  companyId: string;
  enabled: boolean;
  issueEnabled: boolean;
  paymentsFrom: Date;
  description: string;
  autoEnabled: boolean;
  pilotPaymentId: string | null;
  serviceCode: string | null;
  issRate: number | null;
};

export type InvoiceMode = "test" | "live";

export function isInvoiceLiveRuntime(env = process.env) {
  try {
    const database = new URL(env.DATABASE_URL ?? "");
    return (
      env.NODE_ENV === "production" &&
      env.MERCADO_PAGO_ENV === "production" &&
      new URL(env.BASE ?? "").origin === "https://api.lectum.com.br" &&
      ["postgres:", "postgresql:"].includes(database.protocol) &&
      !["127.0.0.1", "localhost", "[::1]"].includes(database.hostname) &&
      !/(homol|staging|(?:^|[_-])(dev|test|local)(?:[_-]|$))/i.test(database.pathname.slice(1))
    );
  } catch {
    return false;
  }
}

export const invoiceFeatureEnabled = (env = process.env) =>
  env.SENDNF_TEST_ENABLED === "true" || env.SENDNF_LIVE_ENABLED === "true";

export function isInvoiceTestRuntime(env = process.env) {
  try {
    const database = new URL(env.DATABASE_URL ?? "");
    return (
      isDisposableRuntime(env.NODE_ENV) &&
      env.MERCADO_PAGO_ENV === "sandbox" &&
      ["127.0.0.1", "localhost", "[::1]"].includes(database.hostname) &&
      /(?:^|[_-])(dev|test|local)(?:[_-]|$)/.test(database.pathname.slice(1)) &&
      !/(prod|homol|staging)/i.test(database.pathname)
    );
  } catch {
    return false;
  }
}

export function getInvoiceConfig(env = process.env): InvoiceConfig | null {
  if (!invoiceFeatureEnabled(env)) return null;
  if (env.SENDNF_TEST_ENABLED === "true" && env.SENDNF_LIVE_ENABLED === "true")
    throw new InvoiceError("configuration_invalid");
  const mode: InvoiceMode = env.SENDNF_LIVE_ENABLED === "true" ? "live" : "test";
  const apiKey = env.SENDNF_API_KEY?.trim() ?? "";
  const companyId = env.SENDNF_COMPANY_ID?.trim() ?? "";
  const paymentsFrom = new Date(env.SENDNF_PAYMENTS_FROM ?? "");
  const description = env.SENDNF_SERVICE_DESCRIPTION?.trim() ?? "";
  const serviceCode = env.SENDNF_SERVICE_CODE?.trim() || null;
  const issRate = /^\d{1,3}$/.test(env.SENDNF_ISS_RATE ?? "") ? Number(env.SENDNF_ISS_RATE) : null;
  const pilotPaymentId = env.SENDNF_LIVE_PAYMENT_ID?.trim() || null;
  const autoEnabled = mode === "test" || env.SENDNF_LIVE_AUTO_ENABLED === "true";
  const issueEnabled =
    env.SENDNF_FISCAL_SETTINGS_CONFIRMED === "true" &&
    (mode === "test"
      ? env.SENDNF_TEST_ISSUANCE_ENABLED === "true"
      : env.SENDNF_LIVE_ISSUANCE_ENABLED === "true");
  if (
    !new RegExp(`^nt_${mode}_[A-Za-z0-9_-]+$`).test(apiKey) ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(companyId) ||
    !Number.isFinite(paymentsFrom.getTime()) ||
    description.length < 10 ||
    description.length > 500 ||
    !(mode === "test" ? isInvoiceTestRuntime(env) : isInvoiceLiveRuntime(env)) ||
    (mode === "live" &&
      (!/^\d{6}$/.test(serviceCode ?? "") ||
        issRate === null ||
        issRate > 500 ||
        !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(env.SENDNF_PAYMENTS_FROM ?? "") ||
        (pilotPaymentId !== null && !/^\d{1,100}$/.test(pilotPaymentId)) ||
        (issueEnabled && !autoEnabled && !pilotPaymentId)))
  )
    throw new InvoiceError("configuration_invalid");
  return {
    mode,
    apiKey,
    companyId,
    paymentsFrom,
    description,
    enabled: true,
    issueEnabled,
    autoEnabled,
    pilotPaymentId,
    serviceCode,
    issRate,
  };
}

export const canIssuePayment = (config: InvoiceConfig, paymentId: string) =>
  config.issueEnabled && (config.autoEnabled || config.pilotPaymentId === paymentId);

export const invoiceErrorCode = (error: unknown) =>
  error instanceof InvoiceError ? error.code : "operation_unavailable";

export const retryDate = (attempts: number, now = Date.now()) =>
  new Date(now + Math.min(60 * 60_000, 60_000 * 2 ** Math.min(attempts, 6)));
