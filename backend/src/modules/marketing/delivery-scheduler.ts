import type { processNextMetaDelivery } from "./delivery-jobs";
import { readMetaConfig } from "./meta-config";
import { metaTransmissionDecision } from "./meta-policy";
import { isUserConversion, USER_CONVERSIONS } from "./user-events";

type Resolver = Parameters<typeof processNextMetaDelivery>[0];
const resolveDelivery: Resolver = async (job) => {
  if (isUserConversion(job.conversion)) {
    const resolver = await import("./user-delivery");
    return resolver.resolveUserDelivery(job);
  }
  if (job.conversion === "professional_registration") {
    const resolver = await import("./registration-delivery");
    return resolver.resolveRegistrationDelivery(job);
  }
  const resolver = await import("./subscription-delivery");
  return resolver.resolveSubscriptionDelivery(job);
};
let timer: ReturnType<typeof setInterval> | null = null;
let running: Promise<void> | null = null;

// A reviewed server resolver is mandatory; credentials alone cannot start delivery.
export function startMetaDeliveryScheduler(resolve: Resolver = resolveDelivery) {
  if (
    timer ||
    !resolve ||
    ![
      ...USER_CONVERSIONS,
      "professional_registration",
      "professional_checkout",
      "professional_subscription",
    ].some(
      (conversion) =>
        metaTransmissionDecision(
          conversion as
            | (typeof USER_CONVERSIONS)[number]
            | "professional_registration"
            | "professional_checkout"
            | "professional_subscription",
        ).allowed,
    )
  )
    return false;
  const config = readMetaConfig();
  if (!config.enabled || !config.datasetId || !config.apiVersion || !config.token) return false;
  const tick = () => {
    if (running) return;
    running = (async () => {
      const { recoverProfessionalEvents } = await import("./professional-recovery");
      await recoverProfessionalEvents();
      const { processNextMetaDelivery } = await import("./delivery-jobs");
      for (let index = 0; index < 10; index++) {
        const result = await processNextMetaDelivery(resolve);
        if (["idle", "blocked", "disabled", "failed", "unacknowledged"].includes(result.status))
          break;
      }
    })()
      .catch(() => {
        console.error("[MARKETING] Falha no processamento de entregas.");
      })
      .finally(() => {
        running = null;
      });
  };
  tick();
  timer = setInterval(tick, 60_000);
  timer.unref();
  return true;
}

export async function stopMetaDeliveryScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
  await running;
}
