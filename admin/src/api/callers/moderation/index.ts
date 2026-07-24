import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminModerationKeys } from "@/api/cache/keys";
import {
  type AdminModerationEventsQuery,
  type AdminModerationOperationalAlertsQuery,
  type AdminModerationResolveInput,
  getAdminModerationEvent,
  getAdminModerationEvents,
  getAdminModerationOperationalAlerts,
  getAdminModerationSummary,
  resolveAdminModerationEvent,
  reviewAdminModerationEvent,
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
