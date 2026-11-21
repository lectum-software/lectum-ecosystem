import { purgeExpiredAttribution } from "./attribution-repository";
import { MarketingDeliveryJobs } from "./delivery-jobs";

export async function purgeMarketingRetention() {
  const results = await Promise.allSettled([
    purgeExpiredAttribution(),
    new MarketingDeliveryJobs().expireAndPurge(),
  ]);
  if (results.some((result) => result.status === "rejected"))
    throw new Error("marketing_retention_failed");
}

let timer: ReturnType<typeof setInterval> | null = null;
let running: Promise<void> | null = null;
export function startAttributionRetention() {
  // Explicit maintenance opt-in: enable with the reviewed rollout, independently of capture.
  if (timer || process.env.MARKETING_ATTRIBUTION_RETENTION_ENABLED !== "true") return;
  const tick = () => {
    if (running) return;
    running = purgeMarketingRetention()
      .catch(() => {
        console.error("[MARKETING] Falha na limpeza de atribuições expiradas.");
      })
      .finally(() => {
        running = null;
      });
  };
  tick();
  timer = setInterval(tick, 60 * 60_000);
  timer.unref();
}
export async function stopAttributionRetention() {
  if (timer) clearInterval(timer);
  timer = null;
  await running;
}
