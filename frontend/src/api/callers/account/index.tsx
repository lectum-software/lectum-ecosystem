"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type { AccountOnboardingTipsResponse, user } from "@/api/generator/types";
import * as api from "@/api/req/account";
import { getToken } from "@/hooks/cookies/token";
import { useAppSelector } from "@/hooks/redux";

export interface UseAccountProps {
  callbacks?: {
    createDeleteGoogleIntent?: {
      onError?: (error: unknown) => void;
      onSuccess?: (data: Awaited<ReturnType<typeof api.createDeleteGoogleIntent>>) => void;
    };
    createGoogleLinkIntent?: {
      onError?: (error: unknown) => void;
      onSuccess?: (data: Awaited<ReturnType<typeof api.createGoogleLinkIntent>>) => void;
    };
    deleteAccount?: {
      onError?: (error: unknown) => void;
      onSuccess?: (data: boolean) => void;
    };
    updateOnboardingTips?: {
      onError?: (error: unknown) => void;
      onSuccess?: (data: AccountOnboardingTipsResponse) => void;
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
  enableTips?: boolean;
}

const ANONYMOUS_ONBOARDING_TIPS: AccountOnboardingTipsResponse = {
  has_seen_community_post_tip: true,
  has_seen_discover_psychologists_tip: true,
  has_seen_psychologists_my_search_tip: true,
  has_seen_psychologist_whatsapp_tip: true,
  has_seen_psychologist_profile_video_tip: true,
  has_seen_psychologist_reply_tip: true,
  has_seen_psychologist_original_post_tip: true,
};

const resolveLocalOnboardingTips = (
  body?: api.AccountOnboardingTipsPayload,
  current?: AccountOnboardingTipsResponse,
): AccountOnboardingTipsResponse => ({
  ...ANONYMOUS_ONBOARDING_TIPS,
  ...current,
  ...body,
});

export const useAccount = ({
  callbacks,
  enableSecurity = true,
  enableTips = false,
}: UseAccountProps = {}) => {
  const queryClient = useQueryClient();
  const userId = useAppSelector((state) => state.user?.id);
  const hasAuthenticatedUser = Boolean(userId && getToken());
  const securityQueryKey = keys.account.security(userId);
  const tipsQueryKey = keys.account.tips(userId);

  const invalidateAccount = () => {
    queryClient.invalidateQueries({ queryKey: keys.account.securityRoot() });
    queryClient.invalidateQueries({ queryKey: keys.auth.root() });
  };

  const security = useQuery({
    queryKey: securityQueryKey,
    queryFn: () => api.security(),
    enabled: enableSecurity && Boolean(userId),
    refetchOnWindowFocus: false,
    retry: false,
  });

  const onboardingTips = useQuery({
    queryKey: tipsQueryKey,
    queryFn: () =>
      hasAuthenticatedUser
        ? api.onboardingTips().catch(() => ANONYMOUS_ONBOARDING_TIPS)
        : ANONYMOUS_ONBOARDING_TIPS,
    enabled: enableTips && hasAuthenticatedUser,
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

  const updateOnboardingTips = useMutation({
    mutationFn: async (body: api.AccountOnboardingTipsPayload) => {
      if (!hasAuthenticatedUser) {
        return resolveLocalOnboardingTips(body, onboardingTips.data);
      }

      return api
        .updateOnboardingTips(body)
        .catch(() => resolveLocalOnboardingTips(body, onboardingTips.data));
    },
    onSuccess: (data) => {
      queryClient.setQueryData(tipsQueryKey, data);
      callbacks?.updateOnboardingTips?.onSuccess?.(data);
    },
    onError: callbacks?.updateOnboardingTips?.onError,
  });

  const createGoogleLinkIntent = useMutation({
    mutationFn: () => api.createGoogleLinkIntent(),
    onSuccess: callbacks?.createGoogleLinkIntent?.onSuccess,
    onError: callbacks?.createGoogleLinkIntent?.onError,
  });

  const createDeleteGoogleIntent = useMutation({
    mutationFn: (body: api.AccountDeleteGoogleIntentPayload) => api.createDeleteGoogleIntent(body),
    onSuccess: callbacks?.createDeleteGoogleIntent?.onSuccess,
    onError: callbacks?.createDeleteGoogleIntent?.onError,
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
    createDeleteGoogleIntent,
    createGoogleLinkIntent,
    deleteAccount,
    onboardingTips,
    security,
    unlinkGoogle,
    updateEmail,
    updateOnboardingTips,
    updatePassword,
    userId,
  };
};
