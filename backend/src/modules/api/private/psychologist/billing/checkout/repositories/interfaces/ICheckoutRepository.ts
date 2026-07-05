import type {
  payment_method,
  professional_subscription,
  psychologist_profile,
  subscription_plan,
} from "@/interfaces/objects";

type CheckoutProfile = Pick<
  psychologist_profile,
  | "id"
  | "deleted"
  | "professional_address_city"
  | "professional_address_district"
  | "professional_address_number"
  | "professional_address_state"
  | "professional_address_street"
  | "professional_address_zip"
>;

type SubscriptionStatus = "inativa" | "ativa" | "inadimplente" | "cancelada";

type PaymentMethodDisplay = {
  gatewaySubscriptionId: string;
  brand?: string | null;
  last4?: string | null;
};

export interface ICheckoutRepository {
  cancelSubscription(subscriptionId: string): Promise<void>;
  createPendingSubscription(
    psychologistId: string,
    planId: string,
  ): Promise<professional_subscription>;
  findActiveProfessionalSubscription(
    psychologistId: string,
  ): Promise<professional_subscription | null>;
  findPlanBySlug(slug: "profissional"): Promise<subscription_plan | null>;
  findProfileByUserId(userId: string): Promise<CheckoutProfile | null>;
  findScheduledGatewaySubscription(
    psychologistId: string,
  ): Promise<professional_subscription | null>;
  hasBillingAddress(data: { profile: CheckoutProfile; userId: string }): Promise<boolean>;
  savePaymentMethodReference(userId: string, data: PaymentMethodDisplay): Promise<payment_method>;
  setGatewayPlanId(planId: string, gatewayPlanId: string): Promise<subscription_plan>;
  setGatewaySubscriptionId(
    subscriptionId: string,
    gatewaySubscriptionId: string,
    options?: {
      currentPeriodEnd?: Date | null;
      status?: SubscriptionStatus;
    },
  ): Promise<professional_subscription>;
}
