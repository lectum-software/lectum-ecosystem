import { randomBytes } from "node:crypto";
import type { Prisma } from "@/external/generated/prisma/client";
import { readMetaConfig } from "./meta-config";
import { metaTransmissionDecision } from "./meta-policy";
import { registrationConsentStart } from "./registration-consent";

type Conversion = "professional_registration" | "professional_checkout";

// Server-owned facts only: neither timestamps nor event identities come from the browser.
export async function persistProfessionalEvent(
  tx: Prisma.TransactionClient,
  conversion: Conversion,
  sourceId: string,
  now = new Date(),
) {
  let userId: string;
  let occurredAt: Date;
  if (conversion === "professional_registration") {
    const user = await tx.user.findFirst({
      where: { id: sourceId, role: "psicologo", active: true, deleted: false },
      select: { id: true, createdAt: true },
    });
    if (!user) return { status: "ineligible" as const };
    userId = user.id;
    occurredAt = user.createdAt;
  } else {
    const operation = await tx.billing_operation.findFirst({
      where: {
        id: sourceId,
        gateway: "stripe",
        mode: "live",
        kind: "checkout",
        intent: "subscription",
        state: { in: ["requires_confirmation", "processing", "complete"] },
        OR: [{ provider_intent_id: { not: null } }, { provider_setup_intent_id: { not: null } }],
      },
    });
    if (!operation) return { status: "ineligible" as const };
    const context = await tx.marketing_checkout_context.findUnique({
      where: { operation_id: operation.id },
    });
    if (
      !context ||
      context.expires_at <= now ||
      context.captured_at < operation.created_at ||
      context.captured_at > now
    )
      return { status: "ineligible" as const };
    userId = operation.user_id;
    occurredAt = operation.created_at;
  }
  const consent = await tx.marketing_consent.findUnique({ where: { user_id: userId } });
  if (
    !consent?.granted_at ||
    (consent.granted_at > occurredAt &&
      !(
        conversion === "professional_registration" &&
        consent.document_version &&
        (await registrationConsentStart(
          tx,
          userId,
          consent.revision,
          consent.document_version,
          occurredAt,
          now,
        ))
      )) ||
    consent.revoked_at ||
    !consent.expires_at ||
    consent.expires_at <= now
  )
    return { status: "ineligible" as const };
  const existing = await tx.marketing_delivery_job.findUnique({
    where: { conversion_source_ref: { conversion, source_ref: sourceId } },
  });
  const { MarketingDeliveryJobs } = await import("./delivery-jobs");
  const job = await new MarketingDeliveryJobs().enqueueInTransaction(
    tx,
    {
      conversion,
      sourceRef: sourceId,
      userId,
      consentRevision: consent.revision,
      occurredAt,
      eventId: existing?.event_id ?? randomBytes(32).toString("hex"),
    },
    now,
  );
  return { status: "queued" as const, id: job.id };
}

export async function professionalActionCommitted(conversion: Conversion, source: () => string) {
  if (!metaTransmissionDecision(conversion).allowed) return { status: "blocked" as const };
  const config = readMetaConfig();
  if (!config.enabled || !config.datasetId || !config.apiVersion || !config.token)
    return { status: "disabled" as const };
  try {
    const { withSerializableTransaction } = await import("@/utils/prisma-transaction");
    return await withSerializableTransaction((tx) =>
      persistProfessionalEvent(tx, conversion, source()),
    );
  } catch {
    return { status: "failed" as const };
  }
}

export async function registrationConsentLinked(
  tx: Prisma.TransactionClient,
  userId: string,
  now: Date,
) {
  if (!metaTransmissionDecision("professional_registration").allowed)
    return { status: "blocked" as const };
  const config = readMetaConfig();
  if (!config.enabled || !config.datasetId || !config.apiVersion || !config.token)
    return { status: "disabled" as const };
  const user = await tx.user.findUnique({ where: { id: userId } });
  // Delayed verification never changes event time or replays an expired conversion.
  if (!user || now.getTime() - user.createdAt.getTime() >= 7 * 86_400_000)
    return { status: "ineligible" as const };
  return persistProfessionalEvent(tx, "professional_registration", userId, now);
}
