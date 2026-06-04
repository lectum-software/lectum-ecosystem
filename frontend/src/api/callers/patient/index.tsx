"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type { patient_profile } from "@/api/generator/types";
import * as api from "@/api/req/patient";

export interface UsePatientProps {
  enableProfile?: boolean;
  callbacks?: {
    profile?: {
      onSuccess?: (data: patient_profile) => void;
      onError?: (error: unknown) => void;
    };
    completeOnboarding?: {
      onSuccess?: (data: patient_profile) => void;
      onError?: (error: unknown) => void;
    };
  };
}

export const usePatient = ({ callbacks, enableProfile = true }: UsePatientProps = {}) => {
  const queryClient = useQueryClient();
  const profileKey = keys.patient.profile();

  const profile = useQuery({
    queryKey: profileKey,
    queryFn: () => api.getPatientProfile(),
    enabled: enableProfile,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const completeOnboarding = useMutation({
    mutationFn: (body: api.CompletePatientOnboardingPayload) => api.completePatientOnboarding(body),
    onSuccess: (data) => {
      queryClient.setQueryData(profileKey, data);
      queryClient.invalidateQueries({ queryKey: profileKey });
      callbacks?.completeOnboarding?.onSuccess?.(data);
    },
    onError: callbacks?.completeOnboarding?.onError,
  });

  return {
    profile,
    completeOnboarding,
  };
};
