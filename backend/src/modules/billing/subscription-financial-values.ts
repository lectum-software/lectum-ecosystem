/** Read-only amounts: a Stripe contract never borrows today's mutable catalog price. */
export type FinancialContract = {
  gateway?: string | null;
  source?: string | null;
  gateway_mode?: string | null;
  gateway_account_id?: string | null;
  contracted_amount_cents?: number | null;
  contracted_currency?: string | null;
  contracted_interval?: string | null;
  contracted_interval_count?: number | null;
  plan: { price_cents: number | null; interval?: string | null };
};

export const isStripeFinancialContract = (value: Pick<FinancialContract, "gateway" | "source">) =>
  value.gateway?.trim().toLowerCase() === "stripe" ||
  value.source?.trim().toLowerCase() === "stripe";

export const financialContractValue = (value: FinancialContract) => {
  if (!isStripeFinancialContract(value)) {
    return { amountCents: value.plan.price_cents, interval: value.plan.interval ?? null };
  }
  const valid =
    value.gateway === "stripe" &&
    value.source === "stripe" &&
    Number.isSafeInteger(value.contracted_amount_cents) &&
    Number(value.contracted_amount_cents) > 0 &&
    value.contracted_currency === "BRL" &&
    value.contracted_interval === "month" &&
    value.contracted_interval_count === 1;
  return {
    amountCents: valid ? value.contracted_amount_cents! : null,
    interval: valid ? value.contracted_interval! : null,
  };
};

export const financialContractSelection = {
  gateway_mode: true,
  gateway_account_id: true,
  gateway: true,
  source: true,
  contracted_amount_cents: true,
  contracted_currency: true,
  contracted_interval: true,
  contracted_interval_count: true,
} as const;

export const monthlyContractValue = (value: FinancialContract) => {
  const { amountCents, interval } = financialContractValue(value);
  if (amountCents === null) return null;
  return /year|ano|annual/i.test(interval ?? "") ? Math.round(amountCents / 12) : amountCents;
};

export const sumFinancialValues = (values: Array<number | null>) =>
  values.some((value) => value === null)
    ? null
    : values.reduce<number>((sum, value) => sum + value!, 0);

// The Stripe inbox records delivery references, not a complete monetary ledger. Never parse it as MP payments.
export const stripeFinancialCoverage = (
  subscriptions: Array<Pick<FinancialContract, "gateway" | "source">>,
) => !subscriptions.some(isStripeFinancialContract);

/** Mixed test/live/account rows may be inspected, but never silently summed together. */
export const stripeFinancialScopeAvailable = (
  subscriptions: FinancialContract[],
  env = process.env,
) =>
  subscriptions.every(
    (value) =>
      !isStripeFinancialContract(value) ||
      ((env.STRIPE_ENV === "test" || env.STRIPE_ENV === "live") &&
        Boolean(env.STRIPE_ACCOUNT_ID) &&
        value.gateway_mode === env.STRIPE_ENV &&
        value.gateway_account_id === env.STRIPE_ACCOUNT_ID),
  );

export const withFinancialContractPlan = <T extends FinancialContract>(value: T) => {
  if (!isStripeFinancialContract(value)) return value;
  const contract = financialContractValue(value);
  return {
    ...value,
    plan: { ...value.plan, price_cents: contract.amountCents, interval: contract.interval },
  };
};

/** Stripe persisted periods come only from canonical paid-invoice synchronization. */
export const stripePaidPeriodAt = (
  value: { status: string; createdAt: Date; current_period_end?: Date | null },
  at: Date,
) =>
  ["ativa", "cancelada"].includes(value.status) &&
  value.createdAt <= at &&
  value.current_period_end instanceof Date &&
  Number.isFinite(value.current_period_end.getTime()) &&
  value.current_period_end > at;
