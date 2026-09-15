import type { Middleware } from "@reduxjs/toolkit";
import type { user } from "@/api/generator/types";
import { removeToken, setSessionMarker, setToken } from "@/hooks/cookies/token";
import { removeUser, setUser } from "@/hooks/cookies/user";
import type { UserState } from "@/store/modules/user/reducers";
import * as userTypes from "@/store/modules/user/types";
import { resetAnalyticsSession } from "@/utils/analytics-session";
import { unsubscribeCurrentPushSubscription } from "@/utils/push-subscription";

type UserAction = {
  payload?: user;
  type: string;
};

const isUserAction = (action: unknown): action is UserAction =>
  Boolean(action && typeof action === "object" && "type" in action);

export const authPersistenceMiddleware: Middleware = (storeApi) => (next) => (action) => {
  const previousState = storeApi.getState() as { user: UserState };
  const previousUserId = previousState.user?.id ?? null;
  const result = next(action);
  if (!isUserAction(action)) return result;

  if (action.type === userTypes.USER_REMOVE) {
    resetAnalyticsSession();
    void unsubscribeCurrentPushSubscription().catch(() => undefined);
    removeToken();
    removeUser();
    return result;
  }

  if (action.type !== userTypes.USER_CREATE && action.type !== userTypes.USER_UPDATE) return result;

  const state = storeApi.getState() as { user: UserState };
  const currentUser = state.user;
  const token = action.payload?.user_tokens?.[0]?.token;

  if (previousUserId && currentUser?.id && previousUserId !== currentUser.id) {
    resetAnalyticsSession();
  }

  if (token) setToken(token);
  else if (currentUser?.id) setSessionMarker();
  if (currentUser) {
    setUser({
      confirm: !currentUser.confirmed,
      plans: false,
      welcome: false,
    });
  }

  return result;
};
