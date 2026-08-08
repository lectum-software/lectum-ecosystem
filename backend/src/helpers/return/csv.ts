import type { Response } from "express";
import type { Resolve } from "./index";
import { send } from "./index";

type CsvExportData = {
  csv: string;
  filename: string;
};

const isCsvExportData = (value: unknown): value is CsvExportData =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof Reflect.get(value, "csv") === "string" &&
      typeof Reflect.get(value, "filename") === "string",
  );

const safeFilename = (value: string) => {
  const normalized = value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return normalized.toLowerCase().endsWith(".csv") ? normalized : `${normalized || "export"}.csv`;
};

export const sendCsv = (response: Response, resolve: Resolve) => {
  if (!resolve.success || !isCsvExportData(resolve.data)) return send(response, resolve);

  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFilename(resolve.data.filename)}"`,
  );

  return response.status(200).send(`\uFEFF${resolve.data.csv}`);
};
