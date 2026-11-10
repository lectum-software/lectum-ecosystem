export type StripeFailureKind =
  | "configuration_invalid"
  | "account_mismatch"
  | "account_not_ready"
  | "resource_invalid"
  | "resource_mismatch"
  | "contract_invalid"
  | "operation_unsupported"
  | "payment_not_eligible"
  | "card_credit_required"
  | "setup_not_completed"
  | "signature_invalid"
  | "provider_unavailable";

/** Closed metadata only: never retain the SDK error, request, response, or cause. */
export class StripeGatewayError extends Error {
  readonly details: { status?: number };
  constructor(
    readonly kind: StripeFailureKind,
    status?: number,
  ) {
    super("STRIPE_GATEWAY_OPERATION_FAILED");
    this.name = "StripeGatewayError";
    this.details = {
      ...(Number.isInteger(status) && status! >= 100 && status! <= 599 ? { status } : {}),
    };
  }
}

export const stripeFailure = (error: unknown): StripeGatewayError => {
  if (error instanceof StripeGatewayError) return error;
  let status: number | undefined;
  try {
    if (typeof error === "object" && error !== null && "statusCode" in error) {
      if (typeof error.statusCode === "number") status = error.statusCode;
    }
  } catch {
    // Untrusted error accessors cannot leak values or replace a safe error.
  }
  return new StripeGatewayError("provider_unavailable", status);
};
