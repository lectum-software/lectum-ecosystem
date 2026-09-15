import type { professional_subscription } from "@/interfaces/objects";

export interface ICurrentRepository {
  show(userId: string): Promise<professional_subscription | null>;
}
