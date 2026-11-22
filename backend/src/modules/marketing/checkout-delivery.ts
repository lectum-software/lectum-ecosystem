import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { readStoredBrowserIdentifier } from "./browser-identifier-repository";
import { reviewedCheckoutPolicy } from "./checkout-policy";
import type { DeliveryJob } from "./delivery-jobs";
import { resolveDeliverySource } from "./delivery-source";
import { buildConsentedMetaCapiPayload } from "./meta-capi";

export type CheckoutDeliveryPolicy = {
  documentVersion: string | null;
  sourceUrls: readonly string[];
  accountId: string | null;
};

const reviewed = reviewedCheckoutPolicy();
// Checkout is separate from Subscribe and requires the configured live account.
export const CHECKOUT_DELIVERY_POLICY: CheckoutDeliveryPolicy = {
  documentVersion: reviewed.documentVersion,
  sourceUrls: reviewed.sourceUrl ? [reviewed.sourceUrl] : [],
  accountId: reviewed.accountId,
};

export async function resolveCheckoutDeliveryEvidence(
  tx: Prisma.TransactionClient,
  job: Parameters<typeof resolveDeliverySource>[1],
  policy = CHECKOUT_DELIVERY_POLICY,
  now = new Date(),
) {
  if (
    !policy.documentVersion ||
    !policy.accountId ||
    !policy.sourceUrls.length ||
    job.conversion !== "professional_checkout" ||
    !job.user_id ||
    !job.consent_revision
  )
    return null;
  const source = await resolveDeliverySource(tx, job);
  if (!source?.operationId || source.accountId !== policy.accountId) return null;
  const context = await tx.marketing_checkout_context.findUnique({
    where: { operation_id: source.operationId },
  });
  if (
    !context ||
    context.document_version !== policy.documentVersion ||
    context.expires_at <= now ||
    context.captured_at < source.occurredAt ||
    context.captured_at > now ||
    !policy.sourceUrls.includes(context.source_url)
  )
    return null;
  const browser = await readStoredBrowserIdentifier(
    tx,
    job.user_id,
    context.token_hash,
    job.consent_revision,
    policy.documentVersion,
    now,
  );
  const consent = await tx.marketing_consent.findUnique({ where: { user_id: job.user_id } });
  if (
    !browser ||
    browser.captured_at > source.occurredAt ||
    !consent?.granted_at ||
    !consent.expires_at ||
    consent.revision !== job.consent_revision ||
    consent.document_version !== policy.documentVersion
  )
    return null;
  const evidence = {
    consent: {
      purpose: "meta_ads_measurement" as const,
      documentVersion: consent.document_version,
      grantedAt: consent.granted_at.getTime(),
      expiresAt: consent.expires_at.getTime(),
      revokedAt: consent.revoked_at?.getTime() ?? null,
    },
    candidate: {
      conversion: "professional_checkout" as const,
      eventId: job.event_id,
      occurredAt: Math.floor(source.occurredAt.getTime() / 1000),
      sourceUrl: context.source_url,
      fbp: browser.fbp,
      clientUserAgent: context.client_user_agent,
    },
    occurredAtMs: source.occurredAt.getTime(),
  };
  return buildConsentedMetaCapiPayload(
    evidence,
    policy.sourceUrls,
    policy.documentVersion,
    now.getTime(),
  )
    ? evidence
    : null;
}

export async function resolveCheckoutDelivery(job: DeliveryJob) {
  return prisma.$transaction((tx) => resolveCheckoutDeliveryEvidence(tx, job), {
    isolationLevel: "RepeatableRead",
  });
}
