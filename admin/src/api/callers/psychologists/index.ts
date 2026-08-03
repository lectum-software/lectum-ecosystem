import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminCommunitiesKeys, adminDashboardKeys, adminPsychologistsKeys } from "@/api/cache/keys";
import {
  type AdminPsychologistAccountReasonInput,
  type AdminPsychologistAccountStatusActionInput,
  type AdminPsychologistActivitiesQuery,
  type AdminPsychologistApproveRegistryVerificationInput,
  type AdminPsychologistChangeEmailInput,
  type AdminPsychologistGrantCourtesyInput,
  type AdminPsychologistPublicationsQuery,
  type AdminPsychologistRejectRegistryVerificationInput,
  type AdminPsychologistReportResolveInput,
  type AdminPsychologistReportsQuery,
  type AdminPsychologistReviewsQuery,
  type AdminPsychologistRevokeSessionsInput,
  type AdminPsychologistSetTemporaryPasswordInput,
  type AdminPsychologistStatisticsQuery,
  type AdminPsychologistUpdatePersonalDataInput,
  type AdminPsychologistUpdateProfessionalDataInput,
  type AdminPsychologistUpdateRegistryIdentityInput,
  approveAdminPsychologistRegistryVerification,
  changeAdminPsychologistAccountEmail,
  deactivateAdminPsychologistAccount,
  deleteAdminPsychologistAccount,
  getAdminPsychologistAccount,
  getAdminPsychologistActivities,
  getAdminPsychologistBilling,
  getAdminPsychologistDetail,
  getAdminPsychologistPublications,
  getAdminPsychologistRegistryVerification,
  getAdminPsychologistReports,
  getAdminPsychologistReviews,
  getAdminPsychologistStatistics,
  getAdminPsychologistsDashboard,
  getAdminPsychologistsList,
  grantAdminPsychologistCourtesy,
  type PsychologistsDashboardQuery,
  type PsychologistsListQuery,
  rejectAdminPsychologistRegistryVerification,
  resolveAdminPsychologistReport,
  revokeAdminPsychologistAccountSessions,
  revokeAdminPsychologistCourtesy,
  sendAdminPsychologistAccountEmailConfirmation,
  sendAdminPsychologistAccountPasswordReset,
  setAdminPsychologistAccountTemporaryPassword,
  startAdminPsychologistAccountViewAs,
  suspendAdminPsychologistAccount,
  updateAdminPsychologistPersonalData,
  updateAdminPsychologistProfessionalData,
  updateAdminPsychologistRegistryIdentity,
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

export const useAdminPsychologistAccount = (id: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    enabled: Boolean(id) && (options.enabled ?? true),
    queryFn: () => getAdminPsychologistAccount(id),
    queryKey: adminPsychologistsKeys.account(id),
  });

export const useAdminPsychologistBilling = (id: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    enabled: Boolean(id) && (options.enabled ?? true),
    queryFn: () => getAdminPsychologistBilling(id),
    queryKey: adminPsychologistsKeys.billing(id),
  });

export const useAdminPsychologistRegistryVerification = (
  id: string,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: Boolean(id) && (options.enabled ?? true),
    queryFn: () => getAdminPsychologistRegistryVerification(id),
    queryKey: adminPsychologistsKeys.registryVerification(id),
  });

export const useAdminPsychologistStatistics = (
  id: string,
  input: AdminPsychologistStatisticsQuery = {},
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: Boolean(id) && (options.enabled ?? true),
    placeholderData: (previousData) => previousData,
    queryFn: () => getAdminPsychologistStatistics(id, input),
    queryKey: adminPsychologistsKeys.statistics(id, input),
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

const invalidatePsychologistProfileEdit = async (
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.all }),
    queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.detail(id) }),
    queryClient.invalidateQueries({
      queryKey: [...adminPsychologistsKeys.all, "activities", id],
    }),
  ]);
};

const invalidatePsychologistAccount = async (
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.all }),
    queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.detail(id) }),
    queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.account(id) }),
    queryClient.invalidateQueries({
      queryKey: [...adminPsychologistsKeys.all, "activities", id],
    }),
  ]);
};

const invalidatePsychologistReports = async (
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.all }),
    queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.detail(id) }),
    queryClient.invalidateQueries({ queryKey: [...adminPsychologistsKeys.all, "reports", id] }),
    queryClient.invalidateQueries({
      queryKey: [...adminPsychologistsKeys.all, "activities", id],
    }),
    queryClient.invalidateQueries({ queryKey: adminDashboardKeys.all }),
    queryClient.invalidateQueries({ queryKey: adminCommunitiesKeys.all }),
  ]);
};

