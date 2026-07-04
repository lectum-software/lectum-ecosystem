"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  CfpConfirmPayload,
  CfpConfirmResponse,
  CfpSearchPayload,
  CfpSearchResponse,
} from "@/api/generator/types/cfp";
import * as api from "@/api/req/psychologist-cfp";

export interface UsePsychologistCfpProps {
  callbacks?: {
    search?: {
      onSuccess?: (data: CfpSearchResponse) => void;
      onError?: (error: unknown) => void;
    };
    confirm?: {
      onSuccess?: (data: CfpConfirmResponse) => void;
      onError?: (error: unknown) => void;
    };
  };
}

export const usePsychologistCfp = ({ callbacks }: UsePsychologistCfpProps = {}) => {
  const queryClient = useQueryClient();

  const search = useMutation({
    mutationFn: (body: CfpSearchPayload) => api.searchPsychologistCfp(body),
    onSuccess: callbacks?.search?.onSuccess,
    onError: callbacks?.search?.onError,
  });

  const confirm = useMutation({
    mutationFn: (body: CfpConfirmPayload) => api.confirmPsychologistCfp(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "auth_hydrate",
      });
      queryClient.invalidateQueries({ queryKey: keys.psychologistCfp.root() });
      queryClient.invalidateQueries({ queryKey: keys.psychologistFreeProfile.root() });
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "directory_psychologist",
      });
      callbacks?.confirm?.onSuccess?.(data);
    },
    onError: callbacks?.confirm?.onError,
  });

  return {
    search,
    confirm,
  };
};
