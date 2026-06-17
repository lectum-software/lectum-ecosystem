//Client

//Types
import prisma from "@/infra/database/prisma";
//Objects
import type { notification_preference } from "@/interfaces/objects";
import {
  type NotificationUserRole,
  normalizeNotificationPrefs,
  normalizeNotificationPrefsForJson,
} from "@/main/notification/preferences";
//Interfaces
import type { IShowRepository } from "./interfaces/IShowRepository";

export class ShowRepository implements IShowRepository {
  async getOrCreate(userId: string, role: NotificationUserRole): Promise<notification_preference> {
    const existing = await prisma.notification_preference.findUnique({
      where: { user_id: userId },
    });

    if (existing) {
      const normalized = normalizeNotificationPrefs(existing.prefs, role);

      if (JSON.stringify(existing.prefs) === JSON.stringify(normalized)) {
        return existing;
      }

      return prisma.notification_preference.update({
        where: { user_id: userId },
        data: {
          prefs: normalizeNotificationPrefsForJson(existing.prefs, role),
        },
      });
    }

    return prisma.notification_preference.create({
      data: { user_id: userId, prefs: normalizeNotificationPrefsForJson({}, role) },
    });
  }
}
