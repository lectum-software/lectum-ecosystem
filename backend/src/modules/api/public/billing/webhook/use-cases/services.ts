import { error, msg } from "@/helpers/translate";
import { getPaymentGateway } from "@/modules/billing/payment-gateway";
import type { IWebhookDTO } from "../DTOs/IWebhookDTO";
import { WebhookRepository } from "../repositories/WebhookRepository";

const GATEWAY = "mercadopago";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getWebhookDataId = (body: unknown) => {
  const record = asRecord(body);
  const data = asRecord(record?.data);
  const id = data?.id;

  if (typeof id === "string" || typeof id === "number") return String(id);

  return null;
};

const isSubscriptionEvent = (type: string) =>
  type === "subscription_preapproval" ||
  type === "subscription_authorized_payment" ||
  type === "preapproval" ||
  type.includes("preapproval") ||
  type.includes("subscription");

const parseDate = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

export default async ({ body, headers }: IWebhookDTO) => {
  const gateway = getPaymentGateway();
  const dataId = getWebhookDataId(body);

  const signatureValid = gateway.verifyWebhookSignature({
    signature: headers["x-signature"],
    requestId: headers["x-request-id"],
    dataId,
  });

  if (!signatureValid) {
    return {
      status: 401,
      ...error("billing_webhook_invalid_signature", {}),
    };
  }

  const event = gateway.parseWebhookEvent(body);

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

  if (!paymentEvent.created) {
    return {
      status: 200,
      ...msg("billing_webhook_processed", {}),
      data: {
        processed: false,
        duplicated: true,
      },
    };
  }

  if (isSubscriptionEvent(event.type)) {
    const subscription = await gateway.getSubscription(event.resourceId);

    await repository.updateSubscriptionByGatewayReference({
      subscriptionId: subscription.external_reference,
      gatewaySubscriptionId: subscription.gateway_subscription_id,
      status: subscription.status,
      currentPeriodEnd: parseDate(subscription.next_payment_date),
    });
  }

  return {
    status: 200,
    ...msg("billing_webhook_processed", {}),
    data: {
      processed: true,
    },
  };
};
