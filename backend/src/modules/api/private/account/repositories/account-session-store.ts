import prisma from "@/infra/database/prisma";

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
