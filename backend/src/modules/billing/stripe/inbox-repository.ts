import { randomUUID } from "node:crypto";
import { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { StripeIdentity, StripeWebhookReference } from "../payment-gateway/stripe-types";

export class StripeInboxRepository {
  async enqueue(event: StripeWebhookReference) {
    const key = {
      gateway: "stripe",
      mode: event.mode,
      account_id: event.accountId,
      external_id: event.eventId,
    };
    try {
      return await prisma.billing_gateway_event.upsert({
        where: { gateway_mode_account_id_external_id: key },
        create: {
          ...key,
          type: event.type,
          resource_id: event.resourceId,
          provider_subscription_id: event.subscriptionId,
          api_version: event.apiVersion,
          gateway_created_at: event.created,
        },
        update: {},
      });
    } catch (error) {
      // Prisma may emulate upsert; a simultaneous signed delivery can win the unique key.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002")
        throw error;
      const existing = await prisma.billing_gateway_event.findUnique({
        where: { gateway_mode_account_id_external_id: key },
      });
      if (!existing) throw error;
      return existing;
    }
  }

  async claim(identity: StripeIdentity, now = new Date()) {
    const where = {
      gateway: "stripe",
      mode: identity.mode,
      account_id: identity.accountId,
      state: { in: ["pending", "processing"] },
      next_attempt_at: { lte: now },
      OR: [{ lease_until: null }, { lease_until: { lte: now } }],
    };
    const candidate = await prisma.billing_gateway_event.findFirst({
      where,
      orderBy: { next_attempt_at: "asc" },
    });
    if (!candidate) return null;
    const token = { lease_token: randomUUID(), lease_until: new Date(now.getTime() + 120_000) };
    const claimed = await prisma.billing_gateway_event.updateMany({
      where: { id: candidate.id, ...where },
      data: { ...token, state: "processing", attempts: { increment: 1 } },
    });
    return claimed.count ? { ...candidate, ...token, attempts: candidate.attempts + 1 } : null;
  }

  finish(id: string, token: string, data: Prisma.billing_gateway_eventUpdateManyMutationInput) {
    return prisma.billing_gateway_event.updateMany({
      where: { id, lease_token: token },
      data: { ...data, lease_token: null, lease_until: null },
    });
  }

  async setupCandidates(resourceId: string, identity: StripeIdentity, attemptId: string | null) {
    const scope = { gateway: "stripe", mode: identity.mode, account_id: identity.accountId };
    const operations = await prisma.billing_operation.findMany({
      where: {
        ...scope,
        OR: [
          { provider_intent_id: resourceId },
          { provider_setup_intent_id: resourceId },
          ...(attemptId ? [{ id: attemptId }] : []),
        ],
      },
      // More than one candidate is a conflict, never an arbitrary findFirst winner.
      take: 2,
    });
    const customers = await prisma.billing_customer.findMany({
      where: {
        ...scope,
        id: {
          in: operations.flatMap((operation) =>
            operation.customer_id ? [operation.customer_id] : [],
          ),
        },
      },
    });
    return operations.map((operation) => ({
      operation,
      customer: customers.find((customer) => customer.id === operation.customer_id) ?? null,
    }));
  }

  recoverableOperations(identity: StripeIdentity, now = new Date()) {
    return prisma.billing_operation.findMany({
      where: {
        gateway: "stripe",
        mode: identity.mode,
        account_id: identity.accountId,
        kind: { in: ["checkout", "payment_method"] },
        state: { in: ["requires_confirmation", "processing", "review_required", "creating"] },
        next_attempt_at: { lte: now },
        OR: [{ lease_until: null }, { lease_until: { lte: now } }],
      },
      take: 10,
      orderBy: { next_attempt_at: "asc" },
    });
  }

  deferOperation(id: string, nextAttempt: Date) {
    return prisma.billing_operation.updateMany({
      where: { id },
      data: { next_attempt_at: nextAttempt },
    });
  }
}
