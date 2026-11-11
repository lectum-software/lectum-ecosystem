import type { InvoiceConfig } from "@/modules/billing/invoices/config";
import {
  invoiceGatewayScopes,
  invoiceScopeMatches,
} from "@/modules/billing/invoices/gateway-scope";
import { subscriptionGatewayName } from "@/modules/billing/subscription-provider";
import type { AdminInvoiceRecord } from "../repositories/interfaces/IAdminInvoiceRepository";

/** Admin object authorization is independent of the client/owner endpoint. */
export function canReadAdminInvoice(
  record: AdminInvoiceRecord,
  userId: string,
  config: InvoiceConfig,
  env = process.env,
) {
  const { invoice, subscription } = record;
  if (
    invoice.user_id !== userId ||
    subscription.psychologist.user_id !== userId ||
    invoice.subscription_id !== subscription.id ||
    invoice.company_id !== config.companyId ||
    invoice.mode !== config.mode ||
    !invoiceScopeMatches(invoiceGatewayScopes(config.mode, env), invoice) ||
    subscriptionGatewayName(subscription) !== invoice.gateway
  )
    return false;
  if (invoice.gateway === "stripe")
    return (
      subscription.gateway_account_id === invoice.account_id &&
      subscription.gateway_mode === invoice.mode
    );
  return (
    invoice.gateway === "mercadopago" &&
    invoice.account_id === null &&
    subscription.gateway_account_id === null &&
    (subscription.gateway_mode === null || subscription.gateway_mode === invoice.mode)
  );
}
