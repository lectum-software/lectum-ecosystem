import { processBillingDunningQueue } from "@/modules/billing/dunning";
import { parsePositiveInteger } from "@/utils/runtime-config";
import { toSafeErrorLog } from "@/utils/safe-error-log";

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_BATCH_SIZE = 50;

let dunningInitialTimer: ReturnType<typeof setTimeout> | null = null;
let dunningTimer: ReturnType<typeof setInterval> | null = null;
let dunningRunInProgress = false;

export const isBillingDunningSchedulerEnabled = () =>
  process.env.BILLING_DUNNING_SCHEDULER_ENABLED?.trim().toLowerCase() === "true";

export const runBillingDunningSafely = async () => {
  if (dunningRunInProgress) return;

  dunningRunInProgress = true;
  try {
    const batchSize = parsePositiveInteger(
      process.env.BILLING_DUNNING_BATCH_SIZE,
      DEFAULT_BATCH_SIZE,
      { max: 500 },
    );
    const result = await processBillingDunningQueue(new Date(), batchSize);

    if (result.processed > 0) {
      console.log(`[BILLING DUNNING] ${result.processed} assinatura(s) processada(s).`);
    }
  } catch (error) {
    console.error(
      "[BILLING DUNNING] Falha no scheduler.",
      toSafeErrorLog(error, "BillingDunningSchedulerError"),
    );
  } finally {
    dunningRunInProgress = false;
  }
};

export const startBillingDunningScheduler = () => {
  if (!isBillingDunningSchedulerEnabled() || dunningTimer) return;

  const intervalMs = parsePositiveInteger(
    process.env.BILLING_DUNNING_INTERVAL_MS,
    DEFAULT_INTERVAL_MS,
    { max: 60 * 60 * 1000, min: 10_000 },
  );

  dunningInitialTimer = setTimeout(() => void runBillingDunningSafely(), 45_000);
  dunningTimer = setInterval(() => void runBillingDunningSafely(), intervalMs);
};

export const stopBillingDunningScheduler = () => {
  if (dunningInitialTimer) clearTimeout(dunningInitialTimer);
  if (dunningTimer) clearInterval(dunningTimer);

  dunningInitialTimer = null;
  dunningTimer = null;
};
