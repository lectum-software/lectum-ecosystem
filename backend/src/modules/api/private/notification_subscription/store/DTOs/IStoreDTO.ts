//Objects
import type { user } from "@/interfaces/objects";

export interface IStoreDTO {
  p: Record<string, never>;
  q: Record<string, never>;
  b: {
    subscription: string;
    force?: boolean;
  };
  auth: user;
  device: string;
}
