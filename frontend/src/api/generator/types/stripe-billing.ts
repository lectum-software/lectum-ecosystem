export type BillingProvider = "stripe" | "mercadopago" | "disabled";
export type StripeBillingKind = "checkout" | "payment_method";
export type StripeBillingState =
  | "requires_confirmation"
  | "processing"
  | "complete"
  | "failed"
  | "review_required";

export type StripeBillingQuote = {
  revision: string;
  amount_cents: number;
  amount_due_now_cents: number;
  currency: "brl";
  interval: "month";
  intent: "subscription" | "courtesy_renewal";
  scheduled_start_at: string | null;
};

export type StripeBillingOperationSummary = {
  id: string;
  kind: StripeBillingKind;
  state: StripeBillingState;
};

export type StripeBillingConfig = {
  enabled: boolean;
  checkout_provider: BillingProvider;
  payment_method_provider: BillingProvider;
  publishable_key?: string;
  quote?: StripeBillingQuote;
  pending_operation?: StripeBillingOperationSummary | null;
};

export type StripeBillingOperationResponse = {
  operation: StripeBillingOperationSummary & {
    confirmation: { type: "payment" | "setup"; client_secret: string } | null;
  };
};

export type StripeBillingCheckoutPayload = {
  request_key: string;
  quote_revision: string;
  intent?: "courtesy_renewal";
};
