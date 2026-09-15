import type { Resolve } from "@/helpers/return";
import type { IAdminCommunitiesDashboardDTO } from "../DTOs/IAdminCommunitiesDashboardDTO";
import { buildCommunitiesDashboard } from "./services/dashboard-builder";

export default async (data: IAdminCommunitiesDashboardDTO): Promise<Resolve> => {
  return buildCommunitiesDashboard(data.q ?? {});
};

export {
  buildCommunitiesDashboard,
  deriveCommunityAlertSeverity,
} from "./services/dashboard-builder";
