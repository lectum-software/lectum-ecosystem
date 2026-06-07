export type SubscriptionPlanSlug = "gratuito" | "profissional";

export type SubscriptionPlanFeatures = {
  specialties_limit?: number;
  services_limit?: number | "all";
  whatsapp_conversion?: boolean;
  verified_badge?: boolean;
  search_priority?: boolean;
  professional_community?: boolean;
  profile_video?: boolean;
  analytics?: boolean;
  patient_testimonials?: boolean;
  priority_support?: boolean;
};

export type SubscriptionPlan = {
  id: string;
  slug: SubscriptionPlanSlug | string;
  name: string;
  price_cents: number;
  interval: string;
  features?: SubscriptionPlanFeatures | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProfessionalSubscriptionStatus = "inativa" | "ativa" | "inadimplente" | "cancelada";

export type ProfessionalSubscription = {
  id: string;
  psychologist_id: string;
  plan_id: string;
  status: ProfessionalSubscriptionStatus | string;
  gateway?: string | null;
  gateway_subscription_id?: string | null;
  current_period_end?: string | null;
  plan?: SubscriptionPlan | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BillingPlansResponse = {
  plans: SubscriptionPlan[];
};

export type BillingCurrentResponse = {
  current: ProfessionalSubscription | null;
};

export type BillingSelectFreeResponse = {
  current: ProfessionalSubscription;
};
