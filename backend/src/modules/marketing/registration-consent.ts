import type { Prisma } from "@/external/generated/prisma/client";

// Only a claimed, server-recorded first grant can cover registration before account consent.
export async function registrationConsentStart(
  tx: Prisma.TransactionClient,
  userId: string,
  revision: number,
  documentVersion: string,
  occurredAt: Date,
  now: Date,
) {
  if (revision !== 1) return null;
  const account = await tx.marketing_consent.findUnique({
    where: { user_id: userId },
    include: { attribution: true, user: true },
  });
  const attribution = account?.attribution;
  if (
    !account?.granted_at ||
    account.revoked_at ||
    !account.expires_at ||
    account.expires_at <= now ||
    account.granted_at > now ||
    account.revision !== revision ||
    account.document_version !== documentVersion ||
    !account.user.active ||
    account.user.deleted ||
    account.user.role !== "psicologo" ||
    account.user.createdAt.getTime() !== occurredAt.getTime() ||
    !attribution?.source_token_hash ||
    !attribution.source_consent_at ||
    attribution.consent_revision !== revision ||
    !attribution.expires_at ||
    attribution.expires_at <= now ||
    attribution.captured_at > occurredAt
  )
    return null;
  const guest = await tx.marketing_guest_attribution.findUnique({
    where: { token_hash: attribution.source_token_hash },
  });
  if (
    !guest?.claimed ||
    guest.revoked ||
    guest.document_version !== documentVersion ||
    guest.granted_at > occurredAt ||
    guest.expires_at <= now ||
    guest.expires_at <= account.granted_at ||
    guest.granted_at.getTime() !== attribution.source_consent_at.getTime() ||
    guest.first_at.getTime() !== attribution.captured_at.getTime() ||
    guest.first_at < guest.granted_at
  )
    return null;
  return guest.granted_at;
}
