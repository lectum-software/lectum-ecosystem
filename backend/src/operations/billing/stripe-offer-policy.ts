import type { billing_offer, billing_price_version } from "@/external/generated/prisma/client";
import type { StripeIdentity, StripePlan } from "@/modules/billing/payment-gateway/stripe-types";

export const STRIPE_OFFER_REASONS = [
  "initial_catalog",
  "enable_checkout",
  "pause_checkout",
  "replace_offer",
] as const;

export class StripeOfferError extends Error {
  constructor() {
    super("STRIPE_OFFER_OPERATION_BLOCKED");
    this.name = "StripeOfferError";
  }
}

export type StripeOfferArguments = {
  apply: boolean;
  expectedAccountId: string;
  expectedMode: "test" | "live";
  expectedRevision: number;
  priceId: string;
  actorAdminId: string;
  reason: (typeof STRIPE_OFFER_REASONS)[number];
  sales: "preserve" | "enable" | "disable";
};

export const assertStripeOfferActivationReady = (
  args: StripeOfferArguments,
  env: {
    STRIPE_WEBHOOK_SECRET?: string;
    BILLING_STRIPE_RECONCILIATION_ENABLED?: string;
  } = process.env,
) => {
  if (args.sales !== "enable") return;
  if (
    !/^whsec_[A-Za-z0-9]{1,250}$/.test(env.STRIPE_WEBHOOK_SECRET?.trim() ?? "") ||
    env.BILLING_STRIPE_RECONCILIATION_ENABLED !== "true"
  )
    throw new StripeOfferError();
};

export const parseStripeOfferArguments = (argv: string[]): StripeOfferArguments | null => {
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) return null;
  const flags = new Map<string, string | true>();
  const booleans = new Set(["--apply", "--enable-sales", "--disable-sales"]);
  const strings = new Set([
    "--account",
    "--mode",
    "--price",
    "--expected-revision",
    "--actor-admin-id",
    "--reason",
  ]);
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flags.has(flag)) throw new StripeOfferError();
    if (booleans.has(flag)) flags.set(flag, true);
    else {
      if (!strings.has(flag)) throw new StripeOfferError();
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new StripeOfferError();
      flags.set(flag, value);
    }
  }
  const account = flags.get("--account");
  const mode = flags.get("--mode");
  const price = flags.get("--price");
  const revision = flags.get("--expected-revision");
  const actor = flags.get("--actor-admin-id");
  const reason = flags.get("--reason");
  if (
    typeof account !== "string" ||
    !/^acct_[A-Za-z0-9]{1,100}$/.test(account) ||
    (mode !== "test" && mode !== "live") ||
    typeof price !== "string" ||
    !/^price_[A-Za-z0-9]{1,100}$/.test(price) ||
    typeof revision !== "string" ||
    !/^(0|[1-9][0-9]{0,8})$/.test(revision) ||
    typeof actor !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(actor) ||
    typeof reason !== "string" ||
    !STRIPE_OFFER_REASONS.includes(reason as StripeOfferArguments["reason"]) ||
    (flags.has("--enable-sales") && flags.has("--disable-sales"))
  )
    throw new StripeOfferError();
  return {
    apply: flags.has("--apply"),
    expectedAccountId: account,
    expectedMode: mode,
    expectedRevision: Number(revision),
    priceId: price,
    actorAdminId: actor,
    reason: reason as StripeOfferArguments["reason"],
    sales: flags.has("--enable-sales")
      ? "enable"
      : flags.has("--disable-sales")
        ? "disable"
        : "preserve",
  };
};

export const assertStripeOfferPrice = (
  args: StripeOfferArguments,
  identity: StripeIdentity,
  price: StripePlan,
) => {
  if (
    identity.accountId !== args.expectedAccountId ||
    identity.mode !== args.expectedMode ||
    price.accountId !== identity.accountId ||
    price.mode !== identity.mode ||
    price.priceId !== args.priceId ||
    !price.active ||
    price.amountCents !== 2990 ||
    price.currency !== "BRL" ||
    price.interval !== "month" ||
    price.intervalCount !== 1
  )
    throw new StripeOfferError();
};

export const assertImmutableStripePrice = (
  stored: billing_price_version,
  planId: string,
  price: StripePlan,
) => {
  if (
    stored.plan_id !== planId ||
    stored.gateway !== "stripe" ||
    stored.mode !== price.mode ||
    stored.account_id !== price.accountId ||
    stored.external_price_id !== price.priceId ||
    stored.external_product_id !== price.productId ||
    stored.amount_cents !== price.amountCents ||
    stored.currency !== price.currency ||
    stored.interval !== price.interval ||
    stored.interval_count !== price.intervalCount
  )
    throw new StripeOfferError();
};

export const planStripeOfferChange = (
  args: StripeOfferArguments,
  current: billing_offer | null,
  samePrice: boolean,
) => {
  if (
    (current?.revision ?? 0) !== args.expectedRevision ||
    (current &&
      (current.account_id !== args.expectedAccountId ||
        current.mode !== args.expectedMode ||
        current.gateway !== "stripe"))
  )
    throw new StripeOfferError();
  const enabled =
    args.sales === "enable" ||
    (args.sales === "preserve" && samePrice && current?.checkout_enabled === true);
  const changed = !current || !samePrice || current.checkout_enabled !== enabled;
  return { enabled, changed, revision: (current?.revision ?? 0) + (changed ? 1 : 0) };
};
