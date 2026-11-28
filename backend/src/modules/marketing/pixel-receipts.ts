import { createHash } from "node:crypto";
import type { Prisma } from "@/external/generated/prisma/client";
import { resolveCheckoutDeliveryEvidence } from "./checkout-delivery";
import { META_EVENT_POLICY, type MetaConversion } from "./meta-policy";
import { resolveRegistrationDeliveryEvidence } from "./registration-delivery";
import { resolveSubscriptionDeliveryEvidence } from "./subscription-delivery";
import { resolveUserDeliveryEvidence } from "./user-delivery";

// Fresh committed actions, bound to the consenting browser; never client claims.
export async function readPixelReceipts(
  tx: Prisma.TransactionClient,
  identity: { userId: string | null; token: string },
  now = new Date(),
) {
  if (!/^[a-f0-9]{64}$/.test(identity.token)) return [];
  const hash = createHash("sha256").update(identity.token).digest("hex");
  const browser = identity.userId
    ? await tx.marketing_browser_identifier.findUnique({ where: { token_hash: hash } })
    : null;
  const guest = identity.userId
    ? null
    : await tx.marketing_guest_attribution.findUnique({ where: { token_hash: hash } });
  if (
    identity.userId
      ? !browser || browser.expires_at <= now || browser.user_id !== identity.userId
      : !guest || guest.revoked || guest.claimed || guest.expires_at <= now
  )
    return [];
  const fbp = browser?.fbp ?? guest?.browser_fbp;
  if (!fbp) return [];
  const jobs = await tx.marketing_delivery_job.findMany({
    where: {
      ...(identity.userId
        ? { user_id: identity.userId }
        : { guest_token_hash: hash, user_id: null }),
      occurred_at: { gte: new Date(now.getTime() - 10 * 60_000), lte: now },
      expires_at: { gt: now },
    },
    orderBy: { occurred_at: "desc" },
    take: 30,
  });
  const receipts = [];
  for (const job of jobs) {
    const evidence =
      job.conversion === "professional_registration"
        ? await resolveRegistrationDeliveryEvidence(tx, job, undefined, now)
        : job.conversion === "professional_checkout"
          ? await resolveCheckoutDeliveryEvidence(tx, job, undefined, now)
          : job.conversion === "professional_subscription"
            ? await resolveSubscriptionDeliveryEvidence(tx, job, undefined, now)
            : await resolveUserDeliveryEvidence(tx, job, now);
    if (!evidence || evidence.candidate.fbp !== fbp) continue;
    const conversion = job.conversion as MetaConversion;
    const params: Record<string, string | number> = {};
    if (conversion === "patient_registration") params.account_type = "user";
    if (conversion === "professional_registration") params.account_type = "professional";
    if (conversion === "professional_subscription" && "amountCents" in evidence.candidate) {
      params.value = Number(evidence.candidate.amountCents) / 100;
      params.currency = "BRL";
    }
    receipts.push({
      eventId: job.event_id,
      occurredAt: job.occurred_at.getTime(),
      eventName: META_EVENT_POLICY[conversion].eventName,
      params,
    });
  }
  return receipts;
}
