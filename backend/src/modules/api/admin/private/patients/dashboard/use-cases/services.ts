import type { Resolve } from "@/helpers/return";
import type { IAdminPatientsDashboardDTO } from "../DTOs/IAdminPatientsDashboardDTO";
import { buildPatientsDashboard } from "./services/dashboard-builder";

export default async (data: IAdminPatientsDashboardDTO): Promise<Resolve> => {
  return buildPatientsDashboard(data.q ?? {});
};

export { buildPatientsDashboard } from "./services/dashboard-builder";
