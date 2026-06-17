//Objects
import type { notification_preference } from "@/interfaces/objects";
import type { NotificationUserRole } from "@/main/notification/preferences";

export interface IUpdateRepository {
  upsert(
    userId: string,
    prefs: unknown,
    role: NotificationUserRole,
  ): Promise<notification_preference>;
}
