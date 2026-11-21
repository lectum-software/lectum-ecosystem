"use client";

import { useEffect } from "react";
import { useAuth } from "@/api/callers/auth";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useAuthTokenPresence } from "@/hooks/use-auth-token-presence";
import { create } from "@/store/modules/user/actions";

export function usePrivacyIdentity() {
  const storedUser = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const hasToken = useAuthTokenPresence();
  const { hidrate } = useAuth({ enableHidrate: hasToken && !storedUser?.id });
  // Public legal pages do not populate Redux when opened directly.
  useEffect(() => {
    if (hasToken && !storedUser?.id && hidrate.data?.id && !hidrate.isError && !hidrate.isFetching)
      dispatch(create(hidrate.data));
  }, [hasToken, storedUser?.id, hidrate.data, hidrate.isError, hidrate.isFetching, dispatch]);
  const user = hasToken ? storedUser : null;
  return { user, hasToken, ready: !hasToken || Boolean(user?.id) };
}
