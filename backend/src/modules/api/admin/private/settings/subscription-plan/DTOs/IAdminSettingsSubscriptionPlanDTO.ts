export type AdminSettingsSubscriptionPlanDTO = {
  active: boolean;
  created_at: string;
  currency: "BRL";
  gateway_plan_configured: boolean;
  id: string;
  interval: string;
  name: string;
  price_cents: number;
  slug: string;
  source: "subscription_plan";
  updated_at: string;
};

export type AdminSettingsSubscriptionPlanResponseDTO = {
  plan: AdminSettingsSubscriptionPlanDTO;
};
