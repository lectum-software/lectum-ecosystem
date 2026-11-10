import { processStripeFinancialReconciliations } from "./financial-ledger/service";
import { processStripeInbox } from "./inbox";

let timer: ReturnType<typeof setTimeout> | undefined;
let stopped = true;
const enabled = () => process.env.BILLING_STRIPE_RECONCILIATION_ENABLED === "true";

const tick = async () => {
  try {
    if (enabled()) {
      await processStripeInbox();
      await processStripeFinancialReconciliations();
    }
  } catch {
    console.warn("[BILLING_STRIPE] Conciliação indisponível.");
  } finally {
    if (!stopped) timer = setTimeout(tick, 60_000);
  }
};

export const startStripeBillingScheduler = () => {
  if (!stopped || !enabled()) return;
  stopped = false;
  timer = setTimeout(tick, 30_000);
};

export const stopStripeBillingScheduler = () => {
  stopped = true;
  clearTimeout(timer);
};
