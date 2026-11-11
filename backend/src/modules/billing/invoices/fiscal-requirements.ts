import prisma from "@/infra/database/prisma";
import type { BillingPaymentHistoryItem } from "@/modules/api/private/psychologist/billing/subscription/repositories/interfaces/ISubscriptionRepository";
import { automaticRegistryIdentityWhere } from "@/utils/professional-registry-write";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import { invoiceBillingAddressSchema } from "./billing-address";
import { invoiceRequestSchema } from "./contracts";
import { getFiscalIdentity } from "./fiscal-identity";

export type FiscalRequirements = {
  address_complete: boolean;
  identity_complete: boolean;
  next_action:
    | "billing_address"
    | "registry_verification"
    | "complete_registration"
    | "support"
    | "none";
};

/** Data readiness only: never authorization, entitlement or permission to issue a document. */
export function projectFiscalRequirements(input: {
  addressComplete: boolean;
  identityComplete: boolean;
  emailComplete: boolean;
  registryVerificationAllowed: boolean;
  whatsappComplete: boolean;
}): FiscalRequirements {
  const next_action: FiscalRequirements["next_action"] = !input.addressComplete
    ? "billing_address"
    : !input.emailComplete
      ? "support"
      : input.identityComplete
        ? "none"
        : !input.registryVerificationAllowed
          ? "support"
          : input.whatsappComplete
            ? "registry_verification"
            : "complete_registration";
  return {
    address_complete: input.addressComplete,
    identity_complete: input.identityComplete,
    next_action,
  };
}

/** Call only with the owner-scoped, integrity-checked history returned by the repository. */
export async function fiscalRequirementsForHistory(
  userId: string,
  history: BillingPaymentHistoryItem[],
): Promise<FiscalRequirements | undefined> {
  if (
    !history.some(
      (item) =>
        item.gateway === "stripe" &&
        item.status === "pago" &&
        Number(item.amount_cents) > 0 &&
        !item.invoice,
    )
  )
    return undefined;
  const profile = await prisma.psychologist_profile.findFirst({
    where: { user_id: userId, deleted: false, user: { active: true, deleted: false } },
    select: {
      id: true,
      cpf: true,
      crp: true,
      cfp_verified_at: true,
      whatsapp: true,
      user: { select: { email: true } },
    },
  });
  if (!profile) return undefined;
  const [identity, address, registryEligible] = await Promise.all([
    getFiscalIdentity(profile),
    prisma.billing_address.findFirst({
      where: { user_id: userId, deleted: false },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.psychologist_profile.findFirst({
      where: {
        ...automaticRegistryIdentityWhere(profile.id),
        subscriptions: { some: activeProfessionalEntitlementWhere() },
      },
      select: { id: true },
    }),
  ]);
  const taker = invoiceRequestSchema.shape.taker.shape;
  return projectFiscalRequirements({
    addressComplete: invoiceBillingAddressSchema.safeParse(address).success,
    identityComplete:
      taker.document.safeParse(profile.cpf).success &&
      taker.name.safeParse(identity?.full_name).success,
    emailComplete: taker.email.safeParse(profile.user.email).success,
    registryVerificationAllowed: Boolean(registryEligible),
    whatsappComplete: Boolean(profile.whatsapp?.trim()),
  });
}
