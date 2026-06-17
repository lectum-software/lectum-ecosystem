//Objects
import type { notification_preference } from "@/interfaces/objects";
import type { NotificationUserRole } from "@/main/notification/preferences";

export interface IShowRepository {
  getOrCreate(userId: string, role: NotificationUserRole): Promise<notification_preference>;
}
