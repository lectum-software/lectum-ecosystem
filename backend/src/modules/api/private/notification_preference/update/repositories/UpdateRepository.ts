//Client

//Types
import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
//Objects
import type { notification_preference } from "@/interfaces/objects";
//Interfaces
import type { IUpdateRepository } from "./interfaces/IUpdateRepository";

export class UpdateRepository implements IUpdateRepository {
  async upsert(userId: string, prefs: unknown): Promise<notification_preference> {
    const value = (prefs ?? {}) as Prisma.InputJsonValue;

    return prisma.notification_preference.upsert({
      where: { user_id: userId },
      update: { prefs: value },
      create: { user_id: userId, prefs: value },
    });
  }
}