export const useAdminPsychologistUpdatePersonalData = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPsychologistUpdatePersonalDataInput) =>
      updateAdminPsychologistPersonalData(id, input),
    onSuccess: () => invalidatePsychologistProfileEdit(queryClient, id),
  });
};

export const useAdminPsychologistUpdateProfessionalData = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPsychologistUpdateProfessionalDataInput) =>
      updateAdminPsychologistProfessionalData(id, input),
    onSuccess: () => invalidatePsychologistProfileEdit(queryClient, id),
  });
};

export const useAdminPsychologistChangeAccountEmail = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPsychologistChangeEmailInput) =>
      changeAdminPsychologistAccountEmail(id, input),
    onSuccess: () => invalidatePsychologistAccount(queryClient, id),
  });
};

export const useAdminPsychologistSendEmailConfirmation = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPsychologistAccountReasonInput) =>
      sendAdminPsychologistAccountEmailConfirmation(id, input),
    onSuccess: () => invalidatePsychologistAccount(queryClient, id),
  });
};

export const useAdminPsychologistSendPasswordReset = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPsychologistAccountReasonInput) =>
      sendAdminPsychologistAccountPasswordReset(id, input),
    onSuccess: () => invalidatePsychologistAccount(queryClient, id),
  });
};

export const useAdminPsychologistSetTemporaryPassword = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPsychologistSetTemporaryPasswordInput) =>
      setAdminPsychologistAccountTemporaryPassword(id, input),
    onSuccess: () => invalidatePsychologistAccount(queryClient, id),
  });
};

export const useAdminPsychologistRevokeSessions = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPsychologistRevokeSessionsInput) =>
      revokeAdminPsychologistAccountSessions(id, input),
    onSuccess: () => invalidatePsychologistAccount(queryClient, id),
  });
};

export const useAdminPsychologistSuspendAccount = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPsychologistAccountStatusActionInput) =>
      suspendAdminPsychologistAccount(id, input),
    onSuccess: () => invalidatePsychologistAccount(queryClient, id),
  });
};

export const useAdminPsychologistDeactivateAccount = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPsychologistAccountStatusActionInput) =>
      deactivateAdminPsychologistAccount(id, input),
    onSuccess: () => invalidatePsychologistAccount(queryClient, id),
  });
};

export const useAdminPsychologistDeleteAccount = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPsychologistAccountStatusActionInput) =>
      deleteAdminPsychologistAccount(id, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.all }),
        queryClient.invalidateQueries({ queryKey: adminDashboardKeys.all }),
      ]);
    },
  });
};

export const useAdminPsychologistStartViewAs = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPsychologistAccountReasonInput) =>
      startAdminPsychologistAccountViewAs(id, input),
    onSuccess: () => invalidatePsychologistAccount(queryClient, id),
  });
};

export const useAdminPsychologistResolveReport = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      reportId,
    }: {
      input: AdminPsychologistReportResolveInput;
      reportId: string;
    }) => resolveAdminPsychologistReport(id, reportId, input),
    onSuccess: () => invalidatePsychologistReports(queryClient, id),
  });
};

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

export const useAdminPsychologistApproveRegistryVerification = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPsychologistApproveRegistryVerificationInput) =>
      approveAdminPsychologistRegistryVerification(id, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.all }),
        queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.detail(id) }),
        queryClient.invalidateQueries({
          queryKey: adminPsychologistsKeys.registryVerification(id),
        }),
      ]);
    },
  });
};

export const useAdminPsychologistRejectRegistryVerification = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPsychologistRejectRegistryVerificationInput) =>
      rejectAdminPsychologistRegistryVerification(id, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.all }),
        queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.detail(id) }),
        queryClient.invalidateQueries({
          queryKey: adminPsychologistsKeys.registryVerification(id),
        }),
      ]);
    },
  });
};

export const useAdminPsychologistUpdateRegistryIdentity = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPsychologistUpdateRegistryIdentityInput) =>
      updateAdminPsychologistRegistryIdentity(id, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.all }),
        queryClient.invalidateQueries({ queryKey: adminPsychologistsKeys.detail(id) }),
        queryClient.invalidateQueries({
          queryKey: adminPsychologistsKeys.registryVerification(id),
        }),
      ]);
    },
  });
};
