import { randomBytes } from "node:crypto";
import type { Prisma } from "@/external/generated/prisma/client";

export const USER_CONVERSIONS = [
  "patient_registration",
  "patient_contact",
  "patient_community_post",
] as const;
export type UserConversion = (typeof USER_CONVERSIONS)[number];

// Policy v2 published 2026-11-21. Browser probe confirmed the origin-only Referer.
// Preserve that observed value; never rewrite a detailed URL to this origin.
export const USER_DELIVERY_POLICY: {
  documentVersion: string | null;
  sourceUrls: Partial<Record<UserConversion, readonly string[]>>;
} = {
  documentVersion: "lectum-meta-measurement-2026-11-21-network-context",
  sourceUrls: {
    patient_registration: ["https://www.lectum.com.br/"],
    patient_contact: ["https://www.lectum.com.br/"],
    patient_community_post: ["https://www.lectum.com.br/"],
  },
};

export function reviewedUserSourceUrl(conversion: UserConversion, input: unknown) {
  if (typeof input !== "string" || !USER_DELIVERY_POLICY.sourceUrls[conversion]?.includes(input))
    return null;
  try {
    const url = new URL(input);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash
      ? input
      : null;
  } catch {
    return null;
  }
}

export function isUserConversion(value: string): value is UserConversion {
  return USER_CONVERSIONS.some((conversion) => conversion === value);
}

// Read only ownership, state and server timestamps, never content or destination.
export async function resolveUserActionSource(
  tx: Prisma.TransactionClient,
  conversion: UserConversion,
  sourceRef: string,
  userId: string,
) {
  const user = await tx.user.findFirst({
    where: { id: userId, role: "paciente", active: true, deleted: false },
    select: { id: true, createdAt: true },
  });
  if (!user) return null;
  if (conversion === "patient_registration")
    return sourceRef === user.id ? { occurredAt: user.createdAt } : null;
  if (conversion === "patient_contact") {
    const action = await tx.important_action_event.findFirst({
      where: {
        id: sourceRef,
        user_id: userId,
        deleted: false,
        action_type: { in: ["whatsapp_click", "psychologist_video_whatsapp_click"] },
      },
      select: { createdAt: true },
    });
    // This is server receipt time, not proof of an opened conversation.
    return action ? { occurredAt: action.createdAt } : null;
  }
  const post = await tx.community_post.findFirst({
    where: {
      id: sourceRef,
      author_id: userId,
      deleted: false,
      status: "publicado",
    },
    select: { createdAt: true },
  });
  return post ? { occurredAt: post.createdAt } : null;
}

// Missing source URLs preserve only internal queue metadata and cannot produce a CAPI payload.
export async function persistUserEvent(
  tx: Prisma.TransactionClient,
  conversion: UserConversion,
  sourceRef: string,
  userId: string,
  now = new Date(),
  sourceUrl?: string,
) {
  if (!USER_DELIVERY_POLICY.documentVersion) return { status: "blocked" as const };
  if (sourceUrl !== undefined && !reviewedUserSourceUrl(conversion, sourceUrl))
    return { status: "ineligible" as const };
  const source = await resolveUserActionSource(tx, conversion, sourceRef, userId);
  if (!source) return { status: "ineligible" as const };
  const consent = await tx.marketing_consent.findUnique({ where: { user_id: userId } });
  if (
    !consent?.granted_at ||
    consent.revoked_at ||
    consent.document_version !== USER_DELIVERY_POLICY.documentVersion ||
    consent.granted_at > source.occurredAt ||
    !consent.expires_at ||
    consent.expires_at <= now ||
    consent.expires_at <= source.occurredAt ||
    source.occurredAt > now ||
    now.getTime() - source.occurredAt.getTime() >= 7 * 86400000
  )
    return { status: "ineligible" as const };
  const existing = await tx.marketing_delivery_job.findUnique({
    where: { conversion_source_ref: { conversion, source_ref: sourceRef } },
  });
  const { MarketingDeliveryJobs } = await import("./delivery-jobs");
  const job = await new MarketingDeliveryJobs().enqueueInTransaction(
    tx,
    {
      conversion,
      sourceRef,
      userId,
      occurredAt: source.occurredAt,
      consentRevision: consent.revision,
      eventId: existing?.event_id ?? randomBytes(32).toString("hex"),
      ...(sourceUrl !== undefined ? { sourceUrl } : {}),
    },
    now,
  );
  return { status: "queued" as const, id: job.id };
}

export async function userActionCommitted(
  conversion: UserConversion,
  source: () => { sourceRef: string; userId: string; sourceUrl?: unknown },
) {
  const { metaTransmissionDecision } = await import("./meta-policy");
  const decision = metaTransmissionDecision(conversion);
  if (!decision.allowed) return { status: "blocked" as const, reason: decision.reason };
  if (!USER_DELIVERY_POLICY.documentVersion)
    return { status: "blocked" as const, reason: "marketing_user_review_required" };
  try {
    const facts = source();
    const url = reviewedUserSourceUrl(conversion, facts.sourceUrl);
    if (!url) return { status: "ineligible" as const };
    const { withSerializableTransaction } = await import("@/utils/prisma-transaction");
    return await withSerializableTransaction((tx) =>
      persistUserEvent(tx, conversion, facts.sourceRef, facts.userId, new Date(), url),
    );
  } catch {
    return { status: "failed" as const };
  }
}
