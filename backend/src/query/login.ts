import { activeSubscriptionPeriodWhere } from "@/utils/subscription-entitlement";

export const loginInclude = () => ({
  patient_profile: true,
  psychologist_profile: {
    include: {
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
