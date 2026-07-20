import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminPatientsKeys } from "@/api/cache/keys";
import {
  type AdminPatientUpdatePersonalDataInput,
  getAdminPatientDetail,
  getAdminPatientsDashboard,
  type PatientsDashboardQuery,
  type PatientsDetailQuery,
  updateAdminPatientPersonalData,
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

export const useAdminPatientUpdatePersonalData = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPatientUpdatePersonalDataInput) =>
      updateAdminPatientPersonalData(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminPatientsKeys.all }),
  });
};
