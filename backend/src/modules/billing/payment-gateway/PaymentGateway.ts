export type BillingSubscriptionStatus = "inativa" | "ativa" | "inadimplente" | "cancelada";

export type GatewaySubscriptionInput = {
  subscriptionId: string;
  gatewayPlanId?: string | null;
  planName: string;
  amountCents: number;
  cardToken: string;
  payerEmail: string;
  returnUrl?: string | null;
  startDate?: Date | string | null;
};

export type GatewaySubscriptionPlanInput = {
  planName: string;
  amountCents: number;
  returnUrl?: string | null;
  idempotencyKey?: string | null;
};

export type GatewaySubscriptionPlanResult = {
  gateway_plan_id: string;
  gateway_status?: string | null;
  init_point?: string | null;
  raw: unknown;
};

export type GatewaySubscriptionPlan = GatewaySubscriptionPlanResult & {
  amount_cents: number | null;
};

export type GatewaySubscriptionResult = {
  gateway_subscription_id: string;
  status: BillingSubscriptionStatus;
  gateway_status?: string | null;
  init_point?: string | null;
  next_payment_date?: string | null;
  raw: unknown;
};

export type GatewayUpdateSubscriptionCardInput = {
  gatewaySubscriptionId: string;
  cardToken: string;
};

export type GatewayCancelSubscriptionInput = {
  gatewaySubscriptionId: string;
};

export type GatewaySubscription = {
  gateway_subscription_id: string;
  status: BillingSubscriptionStatus;
  gateway_status?: string | null;
  external_reference?: string | null;
  next_payment_date?: string | null;
  raw: unknown;
};

export type GatewaySubscriptionPaymentSummary = {
  gateway_subscription_id: string;
  charged_amount_cents: number | null;
  charged_quantity: number;
  last_charged_amount_cents: number | null;
  last_charged_at?: string | null;
  raw: unknown;
};

export type GatewayWebhookEvent = {
  externalId: string;
  type: string;
  resourceId: string;
  action?: string | null;
  raw: unknown;
};

export type VerifyWebhookSignatureInput = {
  signature?: string | string[];
  requestId?: string | string[];
  dataId?: string | null;
};

export interface PaymentGateway {
  createSubscriptionPlan(
    input: GatewaySubscriptionPlanInput,
  ): Promise<GatewaySubscriptionPlanResult>;
  getSubscriptionPlan(gatewayPlanId: string): Promise<GatewaySubscriptionPlan>;
  createSubscription(input: GatewaySubscriptionInput): Promise<GatewaySubscriptionResult>;
  updateSubscriptionCard(
    input: GatewayUpdateSubscriptionCardInput,
  ): Promise<GatewaySubscriptionResult>;
  cancelSubscription(input: GatewayCancelSubscriptionInput): Promise<GatewaySubscriptionResult>;
  getSubscription(gatewaySubscriptionId: string): Promise<GatewaySubscription>;
  getSubscriptionPaymentSummary(
    gatewaySubscriptionId: string,
  ): Promise<GatewaySubscriptionPaymentSummary>;
  verifyWebhookSignature(input: VerifyWebhookSignatureInput): boolean;
  parseWebhookEvent(body: unknown): GatewayWebhookEvent | null;
}
