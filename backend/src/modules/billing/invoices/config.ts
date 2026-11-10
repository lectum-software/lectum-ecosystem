import { invoiceGatewayScopes } from "./gateway-scope";

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
  stripeLiveIssuance: {
    enabled: boolean;
    autoEnabled: boolean;
    pilotPaymentId: string | null;
  };
};

export type InvoiceMode = "test" | "live";

export const isInvoiceLiveRuntime = (env = process.env) =>
  invoiceGatewayScopes("live", env).length > 0;

export const invoiceFeatureEnabled = (env = process.env) =>
  env.SENDNF_TEST_ENABLED === "true" || env.SENDNF_LIVE_ENABLED === "true";

export const isInvoiceTestRuntime = (env = process.env) =>
  invoiceGatewayScopes("test", env).length > 0;

const stripeLiveIssuancePolicy = (env: NodeJS.ProcessEnv): InvoiceConfig["stripeLiveIssuance"] => {
  const enabled = env.SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED ?? "false";
  const autoEnabled = env.SENDNF_STRIPE_LIVE_AUTO_ENABLED ?? "false";
  const pilotPaymentId = env.SENDNF_STRIPE_LIVE_PAYMENT_ID?.trim() || null;
  // A malformed new Stripe opt-in must never disable the existing MP fiscal configuration.
  if (
    !["", "true", "false"].includes(enabled) ||
    !["", "true", "false"].includes(autoEnabled) ||
    (pilotPaymentId !== null && !/^in_[A-Za-z0-9]{1,100}$/.test(pilotPaymentId)) ||
    (enabled === "true" && autoEnabled !== "true" && !pilotPaymentId)
  )
    return { enabled: false, autoEnabled: false, pilotPaymentId: null };
  return { enabled: enabled === "true", autoEnabled: autoEnabled === "true", pilotPaymentId };
};

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
  const stripeLiveIssuance = stripeLiveIssuancePolicy(env);
  const hasStripeLiveScope =
    mode === "live" && invoiceGatewayScopes(mode, env).some((scope) => scope.gateway === "stripe");
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
        (pilotPaymentId !== null &&
          !/^(?:\d{1,100}|in_[A-Za-z0-9]{1,100})$/.test(pilotPaymentId)) ||
        (issueEnabled && !autoEnabled && !pilotPaymentId && !hasStripeLiveScope)))
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
    stripeLiveIssuance,
  };
}

export const canIssuePayment = (config: InvoiceConfig, paymentId: string, gateway: string) => {
  if (!config.issueEnabled || !["mercadopago", "stripe"].includes(gateway)) return false;
  if (gateway === "stripe" && config.mode === "live") {
    if (!/^in_[A-Za-z0-9]{1,100}$/.test(paymentId)) return false;
    const policy = config.stripeLiveIssuance;
    return policy.enabled && (policy.autoEnabled || policy.pilotPaymentId === paymentId);
  }
  return config.autoEnabled || config.pilotPaymentId === paymentId;
};

export const invoiceErrorCode = (error: unknown) =>
  error instanceof InvoiceError ? error.code : "operation_unavailable";

export const retryDate = (attempts: number, now = Date.now()) =>
  new Date(now + Math.min(60 * 60_000, 60_000 * 2 ** Math.min(attempts, 6)));
