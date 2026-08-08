import type { Resolve } from "@/helpers/return";
import type { IAdminDashboardSummaryDTO } from "../DTOs/IAdminDashboardSummaryDTO";
import { buildDashboardSummary } from "./services/summary-builder";

export default async (data: IAdminDashboardSummaryDTO): Promise<Resolve> => {
  return buildDashboardSummary(data.q ?? {});
};

export { deriveReportSeverity } from "./services/reports-distribution";

export { buildDashboardSummary } from "./services/summary-builder";
