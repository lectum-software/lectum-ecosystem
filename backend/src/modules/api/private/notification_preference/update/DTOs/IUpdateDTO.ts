//Objects
import type { user } from "@/interfaces/objects";

export interface IUpdateDTO {
  b: {
    prefs: unknown;
  };
  auth: user;
}
