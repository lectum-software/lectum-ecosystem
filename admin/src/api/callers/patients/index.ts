import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminPatientsKeys } from "@/api/cache/keys";
import {
  type AdminPatientAccountReasonInput,
  type AdminPatientAccountStatusActionInput,
  type AdminPatientActivitiesQuery,
  type AdminPatientChangeEmailInput,
  type AdminPatientDetail,
  type AdminPatientReportsQuery,
  type AdminPatientRevokeSessionsInput,
  type AdminPatientSetTemporaryPasswordInput,
  type AdminPatientUpdatePersonalDataInput,
  changeAdminPatientAccountEmail,
  deactivateAdminPatientAccount,
  deleteAdminPatientAccount,
  getAdminPatientAccount,
  getAdminPatientActivities,
  getAdminPatientDetail,
  getAdminPatientReports,
  getAdminPatientsDashboard,
  type PatientsDashboardQuery,
  type PatientsDetailQuery,
  revokeAdminPatientAccountSessions,
  sendAdminPatientAccountEmailConfirmation,
  sendAdminPatientAccountPasswordReset,
  setAdminPatientAccountTemporaryPassword,
  startAdminPatientAccountViewAs,
  suspendAdminPatientAccount,
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
  options: {
    enabled?: boolean;
    placeholderData?:
      | AdminPatientDetail
      | ((previousData: AdminPatientDetail | undefined) => AdminPatientDetail | undefined);
  } = {},
) =>
  useQuery({
    enabled: (options.enabled ?? true) && Boolean(id),
    placeholderData: options.placeholderData,
    queryFn: () => getAdminPatientDetail(id, input),
    queryKey: adminPatientsKeys.detail(id, input),
  });

export const useAdminPatientAccount = (id: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    enabled: (options.enabled ?? true) && Boolean(id),
    queryFn: () => getAdminPatientAccount(id),
    queryKey: adminPatientsKeys.account(id),
  });

export const useAdminPatientActivities = (
  id: string,
  input: AdminPatientActivitiesQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: (options.enabled ?? true) && Boolean(id),
    queryFn: () => getAdminPatientActivities(id, input),
    queryKey: adminPatientsKeys.activities(id, input),
  });

export const useAdminPatientReports = (
  id: string,
  input: AdminPatientReportsQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: (options.enabled ?? true) && Boolean(id),
    queryFn: () => getAdminPatientReports(id, input),
    queryKey: adminPatientsKeys.reports(id, input),
  });

const invalidatePatientAccount = async (
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: adminPatientsKeys.all }),
    queryClient.invalidateQueries({ queryKey: adminPatientsKeys.account(id) }),
  ]);
};

export const useAdminPatientUpdatePersonalData = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPatientUpdatePersonalDataInput) =>
      updateAdminPatientPersonalData(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminPatientsKeys.all }),
  });
};

export const useAdminPatientChangeAccountEmail = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPatientChangeEmailInput) => changeAdminPatientAccountEmail(id, input),
    onSuccess: () => invalidatePatientAccount(queryClient, id),
  });
};

export const useAdminPatientSendEmailConfirmation = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPatientAccountReasonInput) =>
      sendAdminPatientAccountEmailConfirmation(id, input),
    onSuccess: () => invalidatePatientAccount(queryClient, id),
  });
};

export const useAdminPatientSendPasswordReset = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPatientAccountReasonInput) =>
      sendAdminPatientAccountPasswordReset(id, input),
    onSuccess: () => invalidatePatientAccount(queryClient, id),
  });
};

export const useAdminPatientSetTemporaryPassword = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPatientSetTemporaryPasswordInput) =>
      setAdminPatientAccountTemporaryPassword(id, input),
    onSuccess: () => invalidatePatientAccount(queryClient, id),
  });
};

export const useAdminPatientRevokeSessions = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPatientRevokeSessionsInput) =>
      revokeAdminPatientAccountSessions(id, input),
    onSuccess: () => invalidatePatientAccount(queryClient, id),
  });
};

export const useAdminPatientSuspendAccount = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPatientAccountStatusActionInput) =>
      suspendAdminPatientAccount(id, input),
    onSuccess: () => invalidatePatientAccount(queryClient, id),
  });
};

export const useAdminPatientDeactivateAccount = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPatientAccountStatusActionInput) =>
      deactivateAdminPatientAccount(id, input),
    onSuccess: () => invalidatePatientAccount(queryClient, id),
  });
};

export const useAdminPatientDeleteAccount = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPatientAccountStatusActionInput) =>
      deleteAdminPatientAccount(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminPatientsKeys.all });
    },
  });
};

export const useAdminPatientStartViewAs = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPatientAccountReasonInput) =>
      startAdminPatientAccountViewAs(id, input),
    onSuccess: () => invalidatePatientAccount(queryClient, id),
  });
};
