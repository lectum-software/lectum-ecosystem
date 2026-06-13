"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type { user } from "@/api/generator/types";
import * as api from "@/api/req/account";

export interface UseAccountProps {
  callbacks?: {
    createGoogleLinkIntent?: {
      onError?: (error: unknown) => void;
      onSuccess?: (data: Awaited<ReturnType<typeof api.createGoogleLinkIntent>>) => void;
    };
    deleteAccount?: {
      onError?: (error: unknown) => void;
      onSuccess?: (data: boolean) => void;
    };
    unlinkGoogle?: {
      onError?: (error: unknown) => void;
      onSuccess?: (data: user) => void;
    };
    updateEmail?: {
      onError?: (error: unknown) => void;
      onSuccess?: (data: user) => void;
    };
    updatePassword?: {
      onError?: (error: unknown) => void;
      onSuccess?: (data: user) => void;
    };
  };
  enableSecurity?: boolean;
}

export const useAccount = ({ callbacks, enableSecurity = true }: UseAccountProps = {}) => {
  const queryClient = useQueryClient();

  const invalidateAccount = () => {
    queryClient.invalidateQueries({ queryKey: keys.account.security() });
    queryClient.invalidateQueries({ queryKey: keys.auth.root() });
  };

  const security = useQuery({
    queryKey: keys.account.security(),
    queryFn: () => api.security(),
    enabled: enableSecurity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const updateEmail = useMutation({
    mutationFn: (body: api.AccountEmailPayload) => api.updateEmail(body),
    onSuccess: (data) => {
      invalidateAccount();
      callbacks?.updateEmail?.onSuccess?.(data);
    },
    onError: callbacks?.updateEmail?.onError,
  });

  const updatePassword = useMutation({
    mutationFn: (body: api.AccountPasswordPayload) => api.updatePassword(body),
    onSuccess: (data) => {
      invalidateAccount();
      callbacks?.updatePassword?.onSuccess?.(data);
    },
    onError: callbacks?.updatePassword?.onError,
  });

  const createGoogleLinkIntent = useMutation({
    mutationFn: () => api.createGoogleLinkIntent(),
    onSuccess: callbacks?.createGoogleLinkIntent?.onSuccess,
    onError: callbacks?.createGoogleLinkIntent?.onError,
  });

  const deleteAccount = useMutation({
    mutationFn: (body: api.AccountDeletePayload) => api.deleteAccount(body),
    onSuccess: callbacks?.deleteAccount?.onSuccess,
    onError: callbacks?.deleteAccount?.onError,
  });

  const unlinkGoogle = useMutation({
    mutationFn: () => api.unlinkGoogle(),
    onSuccess: (data) => {
      invalidateAccount();
      callbacks?.unlinkGoogle?.onSuccess?.(data);
    },
    onError: callbacks?.unlinkGoogle?.onError,
  });

  return {
    createGoogleLinkIntent,
    deleteAccount,
    security,
    unlinkGoogle,
    updateEmail,
    updatePassword,
  };
};
