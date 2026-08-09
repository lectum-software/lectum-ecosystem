import type { Request } from "express";
import type { user } from "@/interfaces/objects";

export interface IConfirmDTO {
  p: {
    code: string;
  };
  auth: user;
  headers?: Request["headers"];
}
