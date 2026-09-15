import type { professional_subscription, psychologist_profile } from "@/interfaces/objects";
import type { BillingDunningUpdate } from "@/modules/billing/dunning";

export interface ISyncRepository {
  findProfileByUserId(userId: string): Promise<Pick<psychologist_profile, "id" | "deleted"> | null>;
  findLatestGatewaySubscription(psychologistId: string): Promise<professional_subscription | null>;
  updateSubscriptionStatus(data: {
    subscriptionId: string;
    gatewaySubscriptionId: string;
    status: "inativa" | "ativa" | "inadimplente" | "cancelada";
    billingDunning?: BillingDunningUpdate;
    currentPeriodEnd?: Date | null;
  }): Promise<professional_subscription | null>;
}
