import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import service from "./services";

type ExportData = {
  csv: string;
  filename: string;
  mime: string;
};

const isExportData = (value: unknown): value is ExportData => {
  return Boolean(
    value && typeof value === "object" && "csv" in value && "filename" in value && "mime" in value,
  );
};

export const index = async (req: Request, res: Response) => {
  try {
    const resolve = await service(req as Parameters<typeof service>[0]);
    if (!resolve.success || !isExportData(resolve.data)) return send(res, resolve);

    res.setHeader("Content-Type", resolve.data.mime);
    res.setHeader("Content-Disposition", `attachment; filename="${resolve.data.filename}"`);

    return res.status(200).send(`\uFEFF${resolve.data.csv}`);
  } catch (err) {
    return error500(res, "admin_traffic_export", err);
  }
};
