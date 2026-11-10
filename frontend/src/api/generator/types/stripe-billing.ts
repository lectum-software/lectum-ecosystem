export type BillingProvider = "stripe" | "mercadopago" | "disabled";
export type StripeBillingKind = "checkout" | "payment_method";
export type StripeBillingConfirmationKind = "setup" | "action";
export type StripeBillingOperationErrorCode =
  | "billing_payment_method_credit_card_only"
  | "billing_payment_method_update_required";
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
  /** Non-secret phase, including on reload; never a PaymentIntent confirmation permission. */
  confirmation_kind?: StripeBillingConfirmationKind | null;
  error_code?: StripeBillingOperationErrorCode | null;
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
    // Legacy payment responses remain representable but must not be confirmed by this client.
    confirmation: { type: "payment" | StripeBillingConfirmationKind; client_secret: string } | null;
  };
};

export type StripeBillingCheckoutPayload = {
  request_key: string;
  quote_revision: string;
  intent?: "courtesy_renewal";
};
