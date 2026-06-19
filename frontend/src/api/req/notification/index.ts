import { callEndpoint } from "@/api/generator";
import type { notification } from "@/api/generator/types";
import { handleReq } from "@/api/handle";
import type { IndexFilters, Pagination } from "@/api/types";

export type NotificationPrefs = Record<
  string,
  {
    enabled?: boolean;
    in_app?: boolean;
    post_author_scope?: "patients_only" | "professionals_only" | "all" | "favorites";
    push?: boolean;
  }
>;

export type NotificationPreference = {
  id?: string;
  user_id?: string;
  prefs?: NotificationPrefs;
};

export const index = async (query: IndexFilters) => {
  const handle = callEndpoint({
    route: "/api/private/notification/index",
    query,
  });

  return handleReq<Pagination<notification>>(handle);
};

export const update = async (id: string, body: { read: boolean }) => {
  const handle = callEndpoint({
    route: "/api/private/notification/update/:id",
    method: "PUT",
    params: { id },
    body,
  });

  return handleReq<notification>(handle);
};

export const clean = async () => {
  const handle = callEndpoint({
    route: "/api/private/notification/clean",
    method: "POST",
  });

  return handleReq<{ success: boolean }>(handle);
};

export const preferences = async () => {
  const handle = callEndpoint({
    route: "/api/private/notification_preference/show",
  });

  return handleReq<NotificationPreference>(handle);
};

export const updatePreferences = async (prefs: NotificationPrefs) => {
  const handle = callEndpoint({
    route: "/api/private/notification_preference/update",
    method: "PUT",
    body: { prefs },
  });

  return handleReq<NotificationPreference>(handle);
};
