const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const SUBSCRIPTION_REFERENCE_KEYS = new Set([
  "preapproval_id",
  "external_reference",
  "subscription_id",
  "gateway_subscription_id",
]);

// A description containing an ID is not an ownership relationship. Conflicting
// explicit references must not make a single event visible to multiple owners.
export const valueContainsReference = (
  value: unknown,
  references: string[],
  depth = 0,
): boolean => {
  if (references.length === 0 || depth > 8) return false;
  let matched = false;
  let conflicting = false;
  const visit = (current: unknown, level: number) => {
    if (current === null || typeof current !== "object") return;
    if (level > 8) {
      conflicting = true;
      return;
    }
    if (Array.isArray(current)) {
      for (const item of current) visit(item, level + 1);
      return;
    }
    for (const [key, item] of Object.entries(current)) {
      if (SUBSCRIPTION_REFERENCE_KEYS.has(key.toLowerCase()) && item !== null) {
        const reference = typeof item === "string" ? item.trim() : null;
        if (reference && references.includes(reference)) matched = true;
        else if (reference !== "") conflicting = true;
      }
      visit(item, level + 1);
    }
  };
  visit(value, depth);
  return matched && !conflicting;
};

export const findPayloadValue = (value: unknown, keys: string[], depth = 0): unknown => {
  if (depth > 8) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPayloadValue(item, keys, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const record = asRecord(value);
  if (!record) return undefined;

  // Key priority must not depend on the provider's JSON property order.
  const entries = Object.entries(record);
  for (const key of keys) {
    const entry = entries.find(([name]) => name.toLowerCase() === key.toLowerCase());
    if (entry) return entry[1];
  }
  for (const item of Object.values(record)) {
    const found = findPayloadValue(item, keys, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
};

export const paymentStatus = (payload: unknown) => {
  // authorized_payments has an installment status outside payment.status.
  // "processed" may contain a rejected payment; never infer settlement from it.
  // https://www.mercadopago.com.br/developers/en/reference/online-payments/subscriptions/get-authorized-payment/get
  const payment = findPayloadValue(payload, ["payment"]);
  const value = findPayloadValue(payment === undefined ? payload : payment, [
    "status",
    "payment_status",
    "status_detail",
  ]);
  return typeof value === "string" ? value.trim().toLowerCase() : "";
};

export const isConfirmedPaymentStatus = (payload: unknown) =>
  ["approved", "accredited", "paid"].includes(paymentStatus(payload));

export const toAmountCents = (value: unknown): number | null => {
  const raw = asRecord(value)?.value ?? value;
  if (typeof raw !== "number" && typeof raw !== "string") return null;
  if (typeof raw === "string" && !/^\d+(?:[.,]\d{1,2})?$/.test(raw.trim())) return null;

  const amount = typeof raw === "number" ? raw : Number(raw.trim().replace(",", "."));
  const cents = Math.round(amount * 100);
  return Number.isFinite(amount) && amount >= 0 && Number.isSafeInteger(cents) ? cents : null;
};
