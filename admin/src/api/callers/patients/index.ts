import { useQuery } from "@tanstack/react-query";
import { adminPatientsKeys } from "@/api/cache/keys";
import { getAdminPatientsDashboard, type PatientsDashboardQuery } from "@/api/req/patients";

export const useAdminPatientsDashboard = (
  input: PatientsDashboardQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => getAdminPatientsDashboard(input),
    queryKey: adminPatientsKeys.dashboard(input),
  });
