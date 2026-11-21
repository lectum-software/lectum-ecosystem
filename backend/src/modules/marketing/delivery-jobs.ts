import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { marketing_delivery_job, Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { MARKETING_CONSENT_POLICY } from "./consent-policy";
import { resolveDeliverySource } from "./delivery-source";
import { deliverMetaConversion } from "./meta-capi";
import { readMetaConfig } from "./meta-config";
import { metaTransmissionDecision } from "./meta-policy";
import { registrationConsentStart } from "./registration-consent";
import { readMarketingRequestContext } from "./request-context";
import {
  isUserConversion,
  resolveUserActionSource,
  reviewedUserSourceUrl,
  USER_DELIVERY_POLICY,
} from "./user-events";

const day = 86_400_000;
const referenceSchema = z
  .object({
    eventId: z.string().regex(/^[a-f0-9]{64}$/),
    conversion: z.enum([
      "patient_registration",
      "patient_contact",
      "patient_community_post",
      "professional_registration",
      "professional_checkout",
      "professional_subscription",
    ]),
    sourceRef: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/),
    sourceUrl: z.string().url().max(2048).optional(),
    occurredAt: z.date(),
    userId: z.string().min(1).max(160),
    consentRevision: z.number().int().positive(),
  })
  .strict();
type Reference = z.infer<typeof referenceSchema>;
export type DeliveryJob = marketing_delivery_job;
type Resolver = (
  job: DeliveryJob,
) => ReturnType<Parameters<typeof deliverMetaConversion>[0]["resolve"]>;

// Storage primitive only: callers must use the gated entry points below.
export class MarketingDeliveryJobs {
  async enqueue(input: Reference, now = new Date()) {
    return withSerializableTransaction((tx) => this.enqueueInTransaction(tx, input, now));
  }

  async enqueueInTransaction(tx: Prisma.TransactionClient, input: Reference, now = new Date()) {
    const ref = referenceSchema.parse(input);
    if (
      ref.sourceUrl !== undefined &&
      (!isUserConversion(ref.conversion) || !reviewedUserSourceUrl(ref.conversion, ref.sourceUrl))
    )
      throw new Error("marketing_delivery_source_url_invalid");
    if (isUserConversion(ref.conversion)) {
      if (!USER_DELIVERY_POLICY.documentVersion) throw new Error("marketing_user_review_required");
      const source = await resolveUserActionSource(tx, ref.conversion, ref.sourceRef, ref.userId);
      if (!source || source.occurredAt.getTime() !== ref.occurredAt.getTime())
        throw new Error("marketing_delivery_source_invalid");
    }
    if (
      !Number.isFinite(now.getTime()) ||
      ref.occurredAt > now ||
      now.getTime() - ref.occurredAt.getTime() >= 7 * day
    )
      throw new Error("marketing_delivery_invalid_time");
    if (
      !(await currentDeliveryConsent(
        tx,
        {
          user_id: ref.userId,
          consent_revision: ref.consentRevision,
          occurred_at: ref.occurredAt,
          conversion: ref.conversion,
          source_ref: ref.sourceRef,
        },
        now,
      ))
    )
      throw new Error("marketing_delivery_consent_required");
    const requestContext = readMarketingRequestContext(ref.occurredAt, now);
    await tx.marketing_delivery_job.createMany({
      data: [
        {
          ...requestContext,
          event_id: ref.eventId,
          user_id: ref.userId,
          consent_revision: ref.consentRevision,
          conversion: ref.conversion,
          source_ref: ref.sourceRef,
          source_url: ref.sourceUrl ?? null,
          occurred_at: ref.occurredAt,
          expires_at: new Date(ref.occurredAt.getTime() + 7 * day),
          next_attempt_at: now,
        },
      ],
      skipDuplicates: true,
    });
    const row = await tx.marketing_delivery_job.findUnique({
      where: { event_id: ref.eventId },
    });
    if (
      !row ||
      row.user_id !== ref.userId ||
      row.consent_revision !== ref.consentRevision ||
      row.conversion !== ref.conversion ||
      row.source_ref !== ref.sourceRef ||
      row.source_url !== (ref.sourceUrl ?? null) ||
      row.occurred_at.getTime() !== ref.occurredAt.getTime()
    )
      throw new Error("marketing_delivery_identity_conflict");
    return row;
  }

