import { getStripeGateway } from "@/modules/billing/payment-gateway";
import { SubscribeJobs } from "./subscribe-jobs";

export async function recoverMarketingSubscriptions() {
  if (process.env.META_SUBSCRIBE_RECORDING_ENABLED !== "true") return;
  const raw = process.env.META_SUBSCRIBE_START_AT;
  if (!raw || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(raw)) return;
  const since = new Date(raw);
  if (!Number.isFinite(since.getTime()) || since.toISOString() !== raw || since > new Date())
    return;
  try {
    const identity = getStripeGateway().identity;
    if (identity.mode !== "live") return;
    const jobs = new SubscribeJobs();
    await jobs.discover(identity, since);
    for (let i = 0; i < 5; i++) {
      const job = await jobs.claim(identity);
      if (!job) break;
      await jobs.process(job, identity);
    }
  } catch {
    // Existing inbox and leases retain all work; never fail billing or call Meta.
    console.warn("[MARKETING] Processamento interno aguardando nova tentativa.");
  }
}
