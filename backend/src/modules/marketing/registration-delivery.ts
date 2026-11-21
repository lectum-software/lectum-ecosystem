import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { readStoredBrowserIdentifier } from "./browser-identifier-repository";
import type { DeliveryJob } from "./delivery-jobs";
import { resolveDeliverySource } from "./delivery-source";
import { buildConsentedMetaCapiPayload } from "./meta-capi";
import { registrationConsentStart } from "./registration-consent";

export type RegistrationDeliveryPolicy = {
  documentVersion: string | null;
  sourceUrl: string | null;
};

// Separate approval from Subscribe: its notice does not authorize registration.
export const REGISTRATION_DELIVERY_POLICY: RegistrationDeliveryPolicy = {
  documentVersion: "lectum-meta-measurement-2026-11-21-network-context",
  sourceUrl: "https://www.lectum.com.br/",
};

export async function resolveRegistrationDeliveryEvidence(
  tx: Prisma.TransactionClient,
  job: Parameters<typeof resolveDeliverySource>[1] &
    Partial<Pick<DeliveryJob, "client_user_agent" | "client_ip_address">>,
  policy = REGISTRATION_DELIVERY_POLICY,
  now = new Date(),
) {
  if (
    !policy.documentVersion ||
    !policy.sourceUrl ||
    job.conversion !== "professional_registration" ||
    !job.user_id ||
    !job.consent_revision
  )
    return null;
  const source = await resolveDeliverySource(tx, job);
  if (!source) return null;
  const grantedAt = await registrationConsentStart(
    tx,
    job.user_id,
    job.consent_revision,
    policy.documentVersion,
    source.occurredAt,
    now,
  );
  if (!grantedAt) return null;
  const attribution = await tx.marketing_attribution.findUnique({
    where: { user_id: job.user_id },
  });
  if (!attribution?.source_token_hash) return null;
  const browser = await readStoredBrowserIdentifier(
    tx,
    job.user_id,
    attribution.source_token_hash,
    job.consent_revision,
    policy.documentVersion,
    now,
  );
  const consent = await tx.marketing_consent.findUnique({ where: { user_id: job.user_id } });
  if (!browser || browser.captured_at > source.occurredAt || !consent?.expires_at) return null;
  const evidence = {
    consent: {
      purpose: "meta_ads_measurement" as const,
      documentVersion: policy.documentVersion,
      grantedAt: grantedAt.getTime(),
      expiresAt: consent.expires_at.getTime(),
      revokedAt: consent.revoked_at?.getTime() ?? null,
    },
    candidate: {
      conversion: "professional_registration" as const,
      eventId: job.event_id,
      occurredAt: Math.floor(source.occurredAt.getTime() / 1000),
      sourceUrl: policy.sourceUrl,
      fbp: browser.fbp,
      ...(job.client_user_agent ? { clientUserAgent: job.client_user_agent } : {}),
      ...(job.client_ip_address ? { clientIpAddress: job.client_ip_address } : {}),
    },
    occurredAtMs: source.occurredAt.getTime(),
  };
  return buildConsentedMetaCapiPayload(
    evidence,
    [policy.sourceUrl],
    policy.documentVersion,
    now.getTime(),
  )
    ? evidence
    : null;
}

export async function resolveRegistrationDelivery(job: DeliveryJob) {
  return prisma.$transaction((tx) => resolveRegistrationDeliveryEvidence(tx, job), {
    isolationLevel: "RepeatableRead",
  });
}
