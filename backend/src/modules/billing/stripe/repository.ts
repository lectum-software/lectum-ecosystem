import { randomUUID } from "node:crypto";
import type {
  billing_customer,
  billing_operation,
  Prisma,
} from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { StripeIdentity } from "../payment-gateway/stripe-types";
import {
  type CheckoutIntent,
  OPEN_OPERATION_STATES,
  type OperationKind,
  StripeBillingError,
} from "./policy";

import { STRIPE_MAX_CREATE_ATTEMPTS, TERMINAL_OPERATION_STATES } from "./recovery-policy";

const scope = (identity: StripeIdentity) => ({
  gateway: "stripe",
  mode: identity.mode,
  account_id: identity.accountId,
});
const availableLease = (now: Date) => ({
  OR: [{ lease_until: null }, { lease_until: { lte: now } }],
});
const lease = () => ({ lease_token: randomUUID(), lease_until: new Date(Date.now() + 120_000) });

export class StripeBillingRepository {
  profile(userId: string) {
    return prisma.psychologist_profile.findFirst({
      where: { user_id: userId, deleted: false, user: { active: true, deleted: false } },
      select: { id: true, user_id: true },
    });
  }

  subscriptions(psychologistId: string) {
    return prisma.professional_subscription.findMany({
      where: {
        psychologist_id: psychologistId,
        deleted: false,
        plan: { deleted: false, slug: "profissional" },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  pending(userId: string, identity: StripeIdentity, kind?: OperationKind) {
    return prisma.billing_operation.findFirst({
      where: {
        user_id: userId,
        ...scope(identity),
        kind: kind ?? { in: ["checkout", "payment_method"] },
        state: { in: OPEN_OPERATION_STATES },
      },
      orderBy: [{ kind: "desc" }, { created_at: "asc" }],
    });
  }

  operation(id: string, userId: string, identity: StripeIdentity) {
    return prisma.billing_operation.findFirst({
      where: { id, user_id: userId, ...scope(identity) },
    });
  }

  pendingCollection(userId: string, identity: StripeIdentity) {
    return prisma.billing_operation.findFirst({
      where: {
        user_id: userId,
        ...scope(identity),
        kind: "collection",
        state: { in: OPEN_OPERATION_STATES },
        intent_kind: "payment",
      },
      orderBy: { created_at: "asc" },
    });
  }

  price(id: string, identity: StripeIdentity) {
    return prisma.billing_price_version.findFirst({ where: { id, ...scope(identity) } });
  }

  async offer(identity: StripeIdentity) {
    const plan = await prisma.subscription_plan.findFirst({
      where: { slug: "profissional", active: true, deleted: false },
    });
    if (!plan) return null;
    const offer = await prisma.billing_offer.findFirst({
      where: { plan_id: plan.id, ...scope(identity), checkout_enabled: true },
    });
    if (!offer) return null;
    const price = await this.price(offer.price_version_id, identity);
    return price && price.plan_id === plan.id ? { plan, offer, price } : null;
  }

  private async lockedProfile(tx: Prisma.TransactionClient, userId: string) {
    const profiles = await tx.$queryRaw<Array<{ id: string }>>`
      UPDATE psychologist_profiles p SET updated_at = p.updated_at FROM users u
      WHERE u.id = p.user_id AND p.user_id = ${userId} AND p.deleted = false AND u.deleted = false AND u.active = true
      RETURNING p.id`;
    if (profiles.length !== 1) throw new StripeBillingError("billing_operation_not_found", 404);
    return profiles[0].id;
  }

  async reserveCheckout(input: {
    userId: string;
    identity: StripeIdentity;
    requestKey: string;
    quoteRevision: string;
    intent: CheckoutIntent;
  }) {
    return prisma.$transaction(async (tx) => {
      const psychologistId = await this.lockedProfile(tx, input.userId);
      const identity = scope(input.identity);
      const existing = await tx.billing_operation.findUnique({
        where: {
          user_id_gateway_mode_account_id_request_key: {
            user_id: input.userId,
            ...identity,
            request_key: input.requestKey,
          },
        },
      });
      if (existing) {
        if (existing.kind !== "checkout" || existing.intent !== input.intent)
          throw new StripeBillingError("billing_operation_conflict");
        return existing;
      }
      const pending = await tx.billing_operation.findFirst({
        where: {
          user_id: input.userId,
          ...identity,
          kind: "checkout",
          state: { in: OPEN_OPERATION_STATES },
        },
        orderBy: { created_at: "asc" },
      });
      if (pending) return pending;
      // The offer operator holds FOR UPDATE on this same plan. Serialize publication with new consent reservations.
      const lockedPlans = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM subscription_plans WHERE slug = 'profissional' FOR SHARE`;
      const plan =
        lockedPlans.length === 1
          ? await tx.subscription_plan.findFirst({
              where: { id: lockedPlans[0].id, active: true, deleted: false },
            })
          : null;
      if (!plan) throw new StripeBillingError("billing_checkout_disabled", 503);
      const offer = await tx.billing_offer.findFirst({
        where: { plan_id: plan.id, ...identity, checkout_enabled: true },
      });
      const price = offer
        ? await tx.billing_price_version.findFirst({
            where: { id: offer.price_version_id, plan_id: plan.id, ...identity },
          })
        : null;
      if (!offer || !price) throw new StripeBillingError("billing_checkout_disabled", 503);
      if (`${offer.id}:${offer.revision}` !== input.quoteRevision)
        throw new StripeBillingError("billing_quote_changed");
      const now = new Date();
      const contracts = await tx.professional_subscription.findMany({
        where: {
          psychologist_id: psychologistId,
          deleted: false,
          plan: { slug: { not: "gratuito" } },
        },
      });
      const courtesy = contracts.find(
        (row) =>
          row.source === "admin_grant" &&
          row.status === "ativa" &&
          row.current_period_end &&
          row.current_period_end > now,
      );
      const conflicts = contracts.some(
        (row) =>
          row.source !== "admin_grant" &&
          (row.status === "ativa" ||
            row.status === "inadimplente" ||
            (row.status === "inativa" && Boolean(row.gateway_subscription_id)) ||
            (row.status === "cancelada" && row.current_period_end && row.current_period_end > now)),
      );
      if (conflicts) throw new StripeBillingError("billing_operation_conflict");
      if (courtesy && input.intent !== "courtesy_renewal")
        throw new StripeBillingError("billing_courtesy_renewal_required");
      if (input.intent === "courtesy_renewal" && !courtesy)
        throw new StripeBillingError("billing_courtesy_unavailable");
      const customer = await tx.billing_customer.upsert({
        where: { user_id_gateway_mode_account_id: { user_id: input.userId, ...identity } },
        create: { user_id: input.userId, ...identity },
        update: {},
      });
      const subscription = await tx.professional_subscription.create({
        data: {
          psychologist_id: psychologistId,
          plan_id: plan.id,
          source: "stripe",
          gateway: "stripe",
          status: "inativa",
          gateway_mode: input.identity.mode,
          gateway_account_id: input.identity.accountId,
          price_version_id: price.id,
          contracted_amount_cents: price.amount_cents,
          contracted_currency: price.currency,
          contracted_interval: price.interval,
          contracted_interval_count: price.interval_count,
          collection_policy: "manual_credit_v1",
        },
      });
      return tx.billing_operation.create({
        data: {
          user_id: input.userId,
          psychologist_id: psychologistId,
          subscription_id: subscription.id,
          customer_id: customer.id,
          price_version_id: price.id,
          ...identity,
          kind: "checkout",
          intent: input.intent,
          request_key: input.requestKey,
          quote_revision: input.quoteRevision,
          scheduled_start_at: courtesy?.current_period_end ?? null,
        },
      });
    });
  }

  async reserveCard(userId: string, identity: StripeIdentity, requestKey: string) {
    return prisma.$transaction(async (tx) => {
      const psychologistId = await this.lockedProfile(tx, userId);
      const identityWhere = scope(identity);
      const existing = await tx.billing_operation.findUnique({
        where: {
          user_id_gateway_mode_account_id_request_key: {
            user_id: userId,
            ...identityWhere,
            request_key: requestKey,
          },
        },
      });
      if (existing) {
        if (existing.kind !== "payment_method")
          throw new StripeBillingError("billing_operation_conflict");
        return existing;
      }
      const pending = await tx.billing_operation.findFirst({
        where: {
          user_id: userId,
          ...identityWhere,
          kind: { in: ["checkout", "payment_method"] },
          state: { in: OPEN_OPERATION_STATES },
        },
      });
      if (pending) {
        if (pending.kind === "payment_method") return pending;
        const declined =
          pending.kind === "checkout" &&
          pending.provider_subscription_id &&
          (!pending.lease_until || pending.lease_until <= new Date()) &&
          (await tx.billing_operation.findFirst({
            where: {
              parent_operation_id: pending.id,
              kind: "collection",
              ...identityWhere,
              last_error_code: { in: ["payment_method_required", "card_credit_required"] },
              state: "requires_confirmation",
            },
          }));
        if (!declined) throw new StripeBillingError("billing_operation_conflict");
      }
      const subscriptions = await tx.professional_subscription.findMany({
        where: {
          psychologist_id: psychologistId,
          gateway: "stripe",
          gateway_mode: identity.mode,
          gateway_account_id: identity.accountId,
          gateway_subscription_id: { not: null },
          deleted: false,
          status: { in: ["ativa", "inadimplente", "inativa"] },
        },
        take: 2,
      });
      const customer = await tx.billing_customer.findUnique({
        where: { user_id_gateway_mode_account_id: { user_id: userId, ...identityWhere } },
      });
      if (subscriptions.length !== 1 || !customer?.external_customer_id)
        throw new StripeBillingError("billing_payment_method_subscription_required");
      return tx.billing_operation.create({
        data: {
          user_id: userId,
          psychologist_id: psychologistId,
          ...identityWhere,
          kind: "payment_method",
          request_key: requestKey,
          subscription_id: subscriptions[0].id,
          provider_subscription_id: subscriptions[0].gateway_subscription_id,
          price_version_id: subscriptions[0].price_version_id,
          customer_id: customer.id,
        },
      });
    });
  }

  async claimOperation(operation: billing_operation, creating = false) {
    const now = new Date();
    if (TERMINAL_OPERATION_STATES.includes(operation.state)) return null;
    if (creating && operation.state !== "reserved") return null;
    const token = lease();
    const result = await prisma.billing_operation.updateMany({
      where: {
        id: operation.id,
        updated_at: operation.updated_at,
        state: { notIn: TERMINAL_OPERATION_STATES },
        ...availableLease(now),
      },
      data: token,
    });
    return result.count ? { ...operation, ...token } : null;
  }

  checkpointRequest(operation: billing_operation, token: string, fingerprint: string) {
    return prisma.billing_operation.updateMany({
      where: {
        id: operation.id,
        lease_token: token,
        lease_until: { gt: new Date() },
        attempts: { lt: STRIPE_MAX_CREATE_ATTEMPTS },
        state: { notIn: TERMINAL_OPERATION_STATES },
        OR: [
          { request_fingerprint: fingerprint },
          { state: "reserved", request_fingerprint: null },
        ],
      },
      data: { request_fingerprint: fingerprint, state: "creating", attempts: { increment: 1 } },
    });
  }

  async finishOperation(
    id: string,
    token: string,
    data: Prisma.billing_operationUpdateManyMutationInput,
  ) {
    return prisma.billing_operation.updateMany({
      where: { id, lease_token: token, state: { notIn: TERMINAL_OPERATION_STATES } },
      data: { ...data, lease_token: null, lease_until: null },
    });
  }

  pinOperationReferences(
    operation: billing_operation,
    token: string,
    refs: {
      subscriptionId?: string;
      intentId?: string;
      intentKind?: string;
    },
  ) {
    return prisma.billing_operation.updateMany({
      where: {
        id: operation.id,
        lease_token: token,
        state: { notIn: TERMINAL_OPERATION_STATES },
        AND: [
          ...(refs.subscriptionId
            ? [
                {
                  OR: [
                    { provider_subscription_id: null },
                    { provider_subscription_id: refs.subscriptionId },
                  ],
                },
              ]
            : []),
          ...(refs.intentId
            ? [{ OR: [{ provider_intent_id: null }, { provider_intent_id: refs.intentId }] }]
            : []),
        ],
      },
      data: {
        ...(refs.subscriptionId ? { provider_subscription_id: refs.subscriptionId } : {}),
        ...(refs.intentId ? { provider_intent_id: refs.intentId } : {}),
        ...(refs.intentKind && refs.intentKind !== "none" ? { intent_kind: refs.intentKind } : {}),
      },
    });
  }

  pinCheckoutSetup(operation: billing_operation, token: string, setupIntentId: string) {
    return prisma.billing_operation.updateMany({
      where: {
        id: operation.id,
        lease_token: token,
        kind: "checkout",
        state: { notIn: TERMINAL_OPERATION_STATES },
        OR: [{ provider_setup_intent_id: null }, { provider_setup_intent_id: setupIntentId }],
      },
      data: { provider_setup_intent_id: setupIntentId },
    });
  }

  pinCheckoutMethod(operation: billing_operation, token: string, paymentMethodId: string) {
    return prisma.billing_operation.updateMany({
      where: {
        id: operation.id,
        lease_token: token,
        kind: "checkout",
        state: { notIn: TERMINAL_OPERATION_STATES },
        OR: [{ provider_payment_method_id: null }, { provider_payment_method_id: paymentMethodId }],
      },
      data: { provider_payment_method_id: paymentMethodId },
    });
  }

  customer(id: string, identity: StripeIdentity) {
    return prisma.billing_customer.findFirst({ where: { id, ...scope(identity) } });
  }

  customerForUser(userId: string, identity: StripeIdentity) {
    return prisma.billing_customer.findUnique({
      where: { user_id_gateway_mode_account_id: { user_id: userId, ...scope(identity) } },
    });
  }

  async claimCustomer(customer: billing_customer, fingerprint: string) {
    const token = lease();
    const result = await prisma.billing_customer.updateMany({
      where: {
        id: customer.id,
        updated_at: customer.updated_at,
        state: { in: ["reserved", "creating", "review_required"] },
        external_customer_id: null,
        ...availableLease(new Date()),
        AND: [
          {
            OR: [
              { request_fingerprint: fingerprint },
              { state: "reserved", request_fingerprint: null },
            ],
          },
        ],
      },
      data: { ...token, state: "creating", request_fingerprint: fingerprint },
    });
    return result.count ? token : null;
  }

  recoverCustomer(customer: billing_customer, externalCustomerId: string) {
    return prisma.billing_customer.updateMany({
      where: {
        id: customer.id,
        user_id: customer.user_id,
        gateway: "stripe",
        mode: customer.mode,
        account_id: customer.account_id,
        OR: [{ external_customer_id: null }, { external_customer_id: externalCustomerId }],
      },
      data: {
        external_customer_id: externalCustomerId,
        state: "ready",
        lease_token: null,
        lease_until: null,
      },
    });
  }

  finishCustomer(id: string, token: string, externalCustomerId: string | null) {
    return prisma.billing_customer.updateMany({
      where: { id, lease_token: token, state: "creating", external_customer_id: null },
      data: {
        external_customer_id: externalCustomerId,
        state: externalCustomerId ? "ready" : "review_required",
        lease_token: null,
        lease_until: null,
      },
    });
  }

  async userEmail(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, active: true, deleted: false },
      select: { email: true },
    });
    if (!user) throw new StripeBillingError("billing_operation_not_found", 404);
    return user.email;
  }

  async bindSubscription(operation: billing_operation, remoteId: string) {
    return prisma.professional_subscription.updateMany({
      where: {
        id: operation.subscription_id!,
        psychologist_id: operation.psychologist_id,
        gateway: "stripe",
        gateway_mode: operation.mode,
        gateway_account_id: operation.account_id,
        deleted: false,
        OR: [{ gateway_subscription_id: null }, { gateway_subscription_id: remoteId }],
      },
      data: { gateway_subscription_id: remoteId },
    });
  }
}
