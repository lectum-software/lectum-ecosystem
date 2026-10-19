import { activeSubscriptionPeriodWhere } from "@/utils/subscription-entitlement";

export const loginInclude = () => ({
  patient_profile: true,
  psychologist_profile: {
    include: {
      _count: { select: { subscriptions: { where: { deleted: false } } } },
      subscriptions: {
        where: activeSubscriptionPeriodWhere(),
        include: {
          plan: true,
        },
        orderBy: {
          createdAt: "desc" as const,
        },
        take: 5,
      },
    },
  },
});