  async claim(now = new Date(), scope?: { userId: string }) {
    const where = {
      ...(scope ? { user_id: scope.userId } : {}),
      state: { in: ["pending", "processing"] },
      attempts: { lt: 12 },
      next_attempt_at: { lte: now },
      expires_at: { gt: now },
      OR: [{ lease_until: null }, { lease_until: { lte: now } }],
    };
    const row = await prisma.marketing_delivery_job.findFirst({
      where,
      orderBy: [{ next_attempt_at: "asc" }, { id: "asc" }],
    });
    if (!row) return null;
    if (!(await currentDeliveryConsent(prisma, row, now))) {
      await prisma.marketing_delivery_job.deleteMany({ where: { id: row.id } });
      return null;
    }
    const lease = { lease_token: randomUUID(), lease_until: new Date(now.getTime() + 120_000) };
    const result = await prisma.marketing_delivery_job.updateMany({
      where: { id: row.id, ...where },
      data: { ...lease, state: "processing", attempts: { increment: 1 } },
    });
    return result.count
      ? { ...row, ...lease, state: "processing", attempts: row.attempts + 1 }
      : null;
  }

  async settle(job: DeliveryJob, outcome: "sent" | "blocked" | "retry", now = new Date()) {
    if (!job.lease_token) return { count: 0 };
    const retryAt = new Date(
      now.getTime() + Math.min(3_600_000, 60_000 * 2 ** Math.min(job.attempts - 1, 6)),
    );
    const state =
      outcome !== "retry"
        ? outcome
        : job.expires_at <= retryAt
          ? "expired"
          : job.attempts >= 12
            ? "review_required"
            : "pending";
    return prisma.marketing_delivery_job.updateMany({
      where: {
        id: job.id,
        state: "processing",
        lease_token: job.lease_token,
        lease_until: { gt: now },
      },
      data: {
        state,
        ...(outcome === "sent" || outcome === "blocked"
          ? { client_ip_address: null, client_user_agent: null }
          : {}),
        lease_token: null,
        lease_until: null,
        next_attempt_at: retryAt,
        last_error_code: outcome === "retry" ? "delivery_unconfirmed" : null,
      },
    });
  }

  async expireAndPurge(now = new Date()) {
    await prisma.marketing_delivery_job.deleteMany({
      where: {
        OR: [
          { user_id: null },
          { consent_revision: null },
          { user: { is: { active: false } } },
          { user: { is: { deleted: true } } },
          {
            conversion: { startsWith: "professional_" },
            user: { is: { role: { not: "psicologo" } } },
          },
          {
            conversion: { startsWith: "patient_" },
            user: { is: { role: { not: "paciente" } } },
          },
          { user: { is: { marketing_consent: { is: null } } } },
          { user: { is: { marketing_consent: { is: { revoked_at: { not: null } } } } } },
          { user: { is: { marketing_consent: { is: { expires_at: { lte: now } } } } } },
        ],
      },
    });
    await prisma.marketing_delivery_job.updateMany({
      where: {
        state: { in: ["pending", "processing"] },
        attempts: { gte: 12 },
        OR: [{ lease_until: null }, { lease_until: { lte: now } }],
      },
      data: { state: "review_required", lease_token: null, lease_until: null },
    });
    await prisma.marketing_delivery_job.updateMany({
      where: {
        state: { in: ["pending", "processing", "review_required"] },
        expires_at: { lte: now },
        OR: [{ lease_until: null }, { lease_until: { lte: now } }],
      },
      data: { state: "expired", lease_token: null, lease_until: null },
    });
    await prisma.marketing_delivery_job.updateMany({
      where: {
        OR: [{ expires_at: { lte: now } }, { state: { in: ["sent", "blocked", "expired"] } }],
      },
      data: { client_ip_address: null, client_user_agent: null },
    });
    // Seven-day event eligibility prevents replay after the bounded dedup record is purged.
    return prisma.marketing_delivery_job.deleteMany({
      where: { expires_at: { lte: new Date(now.getTime() - 23 * day) } },
    });
  }
}

