import type { Prisma } from "@/external/generated/prisma/client";

export const activeSubscriptionPeriodWhere = (): Prisma.professional_subscriptionWhereInput => ({
  deleted: false,
  status: "ativa",
  OR: [{ current_period_end: null }, { current_period_end: { gt: new Date() } }],
});

export const activeProfessionalEntitlementWhere =
  (): Prisma.professional_subscriptionWhereInput => ({
    ...activeSubscriptionPeriodWhere(),
    plan: {
      active: true,
      deleted: false,
      slug: {
        not: "gratuito",
      },
    },
  });

export const activeFreeSubscriptionWhere = (): Prisma.professional_subscriptionWhereInput => ({
  ...activeSubscriptionPeriodWhere(),
  plan: {
    active: true,
    deleted: false,
    slug: "gratuito",
  },
});

export const actionableProfessionalGatewaySubscriptionWhere =
  (): Prisma.professional_subscriptionWhereInput => ({
    deleted: false,
    status: {
      in: ["inativa", "inadimplente"],
    },
    gateway_subscription_id: {
      not: null,
    },
    plan: {
      active: true,
      deleted: false,
      slug: {
        not: "gratuito",
      },
    },
  });

export const activeProfessionalCourtesyEntitlementWhere =
  (): Prisma.professional_subscriptionWhereInput => ({
    ...activeProfessionalEntitlementWhere(),
    source: "admin_grant",
  });

export const verifiedProfessionalProfileWhere = (): Prisma.psychologist_profileWhereInput => ({
  subscriptions: {
    some: activeProfessionalEntitlementWhere(),
  },
  OR: [
    {
      cfp_verified_at: {
        not: null,
      },
    },
    {
      subscriptions: {
        some: activeProfessionalCourtesyEntitlementWhere(),
      },
    },
  ],
});

export type ProfessionalVerificationProfile = {
  cfp_verified_at?: Date | string | null;
  subscriptions?: Array<{
    id?: string | null;
    source?: string | null;
  }> | null;
};

export const isVerifiedProfessionalEntitlement = (
  profile?: ProfessionalVerificationProfile | null,
) => {
  const subscriptions = profile?.subscriptions ?? [];
  const hasProfessionalEntitlement = subscriptions.length > 0;
  const hasRegistryVerification = Boolean(profile?.cfp_verified_at);
  const hasAdministrativeCourtesy = subscriptions.some(
    (subscription) => subscription.source === "admin_grant",
  );

  return hasProfessionalEntitlement && (hasRegistryVerification || hasAdministrativeCourtesy);
};
