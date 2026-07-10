import { useQuery } from "@tanstack/react-query";
import { adminPatientsKeys } from "@/api/cache/keys";
import {
  getAdminPatientDetail,
  getAdminPatientsDashboard,
  type PatientsDashboardQuery,
  type PatientsDetailQuery,
} from "@/api/req/patients";

export const useAdminPatientsDashboard = (
  input: PatientsDashboardQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => getAdminPatientsDashboard(input),
    queryKey: adminPatientsKeys.dashboard(input),
  });

export const useAdminPatientDetail = (
  id: string,
  input: PatientsDetailQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: (options.enabled ?? true) && Boolean(id),
    queryFn: () => getAdminPatientDetail(id, input),
    queryKey: adminPatientsKeys.detail(id, input),
  });
