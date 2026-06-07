"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  WhatsappVerificationConfirmPayload,
  WhatsappVerificationConfirmResponse,
  WhatsappVerificationRequestPayload,
  WhatsappVerificationRequestResponse,
} from "@/api/generator/types/whatsapp-verification";
import * as api from "@/api/req/psychologist-whatsapp-verification";

export interface UsePsychologistWhatsappVerificationProps {
  callbacks?: {
    request?: {
      onSuccess?: (data: WhatsappVerificationRequestResponse) => void;
      onError?: (error: unknown) => void;
    };
    confirm?: {
      onSuccess?: (data: WhatsappVerificationConfirmResponse) => void;
      onError?: (error: unknown) => void;
    };
  };
}

export const usePsychologistWhatsappVerification = ({
  callbacks,
}: UsePsychologistWhatsappVerificationProps = {}) => {
  const queryClient = useQueryClient();

  const request = useMutation({
    mutationFn: (body: WhatsappVerificationRequestPayload) =>
      api.requestPsychologistWhatsappVerification(body),
    onSuccess: callbacks?.request?.onSuccess,
    onError: callbacks?.request?.onError,
  });

  const confirm = useMutation({
    mutationFn: (body: WhatsappVerificationConfirmPayload) =>
      api.confirmPsychologistWhatsappVerification(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "auth_hydrate",
      });
      queryClient.invalidateQueries({ queryKey: keys.psychologistWhatsappVerification.root() });
      callbacks?.confirm?.onSuccess?.(data);
    },
    onError: callbacks?.confirm?.onError,
  });

  return {
    request,
    confirm,
  };
};
