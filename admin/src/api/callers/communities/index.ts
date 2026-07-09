import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminCommunitiesKeys } from "@/api/cache/keys";
import {
  type AdminCommunityRuleInput,
  type AdminCommunityUpdateInput,
  type CommunitiesDashboardQuery,
  createAdminCommunityRule,
  deleteAdminCommunityRule,
  getAdminCommunitiesDashboard,
  getAdminCommunityDetail,
  updateAdminCommunity,
  updateAdminCommunityRule,
  uploadAdminCommunityAvatar,
} from "@/api/req/communities";

export const useAdminCommunitiesDashboard = (
  input: CommunitiesDashboardQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => getAdminCommunitiesDashboard(input),
    queryKey: adminCommunitiesKeys.dashboard(input),
  });

export const useAdminCommunityDetail = (id: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    enabled: (options.enabled ?? true) && Boolean(id),
    queryFn: () => getAdminCommunityDetail(id),
    queryKey: adminCommunitiesKeys.detail(id),
  });

const invalidateCommunity = async (queryClient: ReturnType<typeof useQueryClient>, id: string) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: adminCommunitiesKeys.all }),
    queryClient.invalidateQueries({ queryKey: adminCommunitiesKeys.detail(id) }),
    queryClient.invalidateQueries({ queryKey: adminCommunitiesKeys.rules(id) }),
  ]);
};

export const useAdminCommunityUpdate = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminCommunityUpdateInput) => updateAdminCommunity(id, input),
    onSuccess: () => invalidateCommunity(queryClient, id),
  });
};

export const useAdminCommunityAvatarUpload = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadAdminCommunityAvatar(id, file),
    onSuccess: () => invalidateCommunity(queryClient, id),
  });
};

export const useAdminCommunityCreateRule = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminCommunityRuleInput) => createAdminCommunityRule(id, input),
    onSuccess: () => invalidateCommunity(queryClient, id),
  });
};

export const useAdminCommunityUpdateRule = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, ruleId }: { input: AdminCommunityRuleInput; ruleId: string }) =>
      updateAdminCommunityRule(id, ruleId, input),
    onSuccess: () => invalidateCommunity(queryClient, id),
  });
};

export const useAdminCommunityDeleteRule = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: string) => deleteAdminCommunityRule(id, ruleId),
    onSuccess: () => invalidateCommunity(queryClient, id),
  });
};
