"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type { user } from "@/api/generator/types";
import * as api from "@/api/req/auth";
import { useAppSelector } from "@/hooks/redux";

export interface UseAuthProps {
  enableHidrate?: boolean;
  callbacks?: {
    login?: {
      onSuccess?: (data: user) => void;
      onError?: (error: unknown) => void;
    };
    hidrate?: {
      onSuccess?: (data: user) => void;
      onError?: (error: unknown) => void;
    };
    googleMe?: {
      onSuccess?: (data: user) => void;
      onError?: (error: unknown) => void;
    };
  };
}

export const useAuth = ({ callbacks, enableHidrate = false }: UseAuthProps = {}) => {
  const user = useAppSelector((state) => state.user);
  const hydrateKey = keys.auth.hydrate(user?.id);

  const login = useMutation({
    mutationFn: (body: api.LoginPayload) => api.login(body),
    onSuccess: callbacks?.login?.onSuccess,
    onError: callbacks?.login?.onError,
  });

  const hidrate = useQuery({
    queryKey: hydrateKey,
    queryFn: () => api.hidrate(),
    enabled: enableHidrate,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const googleMe = useMutation({
    mutationFn: () => api.googleMe(),
    onSuccess: callbacks?.googleMe?.onSuccess,
    onError: callbacks?.googleMe?.onError,
  });

  return { login, hidrate, googleMe };
};
