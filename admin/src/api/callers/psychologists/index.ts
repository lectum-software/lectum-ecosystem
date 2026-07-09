import { useQuery } from "@tanstack/react-query";
import { adminPsychologistsKeys } from "@/api/cache/keys";
import {
  getAdminPsychologistsDashboard,
  type PsychologistsDashboardQuery,
} from "@/api/req/psychologists";

export const useAdminPsychologistsDashboard = (
  input: PsychologistsDashboardQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => getAdminPsychologistsDashboard(input),
    queryKey: adminPsychologistsKeys.dashboard(input),
  });
