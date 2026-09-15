import type { Request, Response } from "express";
import { error500 } from "@/helpers/return";
import { sendCsv } from "@/helpers/return/csv";
import service from "./services";

export const index = async (req: Request, res: Response) => {
  try {
    const resolve = await service(req as Parameters<typeof service>[0]);
    return sendCsv(res, resolve);
  } catch (err) {
    return error500(res, "admin_traffic_export", err);
  }
};
