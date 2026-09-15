import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminModerationKeys } from "@/api/cache/keys";
import {
  type AdminCommunitySuggestionBlockInput,
  type AdminCommunitySuggestionMoveInput,
  type AdminCommunitySuggestionsQuery,
  type AdminModerationEventsQuery,
  type AdminModerationOperationalAlertsQuery,
  type AdminModerationReportResolveInput,
  type AdminModerationResolveInput,
  archiveAdminCommunitySuggestion,
  createAdminCommunitySuggestionBlock,
  getAdminCommunitySuggestions,
  getAdminModerationEvent,
  getAdminModerationEvents,
  getAdminModerationOperationalAlerts,
  getAdminModerationSummary,
  moveAdminCommunitySuggestion,
  resolveAdminModerationEvent,
  resolveAdminModerationReport,
  reviewAdminModerationEvent,
  updateAdminCommunitySuggestionBlock,
} from "@/api/req/moderation";

export const useAdminModerationSummary = () =>
  useQuery({
    queryFn: getAdminModerationSummary,
    queryKey: adminModerationKeys.summary(),
    refetchInterval: 60_000,
  });

export const useAdminModerationEvents = (input: AdminModerationEventsQuery) =>
  useQuery({
    queryFn: () => getAdminModerationEvents(input),
    queryKey: adminModerationKeys.events(input),
  });

export const useAdminModerationOperationalAlerts = (input: AdminModerationOperationalAlertsQuery) =>
  useQuery({
    queryFn: () => getAdminModerationOperationalAlerts(input),
    queryKey: adminModerationKeys.operationalAlerts(input),
  });

export const useAdminCommunitySuggestions = (input: AdminCommunitySuggestionsQuery) =>
  useQuery({
    queryFn: () => getAdminCommunitySuggestions(input),
    queryKey: adminModerationKeys.communitySuggestions(input),
  });

export const useAdminModerationEvent = (id: string | null) =>
  useQuery({
    enabled: Boolean(id),
    queryFn: () => getAdminModerationEvent(id as string),
    queryKey: adminModerationKeys.detail(id || "none"),
  });

export const useAdminModerationReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reviewAdminModerationEvent(id),
    onSuccess: async (event) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminModerationKeys.all }),
        queryClient.invalidateQueries({ queryKey: adminModerationKeys.detail(event.id) }),
      ]);
    },
  });
};

export const useAdminModerationResolve = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminModerationResolveInput }) =>
      resolveAdminModerationEvent(id, input),
    onSuccess: async (event) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminModerationKeys.all }),
        queryClient.invalidateQueries({ queryKey: adminModerationKeys.detail(event.id) }),
      ]);
    },
  });
};

export const useAdminModerationResolveReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      reportId,
    }: {
      input: AdminModerationReportResolveInput;
      reportId: string;
    }) => resolveAdminModerationReport(reportId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminModerationKeys.all });
    },
  });
};

export const useAdminCommunitySuggestionBlockCreate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminCommunitySuggestionBlockInput) =>
      createAdminCommunitySuggestionBlock(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminModerationKeys.all });
    },
  });
};

export const useAdminCommunitySuggestionBlockUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      blockId,
      input,
    }: {
      blockId: string;
      input: AdminCommunitySuggestionBlockInput;
    }) => updateAdminCommunitySuggestionBlock(blockId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminModerationKeys.all });
    },
  });
};

export const useAdminCommunitySuggestionMove = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      suggestionId,
    }: {
      input: AdminCommunitySuggestionMoveInput;
      suggestionId: string;
    }) => moveAdminCommunitySuggestion(suggestionId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminModerationKeys.all });
    },
  });
};

export const useAdminCommunitySuggestionArchive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (suggestionId: string) => archiveAdminCommunitySuggestion(suggestionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminModerationKeys.all });
    },
  });
};
