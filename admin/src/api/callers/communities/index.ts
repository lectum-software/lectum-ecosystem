import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminCommunitiesKeys } from "@/api/cache/keys";
import {
  type AdminCommunitiesListQuery,
  type AdminCommunityActivitiesQuery,
  type AdminCommunityContentQuery,
  type AdminCommunityCreateInput,
  type AdminCommunityRankingQuery,
  type AdminCommunityRemoveContentInput,
  type AdminCommunityReportsQuery,
  type AdminCommunityResolveReportsInput,
  type AdminCommunityRuleInput,
  type AdminCommunityStatusInput,
  type AdminCommunityUpdateInput,
  type CommunitiesDashboardQuery,
  createAdminCommunity,
  createAdminCommunityRule,
  deleteAdminCommunityRule,
  getAdminCommunitiesDashboard,
  getAdminCommunitiesList,
  getAdminCommunityActivities,
  getAdminCommunityContent,
  getAdminCommunityDetail,
  getAdminCommunityRanking,
  getAdminCommunityReports,
  removeAdminCommunityContent,
  resolveAdminCommunityReports,
  updateAdminCommunity,
  updateAdminCommunityRule,
  updateAdminCommunityStatus,
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

export const useAdminCommunitiesList = (
  input: AdminCommunitiesListQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => getAdminCommunitiesList(input),
    queryKey: adminCommunitiesKeys.list(input),
  });

export const useAdminCommunityDetail = (id: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    enabled: (options.enabled ?? true) && Boolean(id),
    queryFn: () => getAdminCommunityDetail(id),
    queryKey: adminCommunitiesKeys.detail(id),
  });

export const useAdminCommunityContent = (
  id: string,
  input: AdminCommunityContentQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: (options.enabled ?? true) && Boolean(id),
    queryFn: () => getAdminCommunityContent(id, input),
    queryKey: adminCommunitiesKeys.content(id, input),
  });

export const useAdminCommunityRanking = (
  id: string,
  input: AdminCommunityRankingQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: (options.enabled ?? true) && Boolean(id),
    queryFn: () => getAdminCommunityRanking(id, input),
    queryKey: adminCommunitiesKeys.ranking(id, input),
  });

export const useAdminCommunityReports = (
  id: string,
  input: AdminCommunityReportsQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: (options.enabled ?? true) && Boolean(id),
    queryFn: () => getAdminCommunityReports(id, input),
    queryKey: adminCommunitiesKeys.reports(id, input),
  });

export const useAdminCommunityActivities = (
  id: string,
  input: AdminCommunityActivitiesQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: (options.enabled ?? true) && Boolean(id),
    queryFn: () => getAdminCommunityActivities(id, input),
    queryKey: adminCommunitiesKeys.activities(id, input),
  });

const invalidateCommunity = async (queryClient: ReturnType<typeof useQueryClient>, id: string) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: adminCommunitiesKeys.all }),
    queryClient.invalidateQueries({ queryKey: adminCommunitiesKeys.detail(id) }),
    queryClient.invalidateQueries({ queryKey: adminCommunitiesKeys.rules(id) }),
  ]);
};

export const useAdminCommunityCreate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminCommunityCreateInput) => createAdminCommunity(input),
    onSuccess: (community) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminCommunitiesKeys.all }),
        queryClient.invalidateQueries({ queryKey: adminCommunitiesKeys.detail(community.id) }),
        queryClient.invalidateQueries({ queryKey: adminCommunitiesKeys.detail(community.slug) }),
      ]),
  });
};

export const useAdminCommunityUpdate = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminCommunityUpdateInput) => updateAdminCommunity(id, input),
    onSuccess: () => invalidateCommunity(queryClient, id),
  });
};

export const useAdminCommunityStatusUpdate = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminCommunityStatusInput) => updateAdminCommunityStatus(id, input),
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

export const useAdminCommunityRemoveContent = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      targetId,
      targetType,
    }: {
      input: AdminCommunityRemoveContentInput;
      targetId: string;
      targetType: "comment" | "post";
    }) => removeAdminCommunityContent(id, targetType, targetId, input),
    onSuccess: () => invalidateCommunity(queryClient, id),
  });
};

export const useAdminCommunityResolveReports = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      targetId,
      targetType,
    }: {
      input: AdminCommunityResolveReportsInput;
      targetId: string;
      targetType: "comment" | "post";
    }) => resolveAdminCommunityReports(id, targetType, targetId, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminCommunitiesKeys.all }),
        queryClient.invalidateQueries({ queryKey: adminCommunitiesKeys.detail(id) }),
      ]),
  });
};
