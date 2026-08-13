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
    status: "inativa",
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

export const professionalRegistryApprovalWhere = (): Prisma.psychologist_profileWhereInput => ({
  OR: [
    {
      crp_status: "aprovado",
    },
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

export const verifiedProfessionalProfileWhere = (): Prisma.psychologist_profileWhereInput => ({
  subscriptions: {
    some: activeProfessionalEntitlementWhere(),
  },
  ...professionalRegistryApprovalWhere(),
});

export type ProfessionalVerificationProfile = {
  cfp_verified_at?: Date | string | null;
  crp_status?: string | null;
  subscriptions?: Array<{
    id?: string | null;
    source?: string | null;
  }> | null;
};

export const hasProfessionalRegistryApproval = (
  profile?: ProfessionalVerificationProfile | null,
) => {
  const subscriptions = profile?.subscriptions ?? [];
  const hasCrpStatusApproval = profile?.crp_status === "aprovado";
  const hasAutomaticEvidence = Boolean(profile?.cfp_verified_at);
  const hasAdministrativeCourtesy = subscriptions.some(
    (subscription) => subscription.source === "admin_grant",
  );

  return hasCrpStatusApproval || hasAutomaticEvidence || hasAdministrativeCourtesy;
};

export const isVerifiedProfessionalEntitlement = (
  profile?: ProfessionalVerificationProfile | null,
) => {
  const subscriptions = profile?.subscriptions ?? [];
  const hasProfessionalEntitlement = subscriptions.length > 0;

  return hasProfessionalEntitlement && hasProfessionalRegistryApproval(profile);
};
