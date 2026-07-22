import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminNotificationsKeys } from "@/api/cache/keys";
import {
  type AdminNotificationCampaignPayload,
  type AdminNotificationCampaignsQuery,
  type AdminNotificationLogsQuery,
  type AdminNotificationsRangeQuery,
  cancelAdminNotificationCampaign,
  createAdminNotificationCampaign,
  getAdminNotificationAutomaticLogs,
  getAdminNotificationCampaigns,
  getAdminNotificationEmailStatus,
  getAdminNotificationMetrics,
  getAdminNotificationPushStatus,
  scheduleAdminNotificationCampaign,
  sendAdminNotificationCampaign,
  updateAdminNotificationCampaign,
} from "@/api/req/notifications";

export const useAdminNotificationMetrics = (
  input: AdminNotificationsRangeQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => getAdminNotificationMetrics(input),
    queryKey: adminNotificationsKeys.metrics(input),
  });

export const useAdminNotificationCampaigns = (
  input: AdminNotificationCampaignsQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => getAdminNotificationCampaigns(input),
    queryKey: adminNotificationsKeys.campaigns(input),
  });

export const useAdminNotificationAutomaticLogs = (
  input: AdminNotificationLogsQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => getAdminNotificationAutomaticLogs(input),
    queryKey: adminNotificationsKeys.automaticLogs(input),
  });

export const useAdminNotificationPushStatus = () =>
  useQuery({
    queryFn: getAdminNotificationPushStatus,
    queryKey: adminNotificationsKeys.pushStatus(),
  });

export const useAdminNotificationEmailStatus = () =>
  useQuery({
    queryFn: getAdminNotificationEmailStatus,
    queryKey: adminNotificationsKeys.emailStatus(),
  });

const invalidateNotifications = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await queryClient.invalidateQueries({ queryKey: adminNotificationsKeys.all });
};

export const useAdminNotificationCreateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAdminNotificationCampaign,
    onSuccess: () => invalidateNotifications(queryClient),
  });
};

export const useAdminNotificationUpdateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminNotificationCampaignPayload }) =>
      updateAdminNotificationCampaign(id, input),
    onSuccess: () => invalidateNotifications(queryClient),
  });
};

export const useAdminNotificationSendCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendAdminNotificationCampaign,
    onSuccess: () => invalidateNotifications(queryClient),
  });
};

export const useAdminNotificationScheduleCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      scheduleAdminNotificationCampaign(id, scheduledAt),
    onSuccess: () => invalidateNotifications(queryClient),
  });
};

export const useAdminNotificationCancelCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelAdminNotificationCampaign,
    onSuccess: () => invalidateNotifications(queryClient),
  });
};
