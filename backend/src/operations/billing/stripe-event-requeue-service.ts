import { readStripeConfiguration } from "@/modules/billing/payment-gateway/stripe-config";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import {
  assertStripeEventRequeueEligible,
  type StripeEventRequeueArguments,
  StripeEventRequeueError,
  validateStripeEventRequeueArguments,
} from "./stripe-event-requeue-policy";

/** One local inbox transition only. Never calls Stripe or executes the worker. */
export const requeueStripeEvent = async (args: StripeEventRequeueArguments) => {
  validateStripeEventRequeueArguments(args);
  const identity = readStripeConfiguration();
  if (args.mode !== identity.mode || args.accountId !== identity.accountId)
    throw new StripeEventRequeueError();
  return withSerializableTransaction(async (tx) => {
    const admin = await tx.admin.findFirst({
      where: {
        id: args.actorAdminId,
        active: true,
        confirmed: true,
        deleted: false,
        need_reset: false,
      },
      select: { id: true },
    });
    const event = await tx.billing_gateway_event.findUnique({ where: { id: args.eventId } });
    if (!admin || !event) throw new StripeEventRequeueError();
    assertStripeEventRequeueEligible(event, args, identity);
    const result = {
      mode: args.mode,
      eligible_events: 1,
      requeued_events: 0,
      applied: false,
      attempts_preserved: true,
      provider_calls: 0,
      worker_executed: false,
    };
    if (!args.apply) return result;
    const now = new Date();
    const changed = await tx.billing_gateway_event.updateMany({
      where: {
        id: event.id,
        gateway: "stripe",
        mode: identity.mode,
        account_id: identity.accountId,
        api_version: event.api_version,
        state: "review_required",
        attempts: args.expectedAttempts,
        processed_at: null,
        lease_token: null,
        lease_until: null,
        last_error_code: event.last_error_code,
        next_attempt_at: event.next_attempt_at,
      },
      // Preserve attempt count, references and the previous diagnostic until the worker finishes.
      data: { state: "pending", next_attempt_at: now },
    });
    if (changed.count !== 1) throw new StripeEventRequeueError();
    await tx.admin_activity_log.create({
      data: {
        admin_id: admin.id,
        target_type: "billing_gateway_event",
        target_id: event.id,
        domain: "billing",
        action: "stripe_event_requeued",
        source: "operator_cli",
        reason: args.reason,
        changed_fields: ["state", "next_attempt_at"],
        safe_before: {
          state: "review_required",
          attempts: event.attempts,
          last_error_code: event.last_error_code,
          next_attempt_at: event.next_attempt_at.toISOString(),
        },
        safe_after: {
          state: "pending",
          attempts: event.attempts,
          last_error_code: event.last_error_code,
          next_attempt_at: now.toISOString(),
        },
        metadata: {
          gateway: "stripe",
          mode: identity.mode,
          provider_calls: 0,
          worker_executed: false,
        },
      },
    });
    return { ...result, applied: true, requeued_events: 1 };
  });
};
