import prisma, { type ORM } from "@/infra/database/prisma";
import type { payment_event, professional_subscription } from "@/interfaces/objects";
import type { IWebhookRepository } from "./interfaces/IWebhookRepository";

const toJson = (payload: unknown) => JSON.parse(JSON.stringify(payload));

export class WebhookRepository implements IWebhookRepository {
  readonly paymentEventRepository: ORM["payment_event"];
  readonly subscriptionRepository: ORM["professional_subscription"];

  constructor() {
    this.paymentEventRepository = prisma.payment_event;
    this.subscriptionRepository = prisma.professional_subscription;
  }

  async storePaymentEvent(data: {
    gateway: string;
    external_id: string;
    type: string;
    payload: unknown;
  }): Promise<{ event: payment_event; created: boolean }> {
    const current = await this.paymentEventRepository.findUnique({
      where: {
        gateway_external_id: {
          gateway: data.gateway,
          external_id: data.external_id,
        },
      },
    });

    if (current) {
      return { event: current, created: false };
    }

    const event = await this.paymentEventRepository.create({
      data: {
        gateway: data.gateway,
        external_id: data.external_id,
        type: data.type,
        payload: toJson(data.payload),
      },
    });

    return { event, created: true };
  }

  async updateSubscriptionByGatewayReference(data: {
    subscriptionId?: string | null;
    gatewaySubscriptionId: string;
    status: "inativa" | "ativa" | "inadimplente" | "cancelada";
    currentPeriodEnd?: Date | null;
  }): Promise<professional_subscription | null> {
    const subscription = await this.subscriptionRepository.findFirst({
      where: {
        deleted: false,
        OR: [
          ...(data.subscriptionId ? [{ id: data.subscriptionId }] : []),
          { gateway_subscription_id: data.gatewaySubscriptionId },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!subscription?.id) return null;

    return this.subscriptionRepository.update({
      where: {
        id: subscription.id,
      },
      data: {
        status: data.status,
        gateway: "mercadopago",
        gateway_subscription_id: data.gatewaySubscriptionId,
        current_period_end: data.currentPeriodEnd ?? null,
      },
      include: {
        plan: true,
      },
    });
  }
}
