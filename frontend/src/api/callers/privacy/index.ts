"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import { grantPrivacy, privacyStatus, revokePrivacy } from "@/api/req/privacy";
import {
  authorizedGuestTransferToken,
  clearGuestAcquisition,
  guestTransferToken,
} from "@/components/privacy/attribution-client";
import { PRIVACY_NOTICE_VERSION } from "@/components/privacy/policy";
import { store } from "@/store";

export function usePrivacyStatus(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.privacy.status(userId),
    queryFn: privacyStatus,
    enabled: Boolean(userId) && enabled,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
export function useSavePrivacy(userId: string, expectedRevision?: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (
      input:
        | boolean
        | { campaigns: boolean; authorizeTransfer: boolean; fromGuestChoice?: boolean },
    ) => {
      const campaigns = typeof input === "boolean" ? input : input.campaigns;
      const token =
        typeof input !== "boolean" && input.authorizeTransfer ? guestTransferToken() : null;
      if (typeof input !== "boolean" && input.authorizeTransfer && !token)
        throw new Error("privacy_transfer_expired");
      const fromGuest = typeof input !== "boolean" && input.fromGuestChoice === true;
      if (fromGuest && (!token || token !== authorizedGuestTransferToken()))
        throw new Error("privacy_transfer_expired");
      if (store.getState().user?.id !== userId) throw new Error("privacy_account_changed");
      if (!campaigns) return revokePrivacy();
      const current = await privacyStatus();
      if (
        store.getState().user?.id !== userId ||
        expectedRevision === undefined ||
        current.revision !== expectedRevision ||
        !current.collection_available ||
        current.document_version !== PRIVACY_NOTICE_VERSION
      )
        throw new Error("privacy_unavailable");
      if (
        fromGuest &&
        (current.decided || current.revision !== 0 || token !== authorizedGuestTransferToken())
      )
        throw new Error("privacy_transfer_expired");
      const result = await grantPrivacy({
        accepted: true,
        document_version: PRIVACY_NOTICE_VERSION,
        expected_revision: expectedRevision,
        ...(token ? { guest_token: token, authorize_transfer: true as const } : {}),
      });
      if (store.getState().user?.id !== userId) throw new Error("privacy_account_changed");
      if (token) clearGuestAcquisition();
      return result;
    },
    retry: false,
    onSuccess: async (status) => {
      await client.cancelQueries({ queryKey: keys.privacy.status(userId) });
      client.setQueryData(keys.privacy.status(userId), status);
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: keys.privacy.status(userId) });
    },
  });
}
