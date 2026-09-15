import type { user } from "@/interfaces/objects";

export interface IRecoveryDTO {
  b: {
    email: string;
  };
  auth: user;
}
