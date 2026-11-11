import type {
  AdminFinanceChargeItem,
  AdminFinanceDateRange,
} from "../../DTOs/IAdminFinanceDashboardDTO";
import {
  type FinanceStripeLedger,
  stripeReceiptsInRange,
  stripeSubscriptionInsight,
} from "./stripe-ledger-projection";
import { mapSubscription } from "./subscriptions";

/** One receipt projection for dashboard preview, paginated endpoint and CSV. */
export const stripeFinanceChargeItems = (
  ledger: FinanceStripeLedger,
  range: AdminFinanceDateRange,
): AdminFinanceChargeItem[] =>
  (ledger.invalid ? [] : stripeReceiptsInRange(ledger, range)).map(({ row, contract, label }) => ({
    amount_available: true,
    amount_cents: row.amount_paid_cents,
    detail_url: `/psicologos/${contract.psychologist.user.id}`,
    event_id: `receipt:${row.id}`,
    event_type: "recorded_receipt",
    external_id: "",
    gateway: "stripe",
    internal_id: 0,
    internal_id_available: false,
    occurred_at: row.paid_at.toISOString(),
    reference: null,
    source: "stripe_receipt",
    status: "confirmed",
    status_label: label,
    financial_status: row.current_state,
    refunded_cents: row.refunded_cents,
    subscription: stripeSubscriptionInsight(mapSubscription(contract), ledger),
    unavailable_reason: null,
  }));
