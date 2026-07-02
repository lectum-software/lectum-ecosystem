import { error, msg } from "@/helpers/translate";
import { getPaymentGateway } from "@/modules/billing/payment-gateway";
import { syncMercadoPagoSubscriptionRecord } from "@/modules/billing/sync-mercado-pago-subscription";
import type { IWebhookDTO } from "../DTOs/IWebhookDTO";
import { WebhookRepository } from "../repositories/WebhookRepository";

const GATEWAY = "mercadopago";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toStringValue = (value: unknown) => {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return toStringValue(value[0]);

  return null;
};

const getQueryDataId = (query?: Record<string, unknown>) => {
  if (!query) return null;

  const dottedDataId = toStringValue(query["data.id"]);
  const underscoredDataId = toStringValue(query.data_id);
  const nestedData = asRecord(query.data);
  const nestedDataId = toStringValue(nestedData?.id);

  return dottedDataId || underscoredDataId || nestedDataId;
};

const getBodyDataId = (body: unknown) => {
  const record = asRecord(body);
  const data = asRecord(record?.data);

  return toStringValue(data?.id);
};

const getWebhookDataId = (body: unknown, query?: Record<string, unknown>) =>
  getQueryDataId(query) || getBodyDataId(body);

const getQueryType = (query?: Record<string, unknown>) => {
  if (!query) return null;

  return toStringValue(query.type) || toStringValue(query.topic);
};

const buildWebhookPayload = (body: unknown, query?: Record<string, unknown>) => {
  const record = asRecord(body) ?? {};
  const data = asRecord(record.data) ?? {};
  const dataId = getWebhookDataId(body, query);
  const type = toStringValue(record.type) || getQueryType(query);

  return {
    ...record,
    ...(type ? { type } : {}),
    data: {
      ...data,
      ...(dataId ? { id: dataId } : {}),
    },
  };
};

const isPreapprovalSubscriptionEvent = (type: string) =>
  type === "subscription_preapproval" ||
  type === "preapproval" ||
  (type.includes("preapproval") && !type.includes("plan"));

export default async ({ body, headers, query }: IWebhookDTO) => {
  const gateway = getPaymentGateway();
  const dataId = getWebhookDataId(body, query);

  const signatureValid = gateway.verifyWebhookSignature({
    signature: headers["x-signature"],
    requestId: headers["x-request-id"],
    dataId,
  });

  if (!signatureValid) {
    console.warn("[BILLING] Mercado Pago webhook signature rejected", {
      data_id: dataId,
      type: getQueryType(query) || toStringValue(asRecord(body)?.type),
    });

    return {
      status: 401,
      ...error("billing_webhook_invalid_signature", {}),
    };
  }

  const payload = buildWebhookPayload(body, query);
  const event = gateway.parseWebhookEvent(payload);

  if (!event) {
    return {
      status: 200,
      ...msg("billing_webhook_processed", {}),
      data: {
        processed: false,
      },
    };
  }

  const repository = new WebhookRepository();
  const paymentEvent = await repository.storePaymentEvent({
    gateway: GATEWAY,
    external_id: event.externalId,
    type: event.type,
    payload: event.raw,
  });

  if (isPreapprovalSubscriptionEvent(event.type)) {
    const gatewaySubscription = await gateway.getSubscription(event.resourceId);
    const localSubscription = await repository.findSubscriptionByGatewayReference({
      subscriptionId: gatewaySubscription.external_reference,
      gatewaySubscriptionId: gatewaySubscription.gateway_subscription_id,
    });

    if (localSubscription) {
      await syncMercadoPagoSubscriptionRecord({
        gatewaySubscription,
        localSubscription,
        repository,
      });
    }
  }

  return {
    status: 200,
    ...msg("billing_webhook_processed", {}),
    data: {
      processed: true,
      duplicated: !paymentEvent.created,
    },
  };
};
