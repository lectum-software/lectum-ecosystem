import { createHash } from "node:crypto";
import type { Prisma } from "@/external/generated/prisma/client";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import type { DeliveryJob } from "./delivery-jobs";
import { browserIdWithinConsent } from "./meta-browser-id";
import { buildConsentedMetaCapiPayload } from "./meta-capi";
import { metaTransmissionDecision } from "./meta-policy";
import { readMarketingRequestContext } from "./request-context";
import { reviewedUserSourceUrl, USER_DELIVERY_POLICY } from "./user-events";

type GuestJob = Pick<
  DeliveryJob,
  "user_id" | "consent_revision" | "conversion" | "source_ref" | "occurred_at"
> & { guest_token_hash?: string | null };

export async function resolveGuestContactSource(tx: Prisma.TransactionClient, job: GuestJob) {
  if (
    !job.guest_token_hash ||
    job.user_id ||
    job.consent_revision ||
    job.conversion !== "patient_contact"
  )
    return null;
  const action = await tx.important_action_event.findFirst({
    where: {
      id: job.source_ref,
      user_id: null,
      deleted: false,
      action_type: { in: ["whatsapp_click", "psychologist_video_whatsapp_click"] },
    },
    select: { createdAt: true },
  });
  return action?.createdAt.getTime() === job.occurred_at.getTime()
    ? { occurredAt: action.createdAt }
    : null;
}

export async function currentGuestContactEvidence(
  tx: Prisma.TransactionClient,
  job: GuestJob,
  now = new Date(),
) {
  if (
    !USER_DELIVERY_POLICY.documentVersion ||
    !job.guest_token_hash ||
    !(await resolveGuestContactSource(tx, job))
  )
    return null;
  const guest = await tx.marketing_guest_attribution.findUnique({
    where: { token_hash: job.guest_token_hash },
  });
  if (
    !guest ||
    guest.claimed ||
    guest.revoked ||
    guest.document_version !== USER_DELIVERY_POLICY.documentVersion ||
    guest.expires_at <= now ||
    guest.expires_at <= job.occurred_at ||
    guest.granted_at > job.occurred_at ||
    job.occurred_at > now ||
    now.getTime() - job.occurred_at.getTime() >= 7 * 86400000 ||
    !guest.browser_fbp ||
    !guest.browser_captured_at ||
    guest.browser_captured_at > job.occurred_at ||
    !browserIdWithinConsent(
      guest.browser_fbp,
      guest.granted_at.getTime(),
      guest.browser_captured_at.getTime(),
      now.getTime(),
    )
  )
    return null;
  return {
    fbp: guest.browser_fbp,
    consent: {
      purpose: "meta_ads_measurement" as const,
      documentVersion: guest.document_version,
      grantedAt: guest.granted_at.getTime(),
      expiresAt: guest.expires_at.getTime(),
      revokedAt: null,
    },
  };
}

export async function resolveGuestDeliveryEvidence(
  tx: Prisma.TransactionClient,
  job: DeliveryJob,
  now = new Date(),
) {
  if (job.expires_at <= now || !reviewedUserSourceUrl("patient_contact", job.source_url))
    return null;
  const current = await currentGuestContactEvidence(tx, job, now);
  if (!current) return null;
  const evidence = {
    consent: current.consent,
    candidate: {
      conversion: "patient_contact" as const,
      eventId: job.event_id,
      occurredAt: Math.floor(job.occurred_at.getTime() / 1000),
      sourceUrl: job.source_url!,
      fbp: current.fbp,
      ...(job.client_user_agent ? { clientUserAgent: job.client_user_agent } : {}),
      ...(job.client_ip_address ? { clientIpAddress: job.client_ip_address } : {}),
    },
    occurredAtMs: job.occurred_at.getTime(),
  };
  return buildConsentedMetaCapiPayload(
    evidence,
    [job.source_url!],
    current.consent.documentVersion,
    now.getTime(),
    USER_DELIVERY_POLICY.sourceUrls,
  )
    ? evidence
    : null;
}

// Called only with the canonical action just committed by the anonymous HTTP request.
// No lookup of older clicks and no account transfer is performed here.
export async function guestContactCommitted(input: {
  token: string;
  sourceRef: string;
  visitorId: string;
  sessionId: string;
  sourceUrl?: unknown;
  requestStartedAt: Date;
}) {
  if (!metaTransmissionDecision("patient_contact").allowed || !/^[a-f0-9]{64}$/.test(input.token))
    return { status: "blocked" as const };
  const sourceUrl = reviewedUserSourceUrl("patient_contact", input.sourceUrl);
  if (!sourceUrl) return { status: "ineligible" as const };
  try {
    return await withSerializableTransaction(async (tx) => {
      const now = new Date();
      const action = await tx.important_action_event.findFirst({
        where: {
          id: input.sourceRef,
          visitor_id: input.visitorId,
          session_id: input.sessionId,
          user_id: null,
          deleted: false,
          createdAt: { gte: input.requestStartedAt, lte: now },
          action_type: { in: ["whatsapp_click", "psychologist_video_whatsapp_click"] },
        },
        select: { createdAt: true },
      });
      if (!action) return { status: "ineligible" as const };
      const tokenHash = createHash("sha256").update(input.token).digest("hex");
      const ref = {
        user_id: null,
        consent_revision: null,
        guest_token_hash: tokenHash,
        conversion: "patient_contact",
        source_ref: input.sourceRef,
        occurred_at: action.createdAt,
      };
      if (!(await currentGuestContactEvidence(tx, ref, now)))
        return { status: "ineligible" as const };
      const context = readMarketingRequestContext(action.createdAt, now);
      // Missing request context also blocks replay from maintenance scripts or later requests.
      if (!context.client_user_agent) return { status: "ineligible" as const };
      const eventId = createHash("sha256").update(`guest-contact:${input.sourceRef}`).digest("hex");
      await tx.marketing_delivery_job.createMany({
        data: [
          {
            ...ref,
            ...context,
            event_id: eventId,
            source_url: sourceUrl,
            expires_at: new Date(action.createdAt.getTime() + 7 * 86400000),
            next_attempt_at: now,
          },
        ],
        skipDuplicates: true,
      });
      const row = await tx.marketing_delivery_job.findUnique({ where: { event_id: eventId } });
      if (
        !row ||
        row.guest_token_hash !== tokenHash ||
        row.source_ref !== input.sourceRef ||
        row.source_url !== sourceUrl
      )
        return { status: "ineligible" as const };
      return { status: "queued" as const, id: row.id };
    });
  } catch {
    return { status: "failed" as const };
  }
}
