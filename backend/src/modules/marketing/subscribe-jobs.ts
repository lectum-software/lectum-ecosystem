import { randomUUID } from "node:crypto";
import type { marketing_subscribe_job } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { StripeIdentity } from "@/modules/billing/payment-gateway/stripe-types";
import { recordStripeSubscribe } from "./stripe-subscribe";

const scope = (identity: StripeIdentity) => ({
  gateway: "stripe",
  mode: identity.mode,
  account_id: identity.accountId,
});
const leaseAvailable = (now: Date) => ({
  OR: [{ lease_until: null }, { lease_until: { lte: now } }],
});

export class SubscribeJobs {
  async discover(identity: StripeIdentity, since: Date) {
    if (identity.mode !== "live" || !Number.isFinite(since.getTime())) return 0;
    // Durable inbox is the source of truth. No cursor can skip an event after a crash.
    const events = await prisma.billing_gateway_event.findMany({
      where: {
        ...scope(identity),
        type: "invoice.paid",
        received_at: { gte: since },
        marketing_job: { is: null },
      },
      orderBy: [{ received_at: "asc" }, { id: "asc" }],
      take: 25,
      select: { id: true },
    });
    const inserted = await prisma.marketing_subscribe_job.createMany({
      data: events.map((event) => ({ source_event_id: event.id })),
      skipDuplicates: true,
    });
    return inserted.count;
  }

  async claim(identity: StripeIdentity, now = new Date()) {
    const where = {
      state: { in: ["pending", "processing"] },
      next_attempt_at: { lte: now },
      source_event: { ...scope(identity), type: "invoice.paid" },
      ...leaseAvailable(now),
    };
    const job = await prisma.marketing_subscribe_job.findFirst({
      where,
      orderBy: [{ next_attempt_at: "asc" }, { id: "asc" }],
    });
    if (!job) return null;
    const lease = { lease_token: randomUUID(), lease_until: new Date(now.getTime() + 120_000) };
    const result = await prisma.marketing_subscribe_job.updateMany({
      where: { id: job.id, ...where },
      data: { ...lease, state: "processing", attempts: { increment: 1 } },
    });
    return result.count ? { ...job, ...lease, attempts: job.attempts + 1 } : null;
  }

  finish(job: marketing_subscribe_job, state: "complete" | "excluded") {
    return prisma.marketing_subscribe_job.updateMany({
      where: { id: job.id, lease_token: job.lease_token, state: "processing" },
      data: { state, lease_token: null, lease_until: null, last_error_code: null },
    });
  }

  defer(
    job: marketing_subscribe_job,
    code: "evidence_pending" | "storage_unavailable",
    now = new Date(),
  ) {
    return prisma.marketing_subscribe_job.updateMany({
      where: { id: job.id, lease_token: job.lease_token, state: "processing" },
      data: {
        // Late evidence is normal webhook ordering, not an exhausted delivery failure.
        state: code === "storage_unavailable" && job.attempts >= 12 ? "review_required" : "pending",
        lease_token: null,
        lease_until: null,
        next_attempt_at: new Date(
          now.getTime() + Math.min(3_600_000, 60_000 * 2 ** Math.min(job.attempts - 1, 6)),
        ),
        last_error_code: code,
      },
    });
  }

  async process(job: marketing_subscribe_job, identity: StripeIdentity, now = new Date()) {
    try {
      const event = await prisma.billing_gateway_event.findFirst({
        where: { id: job.source_event_id, ...scope(identity), type: "invoice.paid" },
      });
      if (event?.state !== "complete") return await this.defer(job, "evidence_pending", now);
      const receipt = await prisma.billing_financial_receipt.findFirst({
        where: { ...scope(identity), invoice_id: event.resource_id },
      });
      if (!receipt) return await this.defer(job, "evidence_pending", now);
      const result = await recordStripeSubscribe(receipt.subscription_id, identity, event.id);
      if (["history_unverified", "awaiting_verified_event"].includes(result))
        return await this.defer(job, "evidence_pending", now);
      return await this.finish(job, result === "excluded" ? "excluded" : "complete");
    } catch {
      // A failed finish after a committed conversion is safe: replay sees the same unique record.
      return await this.defer(job, "storage_unavailable", now);
    }
  }
}
