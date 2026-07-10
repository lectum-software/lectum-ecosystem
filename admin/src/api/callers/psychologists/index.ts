import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminPsychologistsKeys } from "@/api/cache/keys";
import {
  type AdminPsychologistGrantCourtesyInput,
  getAdminPsychologistBilling,
  getAdminPsychologistDetail,
  getAdminPsychologistsDashboard,
  getAdminPsychologistsList,
  grantAdminPsychologistCourtesy,
  type PsychologistsDashboardQuery,
  type PsychologistsListQuery,
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

export const useAdminPsychologistsList = (
  input: PsychologistsListQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => getAdminPsychologistsList(input),
    queryKey: adminPsychologistsKeys.list(input),
  });

export const useAdminPsychologistDetail = (id: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    enabled: Boolean(id) && (options.enabled ?? true),
    queryFn: () => getAdminPsychologistDetail(id),
    queryKey: adminPsychologistsKeys.detail(id),
  });

export const useAdminPsychologistBilling = (id: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    enabled: Boolean(id) && (options.enabled ?? true),
    queryFn: () => getAdminPsychologistBilling(id),
    queryKey: adminPsychologistsKeys.billing(id),
  });

export const useAdminPsychologistGrantCourtesy = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPsychologistGrantCourtesyInput) =>
      grantAdminPsychologistCourtesy(id, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.all }),
        queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.billing(id) }),
      ]);
    },
  });
};
