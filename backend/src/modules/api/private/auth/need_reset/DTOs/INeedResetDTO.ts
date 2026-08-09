import type { Request } from "express";
import type { user } from "@/interfaces/objects";

export interface INeedResetDTO {
  b: {
    password: string;
    password_confirm: string;
  };
  auth: user;
  headers?: Request["headers"];
}
