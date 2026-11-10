import { processStripeCollections, stripeCollectionsEnabled } from "./collection-service";
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
    try {
      if (stripeCollectionsEnabled()) await processStripeCollections();
    } catch {
      console.warn("[BILLING_STRIPE] Agenda de cobrança indisponível.");
    }
    if (!stopped) timer = setTimeout(tick, 60_000);
  }
};

export const startStripeBillingScheduler = () => {
  if (!stopped || (!enabled() && !stripeCollectionsEnabled())) return;
  stopped = false;
  timer = setTimeout(tick, 30_000);
};

export const stopStripeBillingScheduler = () => {
  stopped = true;
  clearTimeout(timer);
};
