"use client";

import { useMutation } from "@tanstack/react-query";
import * as api from "@/api/req/notification-subscription";

export const useNotificationSubscription = () => {
  const key = useMutation({
    mutationFn: () => api.key(),
  });

  const store = useMutation({
    mutationFn: (body: { subscription: unknown; force?: boolean }) => api.store(body),
  });

  return { key, store };
};
