import { createHmac, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, PreApproval, PreApprovalPlan } from "mercadopago";
import type { Options as MercadoPagoOptions } from "mercadopago/dist/types";
import type {
  BillingSubscriptionStatus,
  GatewayCancelSubscriptionInput,
  GatewaySubscription,
  GatewaySubscriptionInput,
  GatewaySubscriptionPaymentSummary,
  GatewaySubscriptionPlan,
  GatewaySubscriptionPlanInput,
  GatewaySubscriptionPlanResult,
  GatewaySubscriptionResult,
  GatewayUpdateSubscriptionCardInput,
  GatewayWebhookEvent,
  PaymentGateway,
  VerifyWebhookSignatureInput,
} from "./PaymentGateway";

type RecordBody = Record<string, unknown>;
type MercadoPagoRequestOptions = MercadoPagoOptions & {
  headers?: Record<string, string>;
};

type MercadoPagoWebhookBody = {
  id?: string | number;
  type?: string;
  topic?: string;
  action?: string;
  resource?: string;
  data?: {
    id?: string | number;
  };
};

type MercadoPagoPreApprovalRaw = {
  summarized?: {
    charged_amount?: unknown;
    charged_quantity?: unknown;
    last_charged_amount?: unknown;
    last_charged_date?: unknown;
  } | null;
};

const GATEWAY = "mercadopago";

type MercadoPagoSafeErrorDetails = {
  operation: string;
  name?: string;
  cause_message?: string;
  status?: number;
  code?: string;
  blocked_by?: string;
};

const firstHeaderValue = (value?: string | string[]) => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const parseSignatureHeader = (signature?: string | string[]) => {
  const header = firstHeaderValue(signature);
  if (!header) return null;

  return header.split(/[;,]/).reduce<Record<string, string>>((acc, item) => {
    const [rawKey, ...rawValue] = item.trim().split("=");
    const key = rawKey?.trim();
    const value = rawValue.join("=").trim();

    if (key && value) acc[key] = value;

    return acc;
  }, {});
};

const normalizeStatus = (status?: string | null): BillingSubscriptionStatus => {
  switch (status) {
    case "authorized":
      return "ativa";
    case "pending":
      return "inativa";
    case "paused":
      return "inadimplente";
    case "cancelled":
      return "cancelada";
    case "rejected":
    case "chargeback":
      return "inadimplente";
    default:
      return "inativa";
  }
};

