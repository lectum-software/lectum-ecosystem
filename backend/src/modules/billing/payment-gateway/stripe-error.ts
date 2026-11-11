import { createHash } from "node:crypto";

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

export type StripeFailureDiagnostic =
  | "transport_unavailable"
  | "rate_limited"
  | "access_denied"
  | "provider_unavailable"
  | "request_invalid"
  | "card_declined"
  | "authentication_required"
  | "unknown_failure";

type FailureMetadata = { diagnostic: StripeFailureDiagnostic; request_ref?: string };
const value = (input: unknown, key: string): unknown => {
  try {
    return typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)[key]
      : undefined;
  } catch {
    return undefined;
  }
};
const metadata = (error: unknown, status?: number): FailureMetadata => {
  const type = value(error, "type");
  const code = value(error, "code");
  const requestId = value(error, "requestId");
  const diagnostic: StripeFailureDiagnostic =
    status === 401 || status === 403
      ? "access_denied"
      : status === 429
        ? "rate_limited"
        : status !== undefined && status >= 500 && status <= 599
          ? "provider_unavailable"
          : code === "authentication_required"
            ? "authentication_required"
            : code === "card_declined" || type === "StripeCardError"
              ? "card_declined"
              : type === "StripeConnectionError" ||
                  (typeof code === "string" &&
                    ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "ENOTFOUND"].includes(code))
                ? "transport_unavailable"
                : status !== undefined && status >= 400 && status <= 499
                  ? "request_invalid"
                  : "unknown_failure";
  return {
    diagnostic,
    ...(typeof requestId === "string" && /^req_[A-Za-z0-9]{1,100}$/.test(requestId)
      ? {
          request_ref: createHash("sha256")
            .update(`lectum.stripe.request.v1:${requestId}`)
            .digest("hex")
            .slice(0, 24),
        }
      : {}),
  };
};

/** Closed metadata only: never retain the SDK error, request, response, or cause. */
export class StripeGatewayError extends Error {
  readonly details: { status?: number } & FailureMetadata;
  constructor(
    readonly kind: StripeFailureKind,
    status?: number,
    diagnostic?: FailureMetadata,
  ) {
    super("STRIPE_GATEWAY_OPERATION_FAILED");
    this.name = "StripeGatewayError";
    this.details = {
      ...(Number.isInteger(status) && status! >= 100 && status! <= 599 ? { status } : {}),
      ...(diagnostic ?? metadata(null, status)),
    };
  }
}

export const stripeFailure = (error: unknown): StripeGatewayError => {
  if (error instanceof StripeGatewayError) return error;
  const rawStatus = value(error, "statusCode");
  const status = typeof rawStatus === "number" ? rawStatus : undefined;
  return new StripeGatewayError("provider_unavailable", status, metadata(error, status));
};

/** Logs may use this projection, never the original error or SDK metadata. */
export const stripeFailureObservation = (error: unknown) => {
  const safe = stripeFailure(error);
  return {
    http_status: safe.details.status ?? null,
    failure_diagnostic: safe.details.diagnostic,
    ...(safe.details.request_ref ? { request_ref: safe.details.request_ref } : {}),
  };
};
