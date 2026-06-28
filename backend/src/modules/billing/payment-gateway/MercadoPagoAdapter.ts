import { createHmac, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import type {
  BillingSubscriptionStatus,
  GatewaySubscription,
  GatewaySubscriptionInput,
  GatewaySubscriptionResult,
  GatewayUpdateSubscriptionCardInput,
  GatewayWebhookEvent,
  PaymentGateway,
  VerifyWebhookSignatureInput,
} from "./PaymentGateway";

type RecordBody = Record<string, unknown>;

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

const GATEWAY = "mercadopago";

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

export class MercadoPagoAdapter implements PaymentGateway {
  private readonly preApproval: PreApproval;
  private readonly webhookSecret: string | null;

  constructor() {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN_NOT_CONFIGURED");
    }

    const config = new MercadoPagoConfig({
      accessToken,
      options: {
        timeout: 10_000,
      },
    });

    this.preApproval = new PreApproval(config);
    this.webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || null;
  }

  async createSubscription({
    subscriptionId,
    planName,
    amountCents,
    cardToken,
    payerEmail,
    returnUrl,
  }: GatewaySubscriptionInput): Promise<GatewaySubscriptionResult> {
    const response = await this.preApproval.create({
      body: {
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
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
    });

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
    const response = await this.preApproval.update({
      id: gatewaySubscriptionId,
      body: {
        card_token_id: cardToken,
      },
    });

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
    const response = await this.preApproval.get({ id: gatewaySubscriptionId });

    return {
      gateway_subscription_id: response.id || gatewaySubscriptionId,
      status: normalizeStatus(response.status),
      gateway_status: response.status ?? null,
      external_reference: response.external_reference ?? null,
      next_payment_date: response.next_payment_date ?? null,
      raw: response,
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
