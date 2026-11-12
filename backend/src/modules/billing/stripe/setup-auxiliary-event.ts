import type { billing_gateway_event, Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { getStripeGateway } from "../payment-gateway";
import type {
  StripeAuxiliarySetupProof,
  StripeAuxiliarySetupScope,
} from "../payment-gateway/stripe-auxiliary-setup";
import type { StripeIdentity, StripeSetup } from "../payment-gateway/stripe-types";
import { StripeBillingError, stripeOperationReference } from "./policy";
import {
  AUXILIARY_SETUP_CANDIDATE_LIMIT,
  type AuxiliarySetupEvent,
  canInspectAuxiliaryStripeSetup,
  classifyAuxiliaryStripeSetup,
  matchesAuxiliarySetupProof,
} from "./setup-auxiliary-event-policy";

type LeasedEvent = billing_gateway_event & { lease_token: string };
const localScope = (identity: StripeIdentity) => ({
  gateway: "stripe",
  mode: identity.mode,
  account_id: identity.accountId,
});

async function classifyLocal(
  tx: Prisma.TransactionClient,
  event: AuxiliarySetupEvent,
  setup: StripeSetup,
  identity: StripeIdentity,
) {
  const scope = localScope(identity);
  const primary = await tx.billing_operation.findFirst({
    where: {
      ...scope,
      OR: [
        { provider_intent_id: event.resource_id },
        { provider_setup_intent_id: event.resource_id },
      ],
    },
    select: { id: true },
  });
  // A concurrent exact principal pin must return to the existing classifier, never this fallback.
  if (primary) return { action: "conflict" } as const;
  const customers = await tx.billing_customer.findMany({
    where: { ...scope, external_customer_id: setup.customerId },
    take: 2,
  });
  if (customers.length > 1) return { action: "conflict" } as const;
  if (!customers.length) return { action: "unresolved" } as const;
  const operations = await tx.billing_operation.findMany({
    where: {
      ...scope,
      customer_id: customers[0].id,
      kind: "checkout",
      state: "complete",
      provider_payment_method_id: setup.paymentMethodId,
    },
    take: AUXILIARY_SETUP_CANDIDATE_LIMIT + 1,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
  });
  if (operations.length > AUXILIARY_SETUP_CANDIDATE_LIMIT) return { action: "conflict" } as const;
  const subscriptions = await tx.professional_subscription.findMany({
    where: {
      id: { in: operations.flatMap((op) => (op.subscription_id ? [op.subscription_id] : [])) },
    },
  });
  const profiles = await tx.psychologist_profile.findMany({
    where: { id: { in: operations.map((op) => op.psychologist_id) } },
    select: { id: true, user_id: true },
  });
  return classifyAuxiliaryStripeSetup(
    event,
    setup,
    identity,
    operations.map((operation) => ({
      operation,
      customer: customers[0],
      subscription: subscriptions.find((sub) => sub.id === operation.subscription_id) ?? null,
      profile: profiles.find((profile) => profile.id === operation.psychologist_id) ?? null,
    })),
  );
}

export function readAuxiliaryStripeSetupCandidate(
  event: AuxiliarySetupEvent,
  setup: StripeSetup,
  identity: StripeIdentity,
) {
  if (!canInspectAuxiliaryStripeSetup(event, setup, identity))
    return Promise.resolve({ action: "unresolved" } as const);
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return classifyLocal(tx, event, setup, identity);
    },
    { isolationLevel: "RepeatableRead" },
  );
}

/** Only the leased inbox row changes. Recheck every local binding after remote GETs, atomically. */
export function finishAuxiliaryStripeSetupEvent(
  job: LeasedEvent,
  setup: StripeSetup,
  identity: StripeIdentity,
  expected: StripeAuxiliarySetupScope,
  proof: StripeAuxiliarySetupProof,
) {
  if (!matchesAuxiliarySetupProof(proof, expected, identity)) return Promise.resolve(false);
  return withSerializableTransaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM billing_gateway_events WHERE id = ${job.id} FOR UPDATE`;
    const acquiredAt = new Date();
    const current = await tx.billing_gateway_event.findUnique({ where: { id: job.id } });
    if (
      current?.state !== "processing" ||
      current.lease_token !== job.lease_token ||
      !current.lease_until ||
      current.lease_until <= acquiredAt ||
      current.gateway !== "stripe" ||
      current.mode !== identity.mode ||
      current.account_id !== identity.accountId ||
      current.external_id !== job.external_id ||
      current.type !== job.type ||
      current.resource_id !== job.resource_id ||
      current.provider_subscription_id !== job.provider_subscription_id ||
      current.api_version !== job.api_version ||
      current.gateway_created_at.getTime() !== job.gateway_created_at.getTime() ||
      current.request_idempotency_key_hash !== job.request_idempotency_key_hash
    )
      return false;
    const decision = await classifyLocal(tx, current, setup, identity);
    if (
      decision.action !== "verify" ||
      !matchesAuxiliarySetupProof(proof, decision.scope, identity)
    )
      return false;
    const finishedAt = new Date();
    const saved = await tx.billing_gateway_event.updateMany({
      where: {
        id: job.id,
        ...localScope(identity),
        state: "processing",
        lease_token: job.lease_token,
        lease_until: { gt: finishedAt },
        request_idempotency_key_hash: job.request_idempotency_key_hash,
      },
      data: {
        state: "complete",
        processed_at: finishedAt,
        last_error_code: null,
        lease_token: null,
        lease_until: null,
      },
    });
    return saved.count === 1;
  });
}

export async function acknowledgeAuxiliaryStripeSetupEvent(
  job: LeasedEvent,
  setup: StripeSetup,
  identity: StripeIdentity,
) {
  const decision = await readAuxiliaryStripeSetupCandidate(job, setup, identity);
  if (decision.action !== "verify") return decision.action;
  const proof = await getStripeGateway().readAuxiliarySetupProof(decision.scope);
  if (!(await finishAuxiliaryStripeSetupEvent(job, setup, identity, decision.scope, proof)))
    throw new StripeBillingError("billing_operation_pending");
  console.info("[BILLING_STRIPE] Evento auxiliar correlacionado por prova assinada.", {
    event_ref: stripeOperationReference(job.id),
    diagnostic: "auxiliary_setup_observed",
    provider_writes: 0,
  });
  return "complete" as const;
}
