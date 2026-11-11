import type {
  billing_financial_receipt,
  billing_invoice,
  Prisma,
  payment_event,
} from "@/external/generated/prisma/client";
import type { InvoiceConfig } from "@/modules/billing/invoices/config";
import type { InvoiceGatewayScope } from "@/modules/billing/invoices/gateway-scope";

export const contractSelect = {
  id: true,
  gateway: true,
  source: true,
  gateway_mode: true,
  gateway_account_id: true,
  gateway_subscription_id: true,
  price_version_id: true,
  psychologist_id: true,
  psychologist: { select: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.professional_subscriptionSelect;
export type HistoryContract = Prisma.professional_subscriptionGetPayload<{
  select: typeof contractSelect;
}>;
export type HistoryRecords = {
  ambiguousReferences: string[];
  contracts: HistoryContract[];
  receipts: billing_financial_receipt[];
  events: payment_event[];
  invoices: billing_invoice[];
};
export type HistoryContext = {
  scopes: InvoiceGatewayScope[];
  fiscal: Pick<InvoiceConfig, "companyId" | "mode"> | null;
  now: Date;
};
