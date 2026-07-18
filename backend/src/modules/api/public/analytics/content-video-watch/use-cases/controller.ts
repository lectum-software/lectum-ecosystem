import type { Request } from "express";
import { store as storeService } from "./services";

export const store = async (req: Request) => {
  return storeService(req);
};
