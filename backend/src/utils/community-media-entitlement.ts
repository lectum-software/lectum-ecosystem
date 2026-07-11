import prisma from "@/infra/database/prisma";
import { verifiedProfessionalProfileWhere } from "@/utils/subscription-entitlement";

export const canAttachCommunityMedia = async (userId: string): Promise<boolean> => {
  const profile = await prisma.psychologist_profile.findFirst({
    where: {
      ...verifiedProfessionalProfileWhere(),
      user_id: userId,
      deleted: false,
    },
    select: {
      id: true,
    },
  });

  return Boolean(profile);
};
