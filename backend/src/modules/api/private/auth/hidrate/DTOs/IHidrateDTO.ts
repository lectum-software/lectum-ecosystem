import type { Request } from "express";
import type { user } from "@/interfaces/objects";

export type IHidrateDTO = Request & {
  auth: user;
};
