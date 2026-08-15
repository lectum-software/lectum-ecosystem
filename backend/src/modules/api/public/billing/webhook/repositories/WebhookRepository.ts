import prisma, { type ORM } from "@/infra/database/prisma";
import type { payment_event, professional_subscription } from "@/interfaces/objects";
import type { BillingDunningUpdate } from "@/modules/billing/dunning";
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

    try {
      const event = await this.paymentEventRepository.create({
        data: {
          gateway: data.gateway,
          external_id: data.external_id,
          type: data.type,
          payload: toJson(data.payload),
        },
      });

      return { event, created: true };
    } catch (error) {
      const isUniqueConflict =
        typeof error === "object" && error !== null && "code" in error && error.code === "P2002";

      if (!isUniqueConflict) throw error;

      const concurrentEvent = await this.paymentEventRepository.findUnique({
        where: {
          gateway_external_id: {
            gateway: data.gateway,
            external_id: data.external_id,
          },
        },
      });

      if (!concurrentEvent) throw error;

      return { event: concurrentEvent, created: false };
    }
  }

  async findSubscriptionByGatewayReference(data: {
    subscriptionId?: string | null;
    gatewaySubscriptionId: string;
  }): Promise<professional_subscription | null> {
    return this.subscriptionRepository.findFirst({
      where: {
        deleted: false,
        OR: [
          ...(data.subscriptionId ? [{ id: data.subscriptionId }] : []),
          { gateway_subscription_id: data.gatewaySubscriptionId },
        ],
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async updateSubscriptionStatus(data: {
    subscriptionId: string;
    gatewaySubscriptionId: string;
    status: "inativa" | "ativa" | "inadimplente" | "cancelada";
    billingDunning?: BillingDunningUpdate;
    currentPeriodEnd?: Date | null;
  }): Promise<professional_subscription | null> {
    const subscription = await this.subscriptionRepository.update({
      where: {
        id: data.subscriptionId,
      },
      data: {
        status: data.status,
        ...data.billingDunning,
        gateway: "mercadopago",
        gateway_subscription_id: data.gatewaySubscriptionId,
        current_period_end: data.currentPeriodEnd ?? null,
      },
      include: {
        plan: true,
      },
    });

    if (data.status === "ativa" && subscription.plan?.slug !== "gratuito") {
      await prisma.psychologist_profile.updateMany({
        where: {
          deleted: false,
          id: subscription.psychologist_id,
          show_experience_tag: false,
          updatedAt: {
            lte: subscription.grant_started_at ?? subscription.createdAt,
          },
        },
        data: {
          show_experience_tag: true,
        },
      });
    }

    return subscription;
  }
}
