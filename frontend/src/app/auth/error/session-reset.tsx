"use client";

import { useEffect } from "react";
import { removeToken } from "@/hooks/cookies/token";
import { removeUser } from "@/hooks/cookies/user";
import { useAppDispatch } from "@/hooks/redux";
import * as userActions from "@/store/modules/user/actions";

const REDUX_PERSIST_KEY = "persist:lectum";

type AuthErrorSessionResetProps = {
  enabled: boolean;
};

export const AuthErrorSessionReset = ({ enabled }: AuthErrorSessionResetProps) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) return;

    removeToken();
    removeUser();
    window.localStorage.removeItem(REDUX_PERSIST_KEY);
    dispatch(userActions.destroy());
  }, [dispatch, enabled]);

  return null;
};
