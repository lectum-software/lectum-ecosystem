import prisma from "@/infra/database/prisma";
import {
  activeProfessionalCourtesyEntitlementWhere,
  activeProfessionalEntitlementWhere,
} from "@/utils/subscription-entitlement";

export const canAttachCommunityMedia = async (userId: string): Promise<boolean> => {
  const profile = await prisma.psychologist_profile.findFirst({
    where: {
      user_id: userId,
      deleted: false,
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
    },
    select: {
      id: true,
    },
  });

  return Boolean(profile);
};
