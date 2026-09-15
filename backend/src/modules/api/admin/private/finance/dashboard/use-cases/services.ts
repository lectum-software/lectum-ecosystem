import type { Resolve } from "@/helpers/return";
import type { IAdminFinanceDashboardDTO } from "../DTOs/IAdminFinanceDashboardDTO";
import { buildAdminFinanceDashboard } from "./services/dashboard-builder";

export default async (data: IAdminFinanceDashboardDTO): Promise<Resolve> => {
  return buildAdminFinanceDashboard(data.q ?? {});
};

export { listAdminFinanceCharges, listAdminFinanceSubscriptions } from "./services/charges-lists";
export { exportAdminFinanceDashboardCsv } from "./services/csv-export";
export { buildAdminFinanceDashboard } from "./services/dashboard-builder";
export {
  extractPaymentAmountCents,
  findPayloadValue,
  isConfirmedPaymentStatus,
  isPaymentEvent,
  isRecord,
  payloadContainsAnyReference,
  resolveAdminFinancePeriod,
} from "./services/period-revenue";
