import type { user } from "@/api/generator/types";
import { setToken } from "@/hooks/cookies/token";
import { setUser } from "@/hooks/cookies/user";

import * as types from "./types";

export type UserState = Omit<user, "user_tokens"> | null;

type UserAction = {
  type: string;
  payload?: user;
};

const initialState = null;
const sensitiveUserKeys = [
  "confirm_code",
  "password",
  "password_confirm",
  "recovery_code",
  "user_tokens",
] as const;

export default function userReducer(
  state: UserState = initialState,
  action: UserAction,
): UserState {
  switch (action.type) {
    case types.USER_CREATE: {
      return parseUser(action.payload);
    }
    case types.USER_UPDATE: {
      return parseUser({ ...state, ...action.payload });
    }
    case types.USER_REMOVE:
      return null;
    default:
      return state;
  }
}

const parseUser = (data?: user | null): UserState => {
  if (!data) return null;

  setUser({
    confirm: !data.confirmed,
    welcome: false,
    plans: false,
  });

  const token = data.user_tokens?.[0]?.token;
  if (token) setToken(token);

  const rest: Record<string, unknown> = { ...data };

  for (const key of sensitiveUserKeys) {
    delete rest[key];
  }

  return rest as UserState;
};
