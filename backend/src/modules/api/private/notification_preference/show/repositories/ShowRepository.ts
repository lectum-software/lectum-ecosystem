//Client

//Types
import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
//Objects
import type { notification_preference } from "@/interfaces/objects";
//Interfaces
import type { IShowRepository } from "./interfaces/IShowRepository";

const DEFAULT_PREFS: Prisma.InputJsonValue = {};

export class ShowRepository implements IShowRepository {
  async getOrCreate(userId: string): Promise<notification_preference> {
    const existing = await prisma.notification_preference.findUnique({
      where: { user_id: userId },
    });

    if (existing) return existing;

    return prisma.notification_preference.create({
      data: { user_id: userId, prefs: DEFAULT_PREFS },
    });
  }
}
