import { useQuery } from "@tanstack/react-query";
import { adminPatientsKeys } from "@/api/cache/keys";
import { getAdminPatientsList, type PatientsListQuery } from "@/api/req/patients/list";

export const useAdminPatientsList = (
  input: PatientsListQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => getAdminPatientsList(input),
    queryKey: adminPatientsKeys.list(input),
  });
