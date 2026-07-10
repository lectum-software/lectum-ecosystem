import { useQuery } from "@tanstack/react-query";
import { adminPsychologistsKeys } from "@/api/cache/keys";
import {
  getAdminPsychologistDetail,
  getAdminPsychologistsDashboard,
  getAdminPsychologistsList,
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
