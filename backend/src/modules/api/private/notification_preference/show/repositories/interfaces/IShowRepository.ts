//Objects
import type { notification_preference } from "@/interfaces/objects";

export interface IShowRepository {
  getOrCreate(userId: string): Promise<notification_preference>;
}