async function currentDeliveryConsent(
  tx: Prisma.TransactionClient,
  job: Pick<
    DeliveryJob,
    "user_id" | "consent_revision" | "occurred_at" | "conversion" | "source_ref"
  >,
  now: Date,
) {
  const userEvent = isUserConversion(job.conversion);
  const documentVersion = userEvent
    ? USER_DELIVERY_POLICY.documentVersion
    : MARKETING_CONSENT_POLICY.documentVersion;
  if (!job.user_id || !job.consent_revision || !documentVersion) return null;
  const row = await tx.marketing_consent.findFirst({
    where: {
      user_id: job.user_id,
      revision: job.consent_revision,
      document_version: documentVersion,
      revoked_at: null,
      expires_at: { gt: now },
      user: { active: true, deleted: false, role: userEvent ? "paciente" : "psicologo" },
    },
  });
  if (
    !row?.granted_at ||
    !row.expires_at ||
    row.expires_at <= job.occurred_at ||
    row.granted_at > now
  )
    return null;
  let grantedAt = row.granted_at;
  if (grantedAt > job.occurred_at) {
    if (job.conversion !== "professional_registration" || job.source_ref !== job.user_id)
      return null;
    const guestStart = await registrationConsentStart(
      tx,
      job.user_id,
      job.consent_revision,
      row.document_version!,
      job.occurred_at,
      now,
    );
    if (!guestStart) return null;
    grantedAt = guestStart;
  }
  return {
    purpose: "meta_ads_measurement" as const,
    documentVersion: row.document_version!,
    grantedAt: grantedAt.getTime(),
    expiresAt: row.expires_at.getTime(),
    revokedAt: null,
  };
}

export async function enqueueMetaDeliveryInTransaction(
  tx: Prisma.TransactionClient,
  input: Reference,
) {
  if (!enabled(input.conversion)) return { status: "blocked" as const };
  const row = await new MarketingDeliveryJobs().enqueueInTransaction(tx, input);
  return { status: "queued" as const, id: row.id };
}

function enabled(conversion: Reference["conversion"]) {
  if (!metaTransmissionDecision(conversion).allowed) return false;
  const config = readMetaConfig();
  return Boolean(config.enabled && config.datasetId && config.apiVersion && config.token);
}

export async function enqueueMetaDelivery(input: Reference) {
  if (!enabled(input.conversion)) return { status: "blocked" as const };
  try {
    const row = await new MarketingDeliveryJobs().enqueue(input);
    return { status: "queued" as const, id: row.id };
  } catch {
    return { status: "failed" as const };
  }
}

// Not scheduled or wired to product hooks until resolver/identifier approval.
export async function processNextMetaDelivery(resolve: Resolver) {
  if (!referenceSchema.shape.conversion.options.some(enabled))
    return { status: "blocked" as const };
  const jobs = new MarketingDeliveryJobs();
  let job: DeliveryJob | null = null;
  try {
    await jobs.expireAndPurge();
    job = await jobs.claim();
    if (!job) return { status: "idle" as const };
    const claimed = job;
    const conversion = referenceSchema.shape.conversion.parse(job.conversion);
    const result = await deliverMetaConversion({
      conversion,
      resolve: async () => {
        const evidence = await resolve(claimed);
        const exists = await prisma.marketing_delivery_job.findFirst({
          where: {
            id: claimed.id,
            state: "processing",
            lease_token: claimed.lease_token,
            lease_until: { gt: new Date() },
            expires_at: { gt: new Date() },
          },
        });
        const consent = exists ? await currentDeliveryConsent(prisma, exists, new Date()) : null;
        const source = exists ? await resolveDeliverySource(prisma, exists) : null;
        if (
          !consent ||
          !source ||
          !evidence ||
          evidence.candidate.eventId !== claimed.event_id ||
          evidence.candidate.conversion !== conversion ||
          (isUserConversion(conversion) && evidence.candidate.sourceUrl !== claimed.source_url) ||
          evidence.occurredAtMs !== source.occurredAt.getTime() ||
          evidence.candidate.amountCents !==
            ("amountCents" in source ? source.amountCents : undefined)
        )
          return null;
        return { ...evidence, consent };
      },
    });
    const outcome =
      result.status === "sent"
        ? "sent"
        : result.status === "failed" || result.status === "disabled"
          ? "retry"
          : "blocked";
    const acknowledged = await jobs.settle(job, outcome);
    if (!acknowledged.count) return { status: "unacknowledged" as const };
    return { status: result.status };
  } catch {
    if (job) {
      try {
        await jobs.settle(job, "retry");
      } catch {
        /* Lease expiry recovers failed acknowledgement. */
      }
    }
    return { status: "failed" as const };
  }
}
