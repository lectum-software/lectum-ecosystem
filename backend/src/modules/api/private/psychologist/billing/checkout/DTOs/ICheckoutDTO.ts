import type { user } from "@/interfaces/objects";

export interface ICheckoutDTO {
  auth: user;
  b: {
    card_token: string;
    return_url?: string | null;
  };
}
