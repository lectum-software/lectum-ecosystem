import { getPaymentGatewayErrorDetails } from "./error-log";

const CARD_DECLINE_HTTP_STATUS = 402;
const GATEWAY_UNAVAILABLE_HTTP_STATUS = 502;

const PAYMENT_DETAIL_TO_TRANSLATION: Record<string, string> = {
  atte: "billing_gateway_card_max_attempts",
  bad_filled_date: "billing_gateway_card_expiration",
  blac: "billing_gateway_card_declined",
  call: "billing_gateway_card_authorization",
  card: "billing_gateway_card_number",
  card_disabled: "billing_gateway_card_disabled",
  card_insufficient_amount: "billing_gateway_card_insufficient_amount",
  cc_amount_rate_limit_exceeded: "billing_gateway_card_limit",
  cc_rejected_bad_filled_card_number: "billing_gateway_card_number",
  cc_rejected_bad_filled_date: "billing_gateway_card_expiration",
  cc_rejected_bad_filled_other: "billing_gateway_card_data",
  cc_rejected_bad_filled_security_code: "billing_gateway_card_security_code",
  cc_rejected_blacklist: "billing_gateway_card_declined",
  cc_rejected_call_for_authorize: "billing_gateway_card_authorization",
  cc_rejected_card_disabled: "billing_gateway_card_disabled",
  cc_rejected_card_error: "billing_gateway_card_declined",
  cc_rejected_duplicated_payment: "billing_gateway_card_duplicate",
  cc_rejected_high_risk: "billing_gateway_card_declined",
  cc_rejected_insufficient_amount: "billing_gateway_card_insufficient_amount",
  cc_rejected_invalid_installments: "billing_gateway_card_type",
  cc_rejected_max_attempts: "billing_gateway_card_max_attempts",
  cc_rejected_other_reason: "billing_gateway_card_declined",
  cc_rejected_time_out: "billing_gateway_card_declined",
  cont: "billing_gateway_payment_pending",
  ctna: "billing_gateway_card_type",
  dupl: "billing_gateway_card_duplicate",
  expi: "billing_gateway_card_expiration",
  form: "billing_gateway_card_data",
  fund: "billing_gateway_card_insufficient_amount",
  insufficient_amount: "billing_gateway_card_insufficient_amount",
  inst: "billing_gateway_card_type",
  invalid_installments: "billing_gateway_card_type",
  lock: "billing_gateway_card_disabled",
  max_attempts_exceeded: "billing_gateway_card_max_attempts",
  othe: "billing_gateway_card_declined",
  rejected_by_bank: "billing_gateway_card_declined",
  rejected_by_biz_rule: "billing_gateway_card_declined",
  rejected_by_regulations: "billing_gateway_card_declined",
  rejected_high_risk: "billing_gateway_card_declined",
  rejected_insufficient_data: "billing_gateway_card_data",
  secu: "billing_gateway_card_security_code",
  unsu: "billing_gateway_card_type",
};

const normalizeCode = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const isGatewayCardRejectionStatus = (status?: number) =>
  status === 400 || status === 402 || status === 409 || status === 422;

export const resolvePaymentGatewayPublicError = (
  err: unknown,
  fallbackCode: string,
): { status: number; code: string } => {
  const details = getPaymentGatewayErrorDetails(err);
  const candidateCodes = [details.status_detail, details.error, ...(details.cause_codes ?? [])].map(
    normalizeCode,
  );

  for (const code of candidateCodes) {
    const translation = PAYMENT_DETAIL_TO_TRANSLATION[code];

    if (translation) {
      return {
        status: CARD_DECLINE_HTTP_STATUS,
        code: translation,
      };
    }
  }

  if (isGatewayCardRejectionStatus(details.status)) {
    return {
      status: CARD_DECLINE_HTTP_STATUS,
      code: "billing_gateway_card_declined",
    };
  }

  return {
    status: GATEWAY_UNAVAILABLE_HTTP_STATUS,
    code: fallbackCode,
  };
};
