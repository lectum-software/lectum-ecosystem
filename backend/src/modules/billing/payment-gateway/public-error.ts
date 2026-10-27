import { getPaymentGatewayErrorDetails } from "./error-log";
import { PAYMENT_DETAIL_TO_TRANSLATION } from "./payment-codes";

const CARD_DECLINE_HTTP_STATUS = 402;
const GATEWAY_UNAVAILABLE_HTTP_STATUS = 502;

const normalizeCode = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const resolvePaymentGatewayPublicError = (
  err: unknown,
  fallbackCode: string,
): { status: number; code: string } => {
  const details = getPaymentGatewayErrorDetails(err);
  const candidateCodes = [details.status_detail, details.error, ...(details.cause_codes ?? [])].map(
    normalizeCode,
  );

  for (const code of candidateCodes) {
    const translation = Object.hasOwn(PAYMENT_DETAIL_TO_TRANSLATION, code)
      ? PAYMENT_DETAIL_TO_TRANSLATION[code]
      : undefined;

    if (translation) {
      return {
        status: CARD_DECLINE_HTTP_STATUS,
        code: translation,
      };
    }
  }

  return {
    status: GATEWAY_UNAVAILABLE_HTTP_STATUS,
    code: fallbackCode,
  };
};
