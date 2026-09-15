import type { user } from "@/interfaces/objects";

export interface IClickDTO {
  auth: user;
  p: {
    id: string;
  };
}
