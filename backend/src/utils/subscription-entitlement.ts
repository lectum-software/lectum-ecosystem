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
