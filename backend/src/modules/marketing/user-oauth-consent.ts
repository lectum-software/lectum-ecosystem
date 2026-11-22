import { createHash } from "node:crypto";
import type { Prisma } from "@/external/generated/prisma/client";
import { browserIdWithinConsent } from "./meta-browser-id";
import { type OAuthConsentReference, readOAuthConsentReference } from "./oauth-consent-reference";
import { registrationConsentLinked } from "./professional-events";
import { REGISTRATION_DELIVERY_POLICY } from "./registration-delivery";
import { persistUserEvent, reviewedUserSourceUrl, USER_DELIVERY_POLICY } from "./user-events";

export async function prepareUserOAuthConsent(
  tx: Prisma.TransactionClient,
  token: unknown,
  now = new Date(),
  observedSource?: unknown,
) {
  const documentVersion = USER_DELIVERY_POLICY.documentVersion;
  if (!documentVersion || typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const guest = await tx.marketing_guest_attribution.findUnique({
    where: { token_hash: tokenHash },
  });
  if (
    !guest ||
    guest.claimed ||
    guest.revoked ||
    guest.document_version !== documentVersion ||
    guest.granted_at > now ||
    guest.first_at < guest.granted_at ||
    guest.first_at > now ||
    guest.expires_at <= now
  )
    return null;
  const sourceUrl = reviewedUserSourceUrl("patient_registration", observedSource);
  return {
    ...(sourceUrl ? { sourceUrl } : {}),
    tokenHash,
    documentVersion,
    preparedAt: now.getTime(),
    expiresAt: Math.min(now.getTime() + 10 * 60_000, guest.expires_at.getTime()),
  };
}

// Called only inside the new-account transaction; an existing login never claims consent.
async function claimUserRegistrationConsent(
  tx: Prisma.TransactionClient,
  userId: string,
  input: OAuthConsentReference | undefined,
  now: Date,
  provider: "google" | "manual",
) {
  const ref = readOAuthConsentReference(input, now.getTime());
  if (
    !ref ||
    !USER_DELIVERY_POLICY.documentVersion ||
    ref.documentVersion !== USER_DELIVERY_POLICY.documentVersion
  )
    return false;
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (
    !user?.active ||
    user.deleted ||
    (user.role !== "paciente" && !(provider === "google" && user.role === "psicologo")) ||
    (user.role === "psicologo" &&
      ref.documentVersion !== REGISTRATION_DELIVERY_POLICY.documentVersion) ||
    user.provider !== provider ||
    user.createdAt.getTime() < ref.preparedAt ||
    user.createdAt > now
  )
    return false;
  if (await tx.marketing_consent.findUnique({ where: { user_id: userId } })) return false;
  const guest = await tx.marketing_guest_attribution.findUnique({
    where: { token_hash: ref.tokenHash },
  });
  if (
    !guest ||
    guest.claimed ||
    guest.revoked ||
    guest.document_version !== ref.documentVersion ||
    guest.granted_at.getTime() > ref.preparedAt ||
    guest.first_at < guest.granted_at ||
    guest.first_at.getTime() > ref.preparedAt ||
    guest.expires_at <= now
  )
    return false;
  const claimed = await tx.marketing_guest_attribution.updateMany({
    where: {
      token_hash: ref.tokenHash,
      claimed: false,
      revoked: false,
      document_version: ref.documentVersion,
      expires_at: { gt: now },
    },
    data: {
      claimed: true,
      browser_fbp: null,
      browser_captured_at: null,
      first_campaigns: {},
      last_campaigns: {},
    },
  });
  if (claimed.count !== 1) return false;
  await tx.marketing_consent.create({
    data: {
      user_id: userId,
      revision: 1,
      document_version: ref.documentVersion,
      granted_at: guest.granted_at,
      expires_at: guest.expires_at,
      events: {
        create: {
          revision: 1,
          action: provider === "google" ? "google_guest_claim" : "email_guest_claim",
          document_version: ref.documentVersion,
        },
      },
    },
  });
  await tx.marketing_attribution.create({
    data: {
      user_id: userId,
      consent_revision: 1,
      campaigns: {},
      captured_at: guest.first_at,
      source_consent_at: guest.granted_at,
      source_token_hash: ref.tokenHash,
      expires_at: guest.expires_at,
    },
  });
  if (
    guest.browser_fbp &&
    guest.browser_captured_at &&
    guest.browser_captured_at >= guest.granted_at &&
    guest.browser_captured_at.getTime() <= ref.preparedAt &&
    browserIdWithinConsent(
      guest.browser_fbp,
      guest.granted_at.getTime(),
      guest.browser_captured_at.getTime(),
      now.getTime(),
    )
  ) {
    await tx.marketing_browser_identifier.create({
      data: {
        token_hash: ref.tokenHash,
        user_id: userId,
        consent_revision: 1,
        fbp: guest.browser_fbp!,
        captured_at: guest.browser_captured_at,
        expires_at: guest.expires_at,
      },
    });
  }
  if (user.role === "psicologo") {
    await registrationConsentLinked(tx, userId, now);
  } else if (ref.sourceUrl && reviewedUserSourceUrl("patient_registration", ref.sourceUrl)) {
    await persistUserEvent(tx, "patient_registration", userId, userId, now, ref.sourceUrl);
  }
  return true;
}

export function claimUserOAuthConsent(
  tx: Prisma.TransactionClient,
  userId: string,
  input: OAuthConsentReference | undefined,
  now = new Date(),
) {
  return claimUserRegistrationConsent(tx, userId, input, now, "google");
}

export function claimUserEmailConsent(
  tx: Prisma.TransactionClient,
  userId: string,
  input: OAuthConsentReference | undefined,
  now = new Date(),
) {
  return claimUserRegistrationConsent(tx, userId, input, now, "manual");
}
