import type { Resolve } from "@/helpers/return";
import type { IAdminTrafficSummaryDTO } from "../DTOs/IAdminTrafficSummaryDTO";
import { buildTrafficSummary } from "./services/summary-builder";

export default async (data: IAdminTrafficSummaryDTO): Promise<Resolve> => {
  return buildTrafficSummary(data.q ?? {});
};

export { buildTrafficSummary } from "./services/summary-builder";
