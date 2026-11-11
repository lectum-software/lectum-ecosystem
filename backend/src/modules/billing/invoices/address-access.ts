import prisma from "@/infra/database/prisma";
import { ownedStripePaymentHistory } from "@/modules/billing/stripe/payment-history";
import { subscriptionGatewayName } from "@/modules/billing/subscription-provider";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import { getInvoiceConfig } from "./config";
import { invoiceGatewayScopes } from "./gateway-scope";

/** Address maintenance is not entitlement, payment eligibility or permission to alter a fiscal snapshot. */
export async function billingAddressAccess(userId: string) {
  const denied = { editable: false, maintenanceOnly: false };
  const profile = await prisma.psychologist_profile.findFirst({
    where: { user_id: userId, deleted: false, user: { deleted: false } },
    select: { id: true },
  });
  if (!profile) return denied;
  const active = await prisma.professional_subscription.findFirst({
    where: {
      ...activeProfessionalEntitlementWhere(),
      psychologist_id: profile.id,
      source: { in: ["mercadopago", "stripe"] },
      gateway: { in: ["mercadopago", "stripe"] },
      gateway_subscription_id: { not: null },
    },
    select: { id: true },
  });
  if (active) return { editable: true, maintenanceOnly: false };
  const subscriptions = await prisma.professional_subscription.findMany({
    where: {
      psychologist_id: profile.id,
      deleted: false,
      plan: { slug: "profissional" },
    },
  });
  // Ledger history checks owner, exact contract, mode/account and immutable receipt hash.
  // Refunded historical payments still permit address maintenance, not a new fiscal issuance.
  if ((await ownedStripePaymentHistory(profile.id, subscriptions)).length)
    return { editable: true, maintenanceOnly: true };
  let config: ReturnType<typeof getInvoiceConfig>;
  try {
    config = getInvoiceConfig();
  } catch {
    return denied;
  }
  if (!config) return denied;
  const scopes = invoiceGatewayScopes(config.mode);
  const ownedInvoice = await prisma.billing_invoice.findFirst({
    where: {
      user_id: userId,
      company_id: config.companyId,
      mode: config.mode,
      amount_cents: { gt: 0 },
      currency: "BRL",
      paid_at: { lte: new Date() },
      OR: scopes.map((scope) => ({
        gateway: scope.gateway,
        account_id: scope.accountId,
        subscription_id: {
          in: subscriptions
            .filter(
              (item) =>
                subscriptionGatewayName(item) === scope.gateway &&
                (scope.gateway === "mercadopago" ||
                  (item.gateway_account_id === scope.accountId &&
                    item.gateway_mode === scope.mode)),
            )
            .map((item) => item.id),
        },
      })),
    },
    select: { id: true },
  });
  return ownedInvoice ? { editable: true, maintenanceOnly: true } : denied;
}
