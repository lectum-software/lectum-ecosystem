//Objects
import type { notification_preference } from "@/interfaces/objects";

export interface IUpdateRepository {
  upsert(userId: string, prefs: unknown): Promise<notification_preference>;
}
