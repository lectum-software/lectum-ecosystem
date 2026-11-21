import type { Prisma } from "@/external/generated/prisma/client";
import type { DeliveryJob } from "./delivery-jobs";
import { resolveDeliverySource } from "./delivery-source";
import { browserIdWithinConsent } from "./meta-browser-id";
import { buildConsentedMetaCapiPayload } from "./meta-capi";
import { isUserConversion, reviewedUserSourceUrl, USER_DELIVERY_POLICY } from "./user-events";

export async function resolveUserDeliveryEvidence(
  tx: Prisma.TransactionClient,
  job: DeliveryJob,
  now = new Date(),
) {
  const documentVersion = USER_DELIVERY_POLICY.documentVersion;
  if (
    !documentVersion ||
    !isUserConversion(job.conversion) ||
    !job.user_id ||
    !job.consent_revision ||
    job.expires_at <= now ||
    !reviewedUserSourceUrl(job.conversion, job.source_url)
  )
    return null;
  const source = await resolveDeliverySource(tx, job);
  if (!source) return null;
  const consent = await tx.marketing_consent.findUnique({
    where: { user_id: job.user_id },
    include: { attribution: true },
  });
  const attribution = consent?.attribution;
  if (
    !consent?.granted_at ||
    !consent.expires_at ||
    consent.revoked_at ||
    consent.revision !== job.consent_revision ||
    consent.document_version !== documentVersion ||
    !attribution?.source_token_hash ||
    attribution.consent_revision !== consent.revision ||
    !attribution.expires_at ||
    attribution.expires_at <= now
  )
    return null;
  const guest = await tx.marketing_guest_attribution.findUnique({
    where: { token_hash: attribution.source_token_hash },
  });
  const browser = await tx.marketing_browser_identifier.findUnique({
    where: { token_hash: attribution.source_token_hash },
  });
  if (
    !guest?.claimed ||
    guest.revoked ||
    guest.expires_at <= now ||
    guest.document_version !== documentVersion ||
    guest.granted_at.getTime() !== consent.granted_at.getTime() ||
    attribution.source_consent_at?.getTime() !== guest.granted_at.getTime() ||
    !browser ||
    browser.user_id !== job.user_id ||
    browser.consent_revision !== consent.revision ||
    browser.expires_at <= now ||
    browser.captured_at > source.occurredAt ||
    !browserIdWithinConsent(
      browser.fbp,
      consent.granted_at.getTime(),
      browser.captured_at.getTime(),
      now.getTime(),
    )
  )
    return null;
  const evidence = {
    consent: {
      purpose: "meta_ads_measurement" as const,
      documentVersion,
      grantedAt: consent.granted_at.getTime(),
      expiresAt: Math.min(consent.expires_at.getTime(), guest.expires_at.getTime()),
      revokedAt: null,
    },
    candidate: {
      conversion: job.conversion,
      eventId: job.event_id,
      occurredAt: Math.floor(source.occurredAt.getTime() / 1000),
      sourceUrl: job.source_url!,
      fbp: browser.fbp,
      ...(job.client_user_agent ? { clientUserAgent: job.client_user_agent } : {}),
      ...(job.client_ip_address ? { clientIpAddress: job.client_ip_address } : {}),
    },
    occurredAtMs: source.occurredAt.getTime(),
  };
  return buildConsentedMetaCapiPayload(
    evidence,
    [job.source_url!],
    documentVersion,
    now.getTime(),
    USER_DELIVERY_POLICY.sourceUrls,
  )
    ? evidence
    : null;
}

export async function resolveUserDelivery(job: DeliveryJob) {
  const { default: prisma } = await import("@/infra/database/prisma");
  return prisma.$transaction((tx) => resolveUserDeliveryEvidence(tx, job), {
    isolationLevel: "RepeatableRead",
  });
}
