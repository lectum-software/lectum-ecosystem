export type StripeCheckoutPriceSnapshot = {
  amount_cents: number;
  currency: string;
  interval: string;
  interval_count: number;
};

/** Product policy only; does not attest provider availability or a payment. */
export const isSupportedStripeCheckoutPrice = (price: StripeCheckoutPriceSnapshot) =>
  Number.isSafeInteger(price.amount_cents) &&
  price.amount_cents >= 50 &&
  price.amount_cents <= 99999999 &&
  price.currency === "BRL" &&
  price.interval === "month" &&
  price.interval_count === 1;
