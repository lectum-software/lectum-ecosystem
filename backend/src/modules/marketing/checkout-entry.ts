import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/external/generated/prisma/client";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { readBrowserIdentifier } from "./browser-identifier-repository";
import { reviewedCheckoutPolicy } from "./checkout-policy";
import { readMetaConfig } from "./meta-config";
import { metaTransmissionDecision } from "./meta-policy";

export const CHECKOUT_ENTRY_WINDOW_MS = 30 * 60 * 1000;
export const CHECKOUT_ENTRY_PREFIX = "checkout_entry_";
const schema = z
  .object({ revision: z.number().int().positive(), documentVersion: z.string().min(1).max(128) })
  .strict();

export async function recentCheckoutEntry(
  tx: Prisma.TransactionClient,
  userId: string,
  revision: number,
  now: Date,
) {
  return tx.marketing_checkout_entry.findFirst({
    where: {
      user_id: userId,
      consent_revision: revision,
      created_at: { gt: new Date(now.getTime() - CHECKOUT_ENTRY_WINDOW_MS), lte: now },
      expires_at: { gt: now },
    },
    orderBy: { created_at: "desc" },
  });
}

// Server timestamp and identity; no card, payment operation, return URL or campaign in this contract.
export async function captureCheckoutEntry(
  userId: string,
  cookie: unknown,
  userAgent: unknown,
  input: unknown,
  policy = reviewedCheckoutPolicy(),
  now = new Date(),
) {
  const parsed = schema.safeParse(input);
  const config = readMetaConfig();
  if (
    !policy.enabled ||
    !policy.accountId ||
    !policy.documentVersion ||
    !policy.sourceUrl ||
    !config.enabled ||
    !config.datasetId ||
    !config.apiVersion ||
    !config.token ||
    !metaTransmissionDecision("professional_checkout").allowed ||
    !parsed.success ||
    parsed.data.documentVersion !== policy.documentVersion ||
    typeof cookie !== "string" ||
    typeof userAgent !== "string" ||
    !/^[\x20-\x7E]{1,1024}$/.test(userAgent) ||
    !userAgent.trim()
  )
    return false;
  const { revision, documentVersion } = parsed.data;
  return withSerializableTransaction(async (tx) => {
    const browser = await readBrowserIdentifier(tx, userId, cookie, revision, documentVersion, now);
    if (!browser || browser.captured_at > now) return false;
    const profile = await tx.psychologist_profile.findFirst({
      where: { user_id: userId, deleted: false },
    });
    if (!profile) return false;
    // Existing paid access and courtesy renewal are not a new subscription checkout.
    const active = await tx.professional_subscription.findFirst({
      where: {
        psychologist_id: profile.id,
        deleted: false,
        plan: { slug: { not: "gratuito" } },
        OR: [
          {
            source: { not: "admin_grant" },
            OR: [
              { status: { in: ["ativa", "inadimplente"] } },
              { status: "cancelada", current_period_end: { gt: now } },
            ],
          },
          { source: "admin_grant", status: "ativa", current_period_end: { gt: now } },
        ],
      },
    });
    if (active) return false;
    const consent = await tx.marketing_consent.findUniqueOrThrow({ where: { user_id: userId } });
    if (!consent.granted_at || consent.granted_at > now || !consent.expires_at) return false;
    // Serializable predicate protects concurrent tabs and retry requests, including different browsers.
    const prior = await recentCheckoutEntry(tx, userId, revision, now);
    if (prior) return true;
    // During rollout, an older frontend may already have measured this checkout operation.
    const legacy = await tx.marketing_delivery_job.findFirst({
      where: {
        user_id: userId,
        consent_revision: revision,
        conversion: "professional_checkout",
        occurred_at: { gt: new Date(now.getTime() - CHECKOUT_ENTRY_WINDOW_MS), lte: now },
      },
    });
    if (legacy) return true;
    const entry = await tx.marketing_checkout_entry.create({
      data: {
        user_id: userId,
        consent_revision: revision,
        account_id: policy.accountId!,
        token_hash: browser.token_hash,
        document_version: documentVersion,
        source_url: policy.sourceUrl!,
        client_user_agent: userAgent,
        created_at: now,
        expires_at: new Date(
          Math.min(
            browser.expires_at.getTime(),
            consent.expires_at.getTime(),
            now.getTime() + 86400000,
          ),
        ),
      },
    });
    const { MarketingDeliveryJobs } = await import("./delivery-jobs");
    await new MarketingDeliveryJobs().enqueueInTransaction(
      tx,
      {
        conversion: "professional_checkout",
        sourceRef: CHECKOUT_ENTRY_PREFIX + entry.id,
        userId,
        consentRevision: revision,
        occurredAt: entry.created_at,
        eventId: randomBytes(32).toString("hex"),
      },
      now,
    );
    return true;
  }, 5);
}
