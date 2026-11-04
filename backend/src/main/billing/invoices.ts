import { invoiceFeatureEnabled } from "@/modules/billing/invoices/config";
import { processInvoiceQueue } from "@/modules/billing/invoices/worker";

let timer: ReturnType<typeof setTimeout> | undefined;
let stopped = true;

async function tick() {
  try {
    await processInvoiceQueue();
  } catch {
    console.error("[BILLING_INVOICES] Processamento fiscal indisponivel; nova tentativa agendada.");
  } finally {
    if (!stopped) timer = setTimeout(tick, 60_000);
  }
}

export function startInvoiceScheduler() {
  if (!stopped || !invoiceFeatureEnabled()) return;
  stopped = false;
  timer = setTimeout(tick, 45_000);
}

export function stopInvoiceScheduler() {
  stopped = true;
  clearTimeout(timer);
}
