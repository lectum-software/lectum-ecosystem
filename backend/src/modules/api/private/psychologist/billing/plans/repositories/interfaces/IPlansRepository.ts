import type { billing_offer, billing_price_version } from "@/external/generated/prisma/client";
import type { subscription_plan } from "@/interfaces/objects";
import type { StripeIdentity } from "@/modules/billing/payment-gateway/stripe-types";

export type PlanAdmissionCatalog = {
  offer: billing_offer | null;
  price: billing_price_version | null;
};

export type PlansCatalogRecords = PlanAdmissionCatalog & { plans: subscription_plan[] };

export interface IPlansRepository {
  index(identity: StripeIdentity | null): Promise<PlansCatalogRecords>;
}
