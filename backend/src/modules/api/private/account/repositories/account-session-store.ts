import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { loginInclude } from "@/query/login";
import { withInvalidatedRecovery } from "@/utils/account-credentials";

export const deleteAllAccountSessions = async (userId: string): Promise<void> => {
  await prisma.user_token.deleteMany({ where: { user_id: userId } });
};

export const deleteAccountSession = async (
  userId: string,
  deviceId: string,
  token: string,
): Promise<void> => {
  await prisma.user_token.deleteMany({
    where: { deleted: false, device_id: deviceId, token, user_id: userId },
  });
};

export const updateAccountAndClearSessions = async (
  userId: string,
  data: Prisma.userUpdateInput,
) => {
  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: withInvalidatedRecovery(data),
      include: loginInclude(),
    }),
    prisma.user_token.deleteMany({ where: { user_id: userId } }),
  ]);
  return updated;
};
