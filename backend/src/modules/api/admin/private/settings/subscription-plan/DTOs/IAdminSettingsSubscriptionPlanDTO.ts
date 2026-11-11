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
  checkout: AdminSettingsSubscriptionCheckoutDTO;
};

export type AdminSettingsSubscriptionCheckoutDTO = {
  source: "local_configuration";
  gateway: "stripe" | "mercadopago" | "disabled" | null;
  mode: "test" | "live" | null;
  status: "configured" | "paused" | "not_configured" | "invalid_configuration" | "invalid_offer";
  remote_readiness: "not_checked";
  collection_enabled: boolean;
  reconciliation_enabled: boolean;
  offer: {
    revision: number;
    checkout_enabled: boolean;
    updated_at: string;
  } | null;
  price: {
    source: "billing_price_version" | "subscription_plan";
    amount_cents: number;
    currency: string;
    interval: string;
    interval_count: number;
    created_at: string;
  } | null;
};
