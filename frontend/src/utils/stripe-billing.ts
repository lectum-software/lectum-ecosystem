import type {
  StripeBillingConfirmationKind,
  StripeBillingKind,
  StripeBillingOperationErrorCode,
  StripeBillingOperationResponse,
  StripeBillingOperationSummary,
  StripeBillingQuote,
} from "@/api/generator/types/stripe-billing";

export const STRIPE_BILLING_RETURN_PATH = "/app/profissional/assinatura/retorno";
const OPERATION_ID = /^[a-z0-9-]{16,64}$/i;

export const stripeBillingConfirmationKind = (
  value: unknown,
): StripeBillingConfirmationKind | null => (value === "setup" || value === "action" ? value : null);

export const canRetryStripeBillingOperation = (state: unknown) => state === "failed";

export const stripeBillingOperationErrorCode = (
  value: unknown,
): StripeBillingOperationErrorCode | null =>
  value === "billing_payment_method_credit_card_only" ||
  value === "billing_payment_method_update_required"
    ? value
    : null;

/** Only the scoped pending operation returned by the server bypasses the active-checkout redirect. */
export const isStripeBillingActionPending = (operation?: StripeBillingOperationSummary | null) =>
  operation?.kind === "checkout" &&
  operation.confirmation_kind === "action" &&
  operation.state !== "complete" &&
  operation.state !== "failed";

/** Financial confirmation belongs to the server. This client can only set up or authenticate. */
export const readStripeBillingConfirmation = (result: StripeBillingOperationResponse | null) => {
  const operation = result?.operation;
  const confirmation = operation?.confirmation;
  const kind = stripeBillingConfirmationKind(confirmation?.type);
  if (
    operation?.state !== "requires_confirmation" ||
    !confirmation ||
    !kind ||
    (operation.confirmation_kind != null && operation.confirmation_kind !== kind) ||
    typeof confirmation.client_secret !== "string" ||
    confirmation.client_secret.length > 512 ||
    /[^A-Za-z0-9_]/.test(confirmation.client_secret) ||
    !(
      kind === "setup"
        ? /^seti_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/
        : /^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/
    ).test(confirmation.client_secret)
  )
    return null;
  return { type: kind, client_secret: confirmation.client_secret };
};

/** An inactive Stripe projection does not prove that its original payment is still pending. */
export const stripeInactiveBillingCopy = (
  subscription?: { gateway?: string | null; status?: string | null } | null,
) =>
  subscription?.gateway === "stripe" && subscription.status === "inativa"
    ? {
        label: "Sem período ativo",
        title: "Confira sua assinatura",
        message:
          "Não há período pago vigente confirmado. Confira o histórico de pagamentos e o status da assinatura antes de tentar novamente.",
      }
    : null;

/** Called only after the backend confirms the operation; current benefits remain a separate fact. */
export const stripeCompletedOperationDestination = (input: {
  kind: StripeBillingKind;
  hasCurrentProfessionalBenefits: boolean;
  courtesy: boolean;
}) =>
  input.kind === "checkout" && input.hasCurrentProfessionalBenefits && !input.courtesy
    ? "onboarding"
    : "billing";

export const isStripePublishableKey = (value: unknown): value is string =>
  typeof value === "string" && /^pk_(?:test|live)_[A-Za-z0-9]{20,256}$/.test(value);

export const isStripeBillingQuoteValid = (
  quote?: StripeBillingQuote,
): quote is StripeBillingQuote =>
  Boolean(
    quote &&
      typeof quote.revision === "string" &&
      quote.revision.length > 0 &&
      quote.currency === "brl" &&
      quote.interval === "month" &&
      Number.isSafeInteger(quote.amount_cents) &&
      quote.amount_cents > 0 &&
      Number.isSafeInteger(quote.amount_due_now_cents) &&
      (quote.intent === "subscription"
        ? quote.amount_due_now_cents === quote.amount_cents
        : quote.intent === "courtesy_renewal" &&
          quote.amount_due_now_cents === 0 &&
          Boolean(
            quote.scheduled_start_at && Number.isFinite(Date.parse(quote.scheduled_start_at)),
          )),
  );

export const readStripeBillingReturn = (search: string) => {
  const params = new URLSearchParams(search);
  const flow = params.get("flow");
  const id = params.get("operation");
  if ((flow !== "checkout" && flow !== "payment-method") || !id || !OPERATION_ID.test(id))
    return null;
  return { id, kind: flow === "checkout" ? ("checkout" as const) : ("payment_method" as const) };
};

export const cleanStripeBillingReturnSearch = (search: string) => {
  const operation = readStripeBillingReturn(search);
  if (!operation) return "";
  const params = new URLSearchParams({
    flow: operation.kind === "checkout" ? "checkout" : "payment-method",
    operation: operation.id,
  });
  return `?${params.toString()}`;
};

export const buildStripeBillingReturnUrl = (
  origin: string,
  kind: StripeBillingKind,
  id: string,
) => {
  if (!OPERATION_ID.test(id)) throw new Error("Invalid billing operation");
  const url = new URL(STRIPE_BILLING_RETURN_PATH, origin);
  url.search = cleanStripeBillingReturnSearch(
    new URLSearchParams({
      flow: kind === "checkout" ? "checkout" : "payment-method",
      operation: id,
    }).toString(),
  );
  return url.toString();
};

const STRIPE_ERROR_COPY: Record<string, string> = {
  incomplete_number: "Confira o número do cartão.",
  invalid_number: "Confira o número do cartão.",
  incorrect_number: "Confira o número do cartão.",
  incomplete_expiry: "Confira a validade do cartão.",
  invalid_expiry_month: "Confira a validade do cartão.",
  invalid_expiry_year: "Confira a validade do cartão.",
  expired_card: "Confira a validade do cartão ou use outro cartão.",
  incomplete_cvc: "Confira o código de segurança do cartão.",
  invalid_cvc: "Confira o código de segurança do cartão.",
  incorrect_cvc: "Confira o código de segurança do cartão.",
  card_declined: "Não foi possível aprovar este cartão. Use outro cartão ou consulte seu banco.",
};

export const getStripeElementErrorMessage = (error: unknown) => {
  const record =
    typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;
  const code = record?.code;
  if (typeof code === "string" && Object.hasOwn(STRIPE_ERROR_COPY, code))
    return STRIPE_ERROR_COPY[code];
  if (record?.type === "validation_error") return "Revise os dados do cartão para continuar.";
  return "Não foi possível concluir esta etapa. Confira o status da assinatura e se houve cobrança antes de tentar novamente.";
};