const isObject = (value: unknown): value is RecordBody =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toStringOrNull = (value: unknown) => {
  if (typeof value === "string" && value) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

const toSafeString = (value: unknown) => (typeof value === "string" ? value : undefined);

const toSafeNumber = (value: unknown) => (typeof value === "number" ? value : undefined);

const toFiniteNumberOrNull = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const parsed = Number(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
};

const toNonNegativeInteger = (value: unknown) => {
  const parsed = toFiniteNumberOrNull(value);

  return parsed === null || parsed < 0 ? 0 : Math.trunc(parsed);
};

const toAmountCentsOrNull = (value: unknown) => {
  const parsed = toFiniteNumberOrNull(value);

  return parsed === null || parsed < 0 ? null : Math.round(parsed * 100);
};

const toIsoDateString = (value?: Date | string | null) => {
  if (!value) return undefined;

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const sanitizeMercadoPagoError = (operation: string, err: unknown): MercadoPagoSafeErrorDetails => {
  if (err instanceof Error) {
    return {
      operation,
      name: err.name,
      cause_message: err.message,
    };
  }

  if (!isObject(err)) {
    return {
      operation,
      cause_message: "Unknown Mercado Pago error",
    };
  }

  return {
    operation,
    name: toSafeString(err.name),
    cause_message: toSafeString(err.message) || toSafeString(err.error),
    status: toSafeNumber(err.status),
    code: toSafeString(err.code),
    blocked_by: toSafeString(err.blocked_by),
  };
};

export class MercadoPagoAdapterError extends Error {
  readonly details: MercadoPagoSafeErrorDetails;

  constructor(operation: string, cause: unknown) {
    super(`MERCADO_PAGO_${operation.toUpperCase()}_FAILED`);
    this.name = "MercadoPagoAdapterError";
    this.details = sanitizeMercadoPagoError(operation, cause);
  }
}

export class MercadoPagoAdapter implements PaymentGateway {
  private readonly accessToken: string;
  private readonly usesStageScope: boolean;
  private readonly preApproval: PreApproval;
  private readonly preApprovalPlan: PreApprovalPlan;
  private readonly webhookSecret: string | null;

  constructor() {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN_NOT_CONFIGURED");
    }

    const gatewayEnv = process.env.MERCADO_PAGO_ENV?.trim().toLowerCase();

    if (!gatewayEnv || !["sandbox", "production", "prod"].includes(gatewayEnv)) {
      throw new Error("MERCADO_PAGO_ENV_INVALID");
    }

    this.accessToken = accessToken;
    this.usesStageScope = gatewayEnv === "sandbox" && accessToken.startsWith("TEST-");

    const subscriptionConfig = new MercadoPagoConfig({
      accessToken,
      options: {
        timeout: 10_000,
      },
    });
    const planConfig = new MercadoPagoConfig({
      accessToken,
      options: {
        timeout: 10_000,
      },
    });

    this.preApproval = new PreApproval(subscriptionConfig);
    this.preApprovalPlan = new PreApprovalPlan(planConfig);
    this.webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || null;
  }

  private withRequestOptions(
    extra?: MercadoPagoRequestOptions,
    options: { stageScope?: boolean } = {},
  ): MercadoPagoRequestOptions | undefined {
    if (this.usesStageScope && options.stageScope) {
      return {
        ...extra,
        headers: {
          ...(extra?.headers ?? {}),
          Authorization: `Bearer ${this.accessToken}`,
          "X-scope": "stage",
        },
      };
    }

    return extra;
  }

  private async runGatewayOperation<T>(operation: string, action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (err) {
      throw new MercadoPagoAdapterError(operation, err);
    }
  }

  async createSubscriptionPlan({
    planName,
    amountCents,
    returnUrl,
    idempotencyKey,
  }: GatewaySubscriptionPlanInput): Promise<GatewaySubscriptionPlanResult> {
    const response = await this.runGatewayOperation("create_subscription_plan", () =>
      this.preApprovalPlan.create({
        body: {
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: amountCents / 100,
            currency_id: "BRL",
          },
          back_url: returnUrl || undefined,
          payment_methods_allowed: {
            payment_types: [{ id: "credit_card" }],
          },
          reason: planName,
          status: "active",
        },
        requestOptions: this.withRequestOptions({
          idempotencyKey: idempotencyKey || undefined,
        }),
      }),
    );

    if (!response.id) {
      throw new Error("MERCADO_PAGO_PREAPPROVAL_PLAN_ID_MISSING");
    }

    return {
      gateway_plan_id: response.id,
      gateway_status: response.status ?? null,
      init_point: response.init_point ?? null,
      raw: response,
    };
  }

  async getSubscriptionPlan(gatewayPlanId: string): Promise<GatewaySubscriptionPlan> {
    const response = await this.runGatewayOperation("get_subscription_plan", () =>
      this.preApprovalPlan.get({
        preApprovalPlanId: gatewayPlanId,
        requestOptions: this.withRequestOptions(),
      }),
    );

    return {
      gateway_plan_id: response.id || gatewayPlanId,
      gateway_status: response.status ?? null,
      init_point: response.init_point ?? null,
      amount_cents: toAmountCentsOrNull(response.auto_recurring?.transaction_amount),
      raw: response,
    };
  }

  async createSubscription({
    subscriptionId,
    gatewayPlanId,
    planName,
    amountCents,
    cardToken,
    payerEmail,
    returnUrl,
    startDate,
  }: GatewaySubscriptionInput): Promise<GatewaySubscriptionResult> {
    const recurringStartDate = toIsoDateString(startDate);

    const response = await this.runGatewayOperation("create_subscription", () =>
      this.preApproval.create({
        body: {
          ...(gatewayPlanId ? { preapproval_plan_id: gatewayPlanId } : {}),
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            ...(recurringStartDate ? { start_date: recurringStartDate } : {}),
            transaction_amount: amountCents / 100,
            currency_id: "BRL",
          },
          back_url: returnUrl || undefined,
          card_token_id: cardToken,
          external_reference: subscriptionId,
          payer_email: payerEmail,
          reason: planName,
          status: "authorized",
        },
        requestOptions: this.withRequestOptions(
          {
            idempotencyKey: `lectum-preapproval-${subscriptionId}`,
          },
          { stageScope: true },
        ),
      }),
    );

    if (!response.id) {
      throw new Error("MERCADO_PAGO_PREAPPROVAL_ID_MISSING");
    }

    return {
      gateway_subscription_id: response.id,
      status: normalizeStatus(response.status),
      gateway_status: response.status ?? null,
      init_point: response.init_point ?? null,
      next_payment_date: response.next_payment_date ?? null,
      raw: response,
    };
  }

  async updateSubscriptionCard({
    gatewaySubscriptionId,
    cardToken,
  }: GatewayUpdateSubscriptionCardInput): Promise<GatewaySubscriptionResult> {
    const response = await this.runGatewayOperation("update_subscription_card", () =>
      this.preApproval.update({
        id: gatewaySubscriptionId,
        body: {
          card_token_id: cardToken,
        },
        requestOptions: this.withRequestOptions(
          {
            idempotencyKey: `lectum-preapproval-card-${gatewaySubscriptionId}`,
          },
          { stageScope: true },
        ),
      }),
    );

    return {
      gateway_subscription_id: response.id || gatewaySubscriptionId,
      status: normalizeStatus(response.status),
      gateway_status: response.status ?? null,
      init_point: response.init_point ?? null,
      next_payment_date: toStringOrNull(response.next_payment_date),
      raw: response,
    };
  }

  async cancelSubscription({
    gatewaySubscriptionId,
  }: GatewayCancelSubscriptionInput): Promise<GatewaySubscriptionResult> {
    const response = await this.runGatewayOperation("cancel_subscription", () =>
      this.preApproval.update({
        id: gatewaySubscriptionId,
        body: {
          status: "cancelled",
        },
        requestOptions: this.withRequestOptions(
          {
            idempotencyKey: `lectum-preapproval-cancel-${gatewaySubscriptionId}`,
          },
          { stageScope: true },
        ),
      }),
    );

    return {
      gateway_subscription_id: response.id || gatewaySubscriptionId,
      status: normalizeStatus(response.status),
      gateway_status: response.status ?? null,
      init_point: response.init_point ?? null,
      next_payment_date: toStringOrNull(response.next_payment_date),
      raw: response,
    };
  }

  async getSubscription(gatewaySubscriptionId: string): Promise<GatewaySubscription> {
    const response = await this.runGatewayOperation("get_subscription", () =>
      this.preApproval.get({
        id: gatewaySubscriptionId,
        requestOptions: this.withRequestOptions(undefined, { stageScope: true }),
      }),
    );

    return {
      gateway_subscription_id: response.id || gatewaySubscriptionId,
      status: normalizeStatus(response.status),
      gateway_status: response.status ?? null,
      external_reference: response.external_reference ?? null,
      next_payment_date: response.next_payment_date ?? null,
      raw: response,
    };
  }

  async getSubscriptionPaymentSummary(
    gatewaySubscriptionId: string,
  ): Promise<GatewaySubscriptionPaymentSummary> {
    const subscription = await this.getSubscription(gatewaySubscriptionId);
    const raw = isObject(subscription.raw) ? (subscription.raw as MercadoPagoPreApprovalRaw) : null;
    const summarized = raw?.summarized ?? null;

    return {
      gateway_subscription_id: subscription.gateway_subscription_id,
      charged_amount_cents: toAmountCentsOrNull(summarized?.charged_amount),
      charged_quantity: toNonNegativeInteger(summarized?.charged_quantity),
      last_charged_amount_cents: toAmountCentsOrNull(summarized?.last_charged_amount),
      last_charged_at: toSafeString(summarized?.last_charged_date) ?? null,
      raw: summarized ?? null,
    };
  }

  verifyWebhookSignature({ signature, requestId, dataId }: VerifyWebhookSignatureInput): boolean {
    if (!this.webhookSecret || !dataId) return false;

    const parsed = parseSignatureHeader(signature);
    const ts = parsed?.ts;
    const signatureV1 = parsed?.v1;
    const requestIdValue = firstHeaderValue(requestId);

    if (!ts || !signatureV1 || !requestIdValue) return false;

    const manifest = `id:${dataId};request-id:${requestIdValue};ts:${ts};`;
    const expected = createHmac("sha256", this.webhookSecret).update(manifest).digest("hex");

    try {
      const expectedBuffer = Buffer.from(expected, "hex");
      const signatureBuffer = Buffer.from(signatureV1, "hex");

      return (
        expectedBuffer.length === signatureBuffer.length &&
        timingSafeEqual(expectedBuffer, signatureBuffer)
      );
    } catch {
      return false;
    }
  }

  parseWebhookEvent(body: unknown): GatewayWebhookEvent | null {
    if (!isObject(body)) return null;

    const webhook = body as MercadoPagoWebhookBody;
    const resourceId = webhook.data?.id ?? webhook.resource;

    if (!resourceId) return null;

    const type = webhook.type || webhook.topic || webhook.action || "unknown";
    const action = webhook.action || null;
    const externalId = webhook.id
      ? String(webhook.id)
      : `${GATEWAY}:${type}:${action || "event"}:${String(resourceId)}`;

    return {
      externalId,
      type,
      action,
      resourceId: String(resourceId),
      raw: body,
    };
  }
}
