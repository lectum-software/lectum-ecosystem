//Objects
import type { user } from "@/interfaces/objects";
import type { WebPushSubscriptionPayload } from "@/utils/push-subscription";

export interface IStoreDTO {
  p: Record<string, never>;
  q: Record<string, never>;
  b: {
    subscription: WebPushSubscriptionPayload;
    force?: boolean;
  };
  auth: user;
  device: string;
}
