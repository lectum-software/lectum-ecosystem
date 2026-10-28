import type { GatewayAuthorizedPayment } from "./PaymentGateway";

type ReadStage = "resource_validation" | "provider_get";
type ReadFailureKind = "invalid_resource" | "timeout" | "network" | "http" | "invalid_json";

// Carries only locally classified metadata, never an exception cause or response body.
export class AuthorizedPaymentReadError extends Error {
  constructor(
    readonly stage: ReadStage,
    readonly failureKind: ReadFailureKind,
    readonly httpStatus?: number,
  ) {
    super("AUTHORIZED_PAYMENT_READ_FAILED");
    this.name = "AuthorizedPaymentReadError";
  }
}

export const authorizedPaymentReadFailure = (error: unknown) => {
  if (error instanceof AuthorizedPaymentReadError) {
    if (error.stage === "resource_validation" && error.failureKind === "invalid_resource") {
      return { stage: "resource_validation", failure_kind: "invalid_resource" };
    }
    if (
      error.stage === "provider_get" &&
      ["timeout", "network", "http", "invalid_json"].includes(error.failureKind)
    ) {
      const status = error.httpStatus;
      return {
        stage: "provider_get",
        failure_kind: error.failureKind,
        ...(typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599
          ? { http_status: status }
          : {}),
      };
    }
  }
  return { stage: "provider_get", failure_kind: "unexpected" };
};

export const authorizedPaymentElapsedMs = (startedAt: number) => {
  const elapsed = performance.now() - startedAt;
  return Number.isFinite(elapsed)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.round(elapsed)))
    : 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isAuthorizedPaymentId = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 128 &&
  !/[^A-Za-z0-9_-]/.test(value);

const referenceOrNull = (value: unknown): string | null => {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return String(value);
  }
  return isAuthorizedPaymentId(value) ? value : null;
};

const codeOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 && value.length <= 80 && !/[^a-z0-9_]/.test(value)
    ? value
    : null;

// Invoice status (e.g. scheduled) is not the nested payment outcome.
export const projectAuthorizedPayment = (body: unknown): GatewayAuthorizedPayment => {
  const invoice = isRecord(body) ? body : {};
  const payment = isRecord(invoice.payment) ? invoice.payment : {};

  return {
    gateway_subscription_id: referenceOrNull(invoice.preapproval_id),
    gateway_payment_id: referenceOrNull(payment.id),
    external_reference: referenceOrNull(invoice.external_reference),
    status: codeOrNull(payment.status),
    status_detail: codeOrNull(payment.status_detail),
  };
};

export const readAuthorizedPayment = async (
  id: string,
  accessToken: string,
): Promise<GatewayAuthorizedPayment> => {
  if (!isAuthorizedPaymentId(id)) {
    throw new AuthorizedPaymentReadError("resource_validation", "invalid_resource");
  }

  const signal = AbortSignal.timeout(3_000);
  let response: Response;
  try {
    // Diagnostic only: a fixed-host GET, with no retries, redirects or writes.
    response = await fetch(`https://api.mercadopago.com/authorized_payments/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: "error",
      signal,
    });
  } catch {
    throw new AuthorizedPaymentReadError("provider_get", signal.aborted ? "timeout" : "network");
  }

  if (!response.ok) {
    throw new AuthorizedPaymentReadError("provider_get", "http", response.status);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    const kind = signal.aborted
      ? "timeout"
      : error instanceof SyntaxError
        ? "invalid_json"
        : "network";
    throw new AuthorizedPaymentReadError("provider_get", kind, response.status);
  }
  return projectAuthorizedPayment(body);
};
