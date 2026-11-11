export type AdminSettingsSubscriptionPlanRecord = {
  active: boolean;
  createdAt: Date;
  gateway_plan_id: string | null;
  id: string;
  interval: string;
  name: string;
  price_cents: number;
  slug: string;
  updatedAt: Date;
};

export interface IAdminSettingsSubscriptionPlanRepository {
  findProfessionalPlan(): Promise<AdminSettingsSubscriptionPlanRecord | null>;
  findSettings(identity: StripeIdentity | null): Promise<AdminSettingsSubscriptionRecords>;
}

import type { StripeIdentity } from "@/modules/billing/payment-gateway/stripe-types";

export type AdminSettingsSubscriptionOfferRecord = {
  revision: number;
  checkout_enabled: boolean;
  updated_at: Date;
};

export type AdminSettingsSubscriptionPriceRecord = {
  amount_cents: number;
  currency: string;
  interval: string;
  interval_count: number;
  created_at: Date;
};

export type AdminSettingsSubscriptionRecords = {
  plan: AdminSettingsSubscriptionPlanRecord | null;
  offer: AdminSettingsSubscriptionOfferRecord | null;
  price: AdminSettingsSubscriptionPriceRecord | null;
};
