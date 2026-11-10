import type { billing_gateway_event } from "@/external/generated/prisma/client";
import { STRIPE_API_VERSION } from "@/modules/billing/payment-gateway/stripe-config";
import type { StripeIdentity } from "@/modules/billing/payment-gateway/stripe-types";

export const STRIPE_EVENT_REQUEUE_REASONS = [
  "provider_recovered",
  "configuration_corrected",
  "binding_reconciled",
] as const;

const AUDITABLE_ERROR_CODES = new Set([
  "reconciliation_unavailable",
  "setup_operation_unresolved",
  "setup_operation_conflict",
]);

export class StripeEventRequeueError extends Error {
  constructor() {
    super("STRIPE_EVENT_REQUEUE_BLOCKED");
    this.name = "StripeEventRequeueError";
  }
}

export type StripeEventRequeueArguments = {
  eventId: string;
  accountId: string;
  mode: "test" | "live";
  expectedAttempts: number;
  actorAdminId: string;
  reason: (typeof STRIPE_EVENT_REQUEUE_REASONS)[number];
  apply: boolean;
  confirm?: "test" | "live";
};

export const validateStripeEventRequeueArguments = (args: StripeEventRequeueArguments) => {
  if (
    !/^[A-Za-z0-9_-]{1,128}$/.test(args.eventId) ||
    !/^acct_[A-Za-z0-9]{1,100}$/.test(args.accountId) ||
    !["test", "live"].includes(args.mode) ||
    !Number.isInteger(args.expectedAttempts) ||
    args.expectedAttempts < 1 ||
    args.expectedAttempts >= 2_147_483_647 ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(args.actorAdminId) ||
    !STRIPE_EVENT_REQUEUE_REASONS.includes(args.reason) ||
    typeof args.apply !== "boolean" ||
    (args.confirm !== undefined && args.confirm !== args.mode) ||
    (args.apply && args.confirm !== args.mode)
  )
    throw new StripeEventRequeueError();
};

export const parseStripeEventRequeueArguments = (
  argv: string[],
): StripeEventRequeueArguments | null => {
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) return null;
  const flags = new Map<string, string | true>();
  const strings = new Set([
    "--event-id",
    "--account",
    "--mode",
    "--expected-attempts",
    "--actor-admin-id",
    "--reason",
    "--confirm",
  ]);
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flags.has(flag)) throw new StripeEventRequeueError();
    if (flag === "--apply") flags.set(flag, true);
    else {
      if (!strings.has(flag)) throw new StripeEventRequeueError();
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new StripeEventRequeueError();
      flags.set(flag, value);
    }
  }
  const eventId = flags.get("--event-id");
  const accountId = flags.get("--account");
  const mode = flags.get("--mode");
  const attempts = flags.get("--expected-attempts");
  const actorAdminId = flags.get("--actor-admin-id");
  const reason = flags.get("--reason");
  const confirm = flags.get("--confirm");
  if (
    typeof eventId !== "string" ||
    typeof accountId !== "string" ||
    (mode !== "test" && mode !== "live") ||
    typeof attempts !== "string" ||
    !/^[1-9][0-9]{0,9}$/.test(attempts) ||
    typeof actorAdminId !== "string" ||
    typeof reason !== "string" ||
    !STRIPE_EVENT_REQUEUE_REASONS.includes(reason as StripeEventRequeueArguments["reason"]) ||
    (confirm !== undefined && confirm !== "test" && confirm !== "live")
  )
    throw new StripeEventRequeueError();
  const args: StripeEventRequeueArguments = {
    eventId,
    accountId,
    mode,
    expectedAttempts: Number(attempts),
    actorAdminId,
    reason: reason as StripeEventRequeueArguments["reason"],
    apply: flags.has("--apply"),
    confirm,
  };
  validateStripeEventRequeueArguments(args);
  return args;
};

export const assertStripeEventRequeueEligible = (
  event: billing_gateway_event,
  args: StripeEventRequeueArguments,
  identity: StripeIdentity,
) => {
  if (
    args.mode !== identity.mode ||
    args.accountId !== identity.accountId ||
    event.id !== args.eventId ||
    event.gateway !== "stripe" ||
    event.mode !== identity.mode ||
    event.account_id !== identity.accountId ||
    event.api_version !== STRIPE_API_VERSION ||
    event.state !== "review_required" ||
    event.attempts !== args.expectedAttempts ||
    event.processed_at !== null ||
    event.lease_token !== null ||
    event.lease_until !== null ||
    (event.last_error_code !== null && !AUDITABLE_ERROR_CODES.has(event.last_error_code))
  )
    throw new StripeEventRequeueError();
};
