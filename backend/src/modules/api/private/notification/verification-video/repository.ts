import { createHash } from "node:crypto";
import prisma from "@/infra/database/prisma";

export const VERIFICATION_VIDEO_VERSION = "verification-v1";
const TYPE = "verification_video_watched";
const receiptId = (userId: string) =>
  createHash("sha256").update(`${TYPE}:${VERIFICATION_VIDEO_VERSION}:${userId}`).digest("hex");

export const getVerificationVideoStatus = async (userId: string) => ({
  watched: Boolean(
    await prisma.user_background.findFirst({
      where: { id: receiptId(userId), user_id: userId, type: TYPE, deleted: false },
      select: { id: true },
    }),
  ),
});

export const markVerificationVideoWatched = async (userId: string) => {
  await prisma.user_background.upsert({
    where: { id: receiptId(userId) },
    create: {
      id: receiptId(userId),
      user_id: userId,
      type: TYPE,
      data: { version: VERIFICATION_VIDEO_VERSION },
    },
    update: {},
  });
  return { watched: true };
};
