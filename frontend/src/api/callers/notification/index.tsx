"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type { notification } from "@/api/generator/types";
import * as api from "@/api/req/notification";
import type { IUseCallerProps, Pagination } from "@/api/types";

const UNREAD_NOTIFICATION_STATUS_FILTERS = { limit: 1, search: "unread" };

export const useNotification = ({
  callbacks,
  filters,
  enabledIndex,
}: IUseCallerProps<notification> = {}) => {
  const indexKey = keys.notification.index(filters);
  const queryClient = useQueryClient();

  const index = useInfiniteQuery<Pagination<notification>>({
    queryKey: indexKey,
    queryFn: ({ pageParam }) => api.index({ ...filters, page: pageParam as number }),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!enabledIndex,
  });

  const update = useMutation({
    mutationFn: (data: { id: string; read: boolean }) => api.update(data.id, { read: data.read }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.notification.root() });
      callbacks?.update?.onSuccess?.(data);
    },
    onError: callbacks?.update?.onError,
  });

  const clean = useMutation({
    mutationFn: () => api.clean(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.notification.root() });
    },
  });

  return { index, update, clean };
};

export const useUnreadNotificationStatus = (enabled = true) => {
  const query = useQuery<Pagination<notification>>({
    queryKey: keys.notification.unreadStatus(),
    queryFn: () => api.index(UNREAD_NOTIFICATION_STATUS_FILTERS),
    enabled,
    staleTime: 30_000,
  });

  return {
    hasUnread: (query.data?.count ?? 0) > 0,
    query,
    unreadCount: query.data?.count ?? 0,
  };
};

export const useNotificationPreferences = () => {
  const queryClient = useQueryClient();
  const preferencesKey = keys.notification.preferences();

  const query = useQuery({
    queryKey: preferencesKey,
    queryFn: () => api.preferences(),
  });

  const update = useMutation({
    mutationFn: (prefs: api.NotificationPrefs) => api.updatePreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preferencesKey });
    },
  });

  return { query, update };
};
