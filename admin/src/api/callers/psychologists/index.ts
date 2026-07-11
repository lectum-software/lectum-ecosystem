import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminPsychologistsKeys } from "@/api/cache/keys";
import {
  type AdminPsychologistActivitiesQuery,
  type AdminPsychologistGrantCourtesyInput,
  type AdminPsychologistPublicationsQuery,
  type AdminPsychologistReportsQuery,
  type AdminPsychologistReviewsQuery,
  getAdminPsychologistActivities,
  getAdminPsychologistBilling,
  getAdminPsychologistDetail,
  getAdminPsychologistPublications,
  getAdminPsychologistReports,
  getAdminPsychologistReviews,
  getAdminPsychologistStatistics,
  getAdminPsychologistsDashboard,
  getAdminPsychologistsList,
  grantAdminPsychologistCourtesy,
  type PsychologistsDashboardQuery,
  type PsychologistsListQuery,
  revokeAdminPsychologistCourtesy,
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

export const useAdminPsychologistStatistics = (id: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    enabled: Boolean(id) && (options.enabled ?? true),
    queryFn: () => getAdminPsychologistStatistics(id),
    queryKey: adminPsychologistsKeys.statistics(id),
  });

export const useAdminPsychologistPublications = (
  id: string,
  input: AdminPsychologistPublicationsQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: Boolean(id) && (options.enabled ?? true),
    queryFn: () => getAdminPsychologistPublications(id, input),
    queryKey: adminPsychologistsKeys.publications(id, input),
  });

export const useAdminPsychologistReviews = (
  id: string,
  input: AdminPsychologistReviewsQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: Boolean(id) && (options.enabled ?? true),
    queryFn: () => getAdminPsychologistReviews(id, input),
    queryKey: adminPsychologistsKeys.reviews(id, input),
  });

export const useAdminPsychologistReports = (
  id: string,
  input: AdminPsychologistReportsQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: Boolean(id) && (options.enabled ?? true),
    queryFn: () => getAdminPsychologistReports(id, input),
    queryKey: adminPsychologistsKeys.reports(id, input),
  });

export const useAdminPsychologistActivities = (
  id: string,
  input: AdminPsychologistActivitiesQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: Boolean(id) && (options.enabled ?? true),
    queryFn: () => getAdminPsychologistActivities(id, input),
    queryKey: adminPsychologistsKeys.activities(id, input),
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

export const useAdminPsychologistRevokeCourtesy = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => revokeAdminPsychologistCourtesy(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.all }),
        queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.billing(id) }),
      ]);
    },
  });
};
