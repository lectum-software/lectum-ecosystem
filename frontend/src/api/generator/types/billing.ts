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
  gateway_plan_id?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ProfessionalSubscriptionStatus = "inativa" | "ativa" | "inadimplente" | "cancelada";
export type ProfessionalSubscriptionSource =
  | "free_signup"
  | "mercadopago"
  | "admin_grant"
  | "legacy";

export type ProfessionalSubscription = {
  id: string;
  psychologist_id: string;
  plan_id: string;
  status: ProfessionalSubscriptionStatus | string;
  source?: ProfessionalSubscriptionSource | string | null;
  gateway?: string | null;
  gateway_subscription_id?: string | null;
  current_period_end?: string | null;
  grant_reason?: string | null;
  grant_notes?: string | null;
  granted_by?: string | null;
  grant_started_at?: string | null;
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

export type BillingPaymentMethod = {
  id: string;
  user_id: string;
  gateway: string;
  gateway_token?: string | null;
  brand?: string | null;
  last4?: string | null;
  exp_month?: number | null;
  exp_year?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BillingSubscriptionResponse = {
  current: ProfessionalSubscription | null;
  subscription: ProfessionalSubscription | null;
  payment_method: BillingPaymentMethod | null;
};

export type BillingSelectFreeResponse = {
  current: ProfessionalSubscription;
};

export type BillingCheckoutPayload = {
  card_token: string;
  payment_type_id: "credit_card" | "debit_card" | "prepaid_card";
  return_url?: string | null;
};

export type BillingCheckoutResponse = {
  current: ProfessionalSubscription;
  gateway_status?: string | null;
  pending_confirmation: boolean;
  init_point?: string | null;
};

export type BillingPaymentMethodPayload = {
  card_token: string;
  payment_type_id: "credit_card" | "debit_card" | "prepaid_card";
  brand?: string | null;
  last4?: string | null;
  exp_month?: number | null;
  exp_year?: number | null;
};

export type BillingPaymentMethodResponse = {
  current: ProfessionalSubscription;
  subscription: ProfessionalSubscription;
  payment_method: BillingPaymentMethod;
  gateway_status?: string | null;
  pending_confirmation: boolean;
};

export type BillingAddress = {
  id: string;
  user_id: string;
  zip: string;
  street: string;
  number: string;
  complement?: string | null;
  district: string;
  city: string;
  state: string;
  createdAt?: string;
  updatedAt?: string;
};

export type BillingAddressPayload = {
  zip: string;
  street: string;
  number: string;
  complement?: string | null;
  district: string;
  city: string;
  state: string;
};

export type BillingAddressResponse = {
  address: BillingAddress;
  next_path: string;
};
