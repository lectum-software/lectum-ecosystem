import type { Request } from "express";
import type { user } from "@/interfaces/objects";

export interface IResetDTO {
  b: {
    current_password: string;
    password: string;
    password_confirm: string;
  };
  auth: user;
  headers?: Request["headers"];
}
