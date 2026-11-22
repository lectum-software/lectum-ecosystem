import type { Prisma } from "@/external/generated/prisma/client";
import { hasAdvertisingConsent } from "./acquisition-policy";
import { readStoredBrowserIdentifier } from "./browser-identifier-repository";
import { CHECKOUT_SOURCE_URL } from "./checkout-policy";
import { MARKETING_CONSENT_POLICY } from "./consent-policy";

// A consented checkout is sufficient; an advertising campaign is not required.
export async function subscriptionCheckoutConsent(
  tx: Prisma.TransactionClient,
  userId: string,
  operationId: string,
  paidAt: Date,
  now = new Date(),
  documentVersion = MARKETING_CONSENT_POLICY.documentVersion,
  sourceUrl = CHECKOUT_SOURCE_URL,
) {
  const context = await tx.marketing_checkout_context.findUnique({
    where: { operation_id: operationId },
  });
  const consent = await tx.marketing_consent.findUnique({ where: { user_id: userId } });
  if (
    !documentVersion ||
    !context ||
    !consent?.granted_at ||
    !consent.expires_at ||
    context.document_version !== documentVersion ||
    context.source_url !== sourceUrl ||
    context.captured_at > paidAt ||
    context.expires_at <= now ||
    consent.document_version !== documentVersion
  )
    return null;
  const evidence = {
    purpose: "meta_ads_measurement" as const,
    documentVersion,
    grantedAt: consent.granted_at.getTime(),
    expiresAt: consent.expires_at.getTime(),
    revokedAt: consent.revoked_at?.getTime() ?? null,
  };
  if (
    !hasAdvertisingConsent(evidence, paidAt.getTime()) ||
    !hasAdvertisingConsent(evidence, now.getTime())
  )
    return null;
  const browser = await readStoredBrowserIdentifier(
    tx,
    userId,
    context.token_hash,
    consent.revision,
    documentVersion,
    now,
  );
  if (!browser || browser.captured_at > context.captured_at) return null;
  return { userId, revision: consent.revision, documentVersion };
}
