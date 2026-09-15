import type { subscription_plan } from "@/interfaces/objects";

export interface IPlansRepository {
  index(): Promise<subscription_plan[]>;
}
